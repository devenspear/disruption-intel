import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

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
    const { stdout } = await execAsync(
      `yt-dlp --flat-playlist --dump-json --playlist-end ${limit} "${channelUrl}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    )

    const videos: YouTubeVideo[] = []
    const lines = stdout.trim().split("\n")

    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        videos.push({
          id: data.id,
          title: data.title,
          description: data.description || "",
          publishedAt: new Date(data.upload_date?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") || Date.now()),
          duration: data.duration || 0,
          thumbnailUrl: data.thumbnail || `https://img.youtube.com/vi/${data.id}/maxresdefault.jpg`,
          channelId: data.channel_id || "",
          channelTitle: data.channel || "",
        })
      } catch {
        continue
      }
    }

    return videos
  } catch (error) {
    console.error("Failed to get channel videos:", error)
    throw new Error("Failed to fetch videos from channel")
  }
}

export async function getVideoTranscript(videoId: string): Promise<TranscriptResult | null> {
  try {
    // Try to get auto-generated captions first
    const { stdout } = await execAsync(
      `yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format json3 -o "%(id)s" --print-json "https://www.youtube.com/watch?v=${videoId}"`,
      { maxBuffer: 1024 * 1024 * 50 }
    )

    // Parse the subtitle file
    const subtitlePath = `${videoId}.en.json3`
    const fs = await import("fs/promises")

    try {
      const subtitleContent = await fs.readFile(subtitlePath, "utf-8")
      const subtitleData = JSON.parse(subtitleContent)

      const segments: TranscriptSegment[] = []
      let fullText = ""

      for (const event of subtitleData.events || []) {
        if (event.segs) {
          const text = event.segs.map((s: { utf8?: string }) => s.utf8 || "").join("")
          if (text.trim()) {
            segments.push({
              start: event.tStartMs / 1000,
              end: (event.tStartMs + (event.dDurationMs || 0)) / 1000,
              text: text.trim(),
            })
            fullText += text + " "
          }
        }
      }

      // Clean up subtitle file
      await fs.unlink(subtitlePath).catch(() => {})

      return {
        fullText: fullText.trim(),
        segments,
        language: "en",
        source: "youtube_auto",
      }
    } catch {
      // Subtitle file not found, try alternative method
      return await getTranscriptViaAPI(videoId)
    }
  } catch (error) {
    console.error("Failed to get video transcript:", error)
    return null
  }
}

async function getTranscriptViaAPI(videoId: string): Promise<TranscriptResult | null> {
  try {
    // Use youtube-transcript-api via a simple fetch approach
    const response = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { "Accept-Language": "en" } }
    )

    const html = await response.text()

    // Extract captions URL from the page
    const captionsMatch = html.match(/"captions":\s*({.*?"playerCaptionsTracklistRenderer".*?})/)

    if (!captionsMatch) {
      return null
    }

    // For now, return null if we can't get captions via yt-dlp
    // A more robust implementation would parse the captions data
    return null
  } catch {
    return null
  }
}

export async function getVideoMetadata(videoId: string): Promise<YouTubeVideo | null> {
  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json "https://www.youtube.com/watch?v=${videoId}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    )

    const data = JSON.parse(stdout)

    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      publishedAt: new Date(data.upload_date?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") || Date.now()),
      duration: data.duration || 0,
      thumbnailUrl: data.thumbnail || `https://img.youtube.com/vi/${data.id}/maxresdefault.jpg`,
      channelId: data.channel_id || "",
      channelTitle: data.channel || "",
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
