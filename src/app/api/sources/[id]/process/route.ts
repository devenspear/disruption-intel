import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { getChannelVideos } from "@/lib/ingestion/youtube"
import { fetchTranscript } from "@/lib/ingestion/transcript"
import { getLatestEpisodes } from "@/lib/ingestion/podcast"
import { getLatestArticles } from "@/lib/ingestion/rss-article"
import { fetchTweetsFromSource } from "@/lib/ingestion/twitter"
import { Prisma } from "@prisma/client"

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
    let itemsProcessed = 0
    let contentCreated = 0

    if (source.type === "YOUTUBE_CHANNEL") {
      // Fetch latest videos from YouTube channel
      const videos = await getChannelVideos(source.url, 5)

      for (const video of videos) {
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
              publishedAt: video.publishedAt,
              duration: video.duration,
              thumbnailUrl: video.thumbnailUrl,
              originalUrl: `https://www.youtube.com/watch?v=${video.id}`,
              status: "PENDING",
            },
          })

          itemsProcessed++

          // Try to fetch transcript
          try {
            const transcriptData = await fetchTranscript(video.id)
            if (transcriptData) {
              await prisma.transcript.create({
                data: {
                  contentId: content.id,
                  fullText: transcriptData.fullText,
                  segments: transcriptData.segments as unknown as Prisma.InputJsonValue,
                  language: transcriptData.language || "en",
                  source: "youtube",
                  wordCount: transcriptData.fullText.split(/\s+/).length,
                },
              })

              await prisma.content.update({
                where: { id: content.id },
                data: { status: "PROCESSING" },
              })

              contentCreated++
            }
          } catch (transcriptError) {
            console.error(`Failed to fetch transcript for ${video.id}:`, transcriptError)
          }
        }
      }
    } else if (source.type === "TWITTER") {
      // Fetch tweets from Twitter/X
      const tweets = await fetchTweetsFromSource(source.url, 20)

      for (const tweet of tweets) {
        // Check if content already exists
        const existing = await prisma.content.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: tweet.id,
            },
          },
        })

        if (!existing) {
          // Create content record for tweet
          const content = await prisma.content.create({
            data: {
              sourceId: source.id,
              externalId: tweet.id,
              title: `Tweet by @${tweet.author.userName}`,
              description: tweet.text.slice(0, 500),
              publishedAt: tweet.createdAt,
              originalUrl: tweet.url,
              status: "PENDING",
              metadata: {
                author: tweet.author,
                metrics: tweet.metrics,
                isRetweet: tweet.isRetweet,
                isReply: tweet.isReply,
              } as unknown as Prisma.InputJsonValue,
            },
          })

          itemsProcessed++

          // For tweets, the text itself is the transcript
          if (tweet.text.length > 50) {
            await prisma.transcript.create({
              data: {
                contentId: content.id,
                fullText: tweet.text,
                segments: [] as unknown as Prisma.InputJsonValue,
                language: "en",
                source: "twitter",
                wordCount: tweet.text.split(/\s+/).length,
              },
            })

            await prisma.content.update({
              where: { id: content.id },
              data: { status: "PROCESSING" },
            })

            contentCreated++
          }
        }
      }
    } else if (source.type === "PODCAST") {
      // Fetch podcast episodes
      const episodes = await getLatestEpisodes(source.url, 5)

      for (const episode of episodes) {
        // Check if content already exists
        const existing = await prisma.content.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: episode.guid,
            },
          },
        })

        if (!existing) {
          // Create content record for episode
          await prisma.content.create({
            data: {
              sourceId: source.id,
              externalId: episode.guid,
              title: episode.title,
              description: episode.description.slice(0, 2000),
              publishedAt: episode.publishedAt,
              duration: episode.duration,
              thumbnailUrl: episode.imageUrl,
              originalUrl: episode.episodeUrl || episode.audioUrl,
              status: "PENDING",
              metadata: {
                audioUrl: episode.audioUrl,
                transcriptUrl: episode.transcriptUrl,
              } as unknown as Prisma.InputJsonValue,
            },
          })

          itemsProcessed++
          contentCreated++
        }
      }
    } else if (source.type === "RSS" || source.type === "SUBSTACK") {
      // Fetch RSS/Substack articles
      const articles = await getLatestArticles(source.url, 10)

      for (const article of articles) {
        // Check if content already exists
        const existing = await prisma.content.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: article.guid,
            },
          },
        })

        if (!existing) {
          // Create content record for article
          const content = await prisma.content.create({
            data: {
              sourceId: source.id,
              externalId: article.guid,
              title: article.title,
              description: article.description.slice(0, 2000),
              publishedAt: article.publishedAt,
              thumbnailUrl: article.imageUrl,
              originalUrl: article.articleUrl,
              status: "PENDING",
              metadata: {
                author: article.author,
                wordCount: article.wordCount,
              } as unknown as Prisma.InputJsonValue,
            },
          })

          itemsProcessed++

          // For articles, the content itself is the transcript
          if (article.content.length > 100) {
            await prisma.transcript.create({
              data: {
                contentId: content.id,
                fullText: article.content,
                segments: [] as unknown as Prisma.InputJsonValue,
                language: "en",
                source: source.type.toLowerCase(),
                wordCount: article.wordCount,
              },
            })

            await prisma.content.update({
              where: { id: content.id },
              data: { status: "PROCESSING" },
            })

            contentCreated++
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: `Processing not supported for source type: ${source.type}` },
        { status: 400 }
      )
    }

    // Update last checked timestamp
    await prisma.source.update({
      where: { id: source.id },
      data: { lastChecked: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${itemsProcessed} new items, created ${contentCreated} content records`,
      itemsProcessed,
      contentCreated,
    })
  } catch (error) {
    console.error("Process error:", error)
    return NextResponse.json(
      { error: "Failed to process source", details: String(error) },
      { status: 500 }
    )
  }
}
