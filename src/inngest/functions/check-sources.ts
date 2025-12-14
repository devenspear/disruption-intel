import { inngest } from "../client"
import { prisma } from "@/lib/db"
import { fetchTranscript } from "@/lib/ingestion/transcript"
import { getLatestEpisodes, type PodcastEpisode } from "@/lib/ingestion/podcast"
import { acquireTranscript } from "@/lib/ingestion/transcript-strategies"
import { logger } from "@/lib/logger"

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

    // For Podcast feeds, fetch recent episodes
    if (source.type === "PODCAST") {
      logger.info("inngest", "check-source.podcast.start", `Checking podcast source: ${source.name}`, {
        metadata: { sourceId: source.id, feedUrl: source.url },
      })

      const episodes = await step.run("fetch-podcast-episodes", async () => {
        try {
          return await getLatestEpisodes(source.url, 10)
        } catch (error) {
          logger.error("inngest", "check-source.podcast.fetch-error", `Failed to fetch episodes: ${error}`, {
            metadata: { sourceId: source.id, error: String(error) },
          })
          return []
        }
      })

      let newEpisodes = 0

      for (const episode of episodes) {
        // Check if content already exists
        const existing = await step.run(`check-existing-${episode.guid.slice(0, 20)}`, async () => {
          return prisma.content.findFirst({
            where: {
              sourceId: source.id,
              externalId: episode.guid,
            },
          })
        })

        if (!existing) {
          // Create new content entry for podcast episode
          const content = await step.run(`create-content-${episode.guid.slice(0, 20)}`, async () => {
            return prisma.content.create({
              data: {
                sourceId: source.id,
                externalId: episode.guid,
                title: episode.title,
                description: episode.description,
                publishedAt: episode.publishedAt,
                duration: episode.duration,
                thumbnailUrl: episode.imageUrl,
                originalUrl: episode.episodeUrl,
                contentType: "PODCAST_EPISODE",
                metadata: {
                  audioUrl: episode.audioUrl,
                  transcriptUrl: episode.transcriptUrl,
                },
                status: "PENDING",
              },
            })
          })

          logger.info("inngest", "check-source.podcast.new-episode", `Created content for episode: ${episode.title}`, {
            contentId: content.id,
            metadata: { episodeGuid: episode.guid },
          })

          // Trigger transcript fetch and analysis
          await step.sendEvent(`process-${episode.guid.slice(0, 20)}`, {
            name: "content/process",
            data: { contentId: content.id },
          })

          newEpisodes++
        }
      }

      // Update last checked time
      await step.run("update-source", async () => {
        return prisma.source.update({
          where: { id: sourceId },
          data: { lastChecked: new Date() },
        })
      })

      logger.info("inngest", "check-source.podcast.complete", `Podcast check complete: ${newEpisodes} new episodes`, {
        metadata: { sourceId: source.id, newEpisodes, totalFetched: episodes.length },
      })

      return { newEpisodes, totalFetched: episodes.length }
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

    // Determine content type and fetch transcript accordingly
    const isPodcast = content.contentType === "PODCAST_EPISODE" || content.source.type === "PODCAST"

    if (isPodcast) {
      // Use podcast transcript acquisition strategy chain
      logger.info("inngest", "process-content.podcast.start", `Processing podcast episode: ${content.title}`, {
        contentId: content.id,
      })

      const metadata = content.metadata as {
        audioUrl?: string
        transcriptUrl?: string
        duration?: number
      } | null

      const result = await step.run("acquire-podcast-transcript", async () => {
        return acquireTranscript({
          transcriptUrl: metadata?.transcriptUrl,
          episodeUrl: content.originalUrl,
          youtubeVideoId: null, // Could be enhanced to detect YouTube mirrors
          audioUrl: metadata?.audioUrl, // For Whisper ASR fallback
          audioDuration: metadata?.duration, // Duration in seconds
          contentId: content.id,
        })
      })

      // Log the acquisition attempts
      logger.info("inngest", "process-content.podcast.strategies", `Transcript strategies attempted`, {
        contentId: content.id,
        metadata: {
          success: result.success,
          attempts: result.attemptedStrategies,
        },
      })

      if (result.success && result.transcript) {
        // Save transcript
        await step.run("save-transcript", async () => {
          return prisma.transcript.create({
            data: {
              contentId: content.id,
              fullText: result.transcript!.fullText,
              segments: result.transcript!.segments,
              language: result.transcript!.language,
              source: result.transcript!.source,
              wordCount: result.transcript!.wordCount,
            },
          })
        })

        // Trigger AI analysis
        await step.sendEvent("trigger-analysis", {
          name: "content/analyze",
          data: { contentId: content.id },
        })

        logger.info("inngest", "process-content.podcast.success", `Transcript acquired and saved`, {
          contentId: content.id,
          metadata: {
            source: result.transcript.source,
            wordCount: result.transcript.wordCount,
          },
        })

        return {
          transcriptFetched: true,
          source: result.transcript.source,
          wordCount: result.transcript.wordCount,
          strategies: result.attemptedStrategies,
        }
      } else {
        // Keep in PENDING status (transcript unavailable but not a failure)
        await step.run("update-status-pending-transcript", async () => {
          return prisma.content.update({
            where: { id: contentId },
            data: {
              status: "PENDING",
              metadata: {
                ...metadata,
                transcriptStatus: "unavailable",
                transcriptAttempts: result.attemptedStrategies,
              },
            },
          })
        })

        logger.warn("inngest", "process-content.podcast.no-transcript", `No transcript available`, {
          contentId: content.id,
          metadata: { attempts: result.attemptedStrategies },
        })

        return {
          transcriptFetched: false,
          strategies: result.attemptedStrategies,
        }
      }
    }

    // For YouTube videos, use existing transcript fetching
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
