import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { fetchYouTubeChannelVideos } from "@/lib/ingestion/youtube"
import { fetchTranscript } from "@/lib/ingestion/transcript"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const source = await prisma.source.findUnique({
    where: { id },
  })

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 })
  }

  try {
    let videosProcessed = 0
    let transcriptsFetched = 0

    if (source.type === "YOUTUBE_CHANNEL") {
      // Fetch latest videos from YouTube channel
      const videos = await fetchYouTubeChannelVideos(source.url)

      for (const video of videos.slice(0, 5)) { // Process up to 5 videos
        // Check if content already exists
        const existing = await prisma.content.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: video.id,
            },
          },
        })

        if (!existing) {
          // Create content record
          const content = await prisma.content.create({
            data: {
              sourceId: source.id,
              externalId: video.id,
              title: video.title,
              description: video.description,
              publishedAt: new Date(video.publishedAt),
              duration: video.duration,
              thumbnailUrl: video.thumbnail,
              originalUrl: `https://www.youtube.com/watch?v=${video.id}`,
              status: "PENDING",
            },
          })

          videosProcessed++

          // Try to fetch transcript
          try {
            const transcriptData = await fetchTranscript(video.id)
            if (transcriptData) {
              await prisma.transcript.create({
                data: {
                  contentId: content.id,
                  fullText: transcriptData.fullText,
                  segments: transcriptData.segments,
                  language: transcriptData.language || "en",
                  source: "youtube",
                  wordCount: transcriptData.fullText.split(/\s+/).length,
                },
              })

              await prisma.content.update({
                where: { id: content.id },
                data: { status: "PROCESSING" },
              })

              transcriptsFetched++
            }
          } catch (transcriptError) {
            console.error(`Failed to fetch transcript for ${video.id}:`, transcriptError)
          }
        }
      }

      // Update last checked timestamp
      await prisma.source.update({
        where: { id: source.id },
        data: { lastChecked: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${videosProcessed} new videos, fetched ${transcriptsFetched} transcripts`,
      videosProcessed,
      transcriptsFetched,
    })
  } catch (error) {
    console.error("Process error:", error)
    return NextResponse.json(
      { error: "Failed to process source", details: String(error) },
      { status: 500 }
    )
  }
}
