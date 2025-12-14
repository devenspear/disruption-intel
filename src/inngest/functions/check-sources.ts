import { inngest } from "../client"
import { prisma } from "@/lib/db"
import { fetchTranscript } from "@/lib/ingestion/transcript"

// Scheduled job to check all active sources daily
export const scheduledSourceCheck = inngest.createFunction(
  { id: "scheduled-source-check" },
  { cron: "0 0 * * *" }, // Run daily at midnight
  async ({ step }) => {
    const sources = await step.run("get-active-sources", async () => {
      return prisma.source.findMany({
        where: { isActive: true },
      })
    })

    for (const source of sources) {
      await step.sendEvent("trigger-source-check", {
        name: "source/check",
        data: { sourceId: source.id },
      })
    }

    return { checked: sources.length }
  }
)

// Check a specific source for new content
export const checkSource = inngest.createFunction(
  { id: "check-source" },
  { event: "source/check" },
  async ({ event, step }) => {
    const { sourceId } = event.data

    const source = await step.run("get-source", async () => {
      return prisma.source.findUnique({
        where: { id: sourceId },
      })
    })

    if (!source) {
      throw new Error("Source not found")
    }

    // For YouTube channels, fetch recent videos
    if (source.type === "YOUTUBE_CHANNEL") {
      const videos = await step.run("fetch-youtube-videos", async () => {
        const { getChannelVideos } = await import("@/lib/ingestion/youtube")
        return getChannelVideos(source.url, 10)
      })

      for (const video of videos) {
        // Check if content already exists
        const existing = await step.run(`check-existing-${video.id}`, async () => {
          return prisma.content.findFirst({
            where: {
              sourceId: source.id,
              externalId: video.id,
            },
          })
        })

        if (!existing) {
          // Create new content entry
          const content = await step.run(`create-content-${video.id}`, async () => {
            return prisma.content.create({
              data: {
                sourceId: source.id,
                externalId: video.id,
                title: video.title,
                description: video.description,
                publishedAt: video.publishedAt,
                duration: video.duration,
                thumbnailUrl: video.thumbnailUrl,
                originalUrl: `https://www.youtube.com/watch?v=${video.id}`,
                status: "PENDING",
              },
            })
          })

          // Trigger transcript fetch and analysis
          await step.sendEvent(`analyze-${video.id}`, {
            name: "content/process",
            data: { contentId: content.id },
          })
        }
      }

      // Update last checked time
      await step.run("update-source", async () => {
        return prisma.source.update({
          where: { id: sourceId },
          data: { lastChecked: new Date() },
        })
      })

      return { newVideos: videos.length }
    }

    return { processed: false, reason: "Unsupported source type" }
  }
)

// Process content: fetch transcript and trigger analysis
export const processContent = inngest.createFunction(
  { id: "process-content" },
  { event: "content/process" },
  async ({ event, step }) => {
    const { contentId } = event.data

    const content = await step.run("get-content", async () => {
      return prisma.content.findUnique({
        where: { id: contentId },
        include: { source: true },
      })
    })

    if (!content) {
      throw new Error("Content not found")
    }

    // Update status to processing
    await step.run("update-status-processing", async () => {
      return prisma.content.update({
        where: { id: contentId },
        data: { status: "PROCESSING" },
      })
    })

    // Fetch transcript
    const transcript = await step.run("fetch-transcript", async () => {
      return fetchTranscript(content.externalId)
    })

    if (transcript) {
      // Save transcript
      await step.run("save-transcript", async () => {
        return prisma.transcript.create({
          data: {
            contentId: content.id,
            fullText: transcript.fullText,
            segments: transcript.segments,
            language: transcript.language,
            source: transcript.source,
            wordCount: transcript.wordCount,
          },
        })
      })

      // Trigger AI analysis
      await step.sendEvent("trigger-analysis", {
        name: "content/analyze",
        data: { contentId: content.id },
      })

      return { transcriptFetched: true, wordCount: transcript.wordCount }
    } else {
      // Mark as failed if no transcript
      await step.run("update-status-failed", async () => {
        return prisma.content.update({
          where: { id: contentId },
          data: { status: "FAILED" },
        })
      })

      return { transcriptFetched: false }
    }
  }
)
