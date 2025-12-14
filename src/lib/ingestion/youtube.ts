import YouTube from "youtube-sr"

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: Date
  duration: number
  thumbnailUrl: string
  channelId: string
  channelTitle: string
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptResult {
  fullText: string
  segments: TranscriptSegment[]
  language: string
  source: "youtube_auto" | "whisper" | "manual"
}

export async function getChannelVideos(channelUrl: string, limit: number = 10): Promise<YouTubeVideo[]> {
  try {
    // Extract channel identifier from URL
    const channelMatch = channelUrl.match(/youtube\.com\/@([^\/]+)/) ||
                         channelUrl.match(/youtube\.com\/channel\/([^\/]+)/) ||
                         channelUrl.match(/youtube\.com\/c\/([^\/]+)/)

    if (!channelMatch) {
      throw new Error("Invalid YouTube channel URL")
    }

    const channelIdentifier = channelMatch[1]

    // Search for videos from this channel
    const searchQuery = `${channelIdentifier}`
    const results = await YouTube.search(searchQuery, { type: "video", limit: limit })

    const videos: YouTubeVideo[] = results.map((video) => ({
      id: video.id || "",
      title: video.title || "Untitled",
      description: video.description || "",
      publishedAt: video.uploadedAt ? new Date(video.uploadedAt) : new Date(),
      duration: video.duration || 0,
      thumbnailUrl: video.thumbnail?.url || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
      channelId: video.channel?.id || "",
      channelTitle: video.channel?.name || "",
    }))

    return videos
  } catch (error) {
    console.error("Failed to get channel videos:", error)
    throw new Error("Failed to fetch videos from channel")
  }
}

export async function getVideoMetadata(videoId: string): Promise<YouTubeVideo | null> {
  try {
    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`)

    if (!video) return null

    return {
      id: video.id || videoId,
      title: video.title || "Untitled",
      description: video.description || "",
      publishedAt: video.uploadedAt ? new Date(video.uploadedAt) : new Date(),
      duration: video.duration || 0,
      thumbnailUrl: video.thumbnail?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelId: video.channel?.id || "",
      channelTitle: video.channel?.name || "",
    }
  } catch (error) {
    console.error("Failed to get video metadata:", error)
    return null
  }
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
