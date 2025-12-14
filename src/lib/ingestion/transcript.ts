import { YoutubeTranscript } from "youtube-transcript"

export interface TranscriptSegment {
  start: number
  duration: number
  text: string
}

export interface TranscriptResult {
  fullText: string
  segments: TranscriptSegment[]
  language: string
  source: "youtube_auto" | "whisper" | "manual"
  wordCount: number
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult | null> {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

    if (!transcriptItems || transcriptItems.length === 0) {
      return null
    }

    const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration / 1000,
      text: item.text,
    }))

    const fullText = segments.map((s) => s.text).join(" ")
    const wordCount = fullText.split(/\s+/).filter(Boolean).length

    return {
      fullText,
      segments,
      language: "en",
      source: "youtube_auto",
      wordCount,
    }
  } catch (error) {
    console.error("Failed to fetch transcript:", error)
    return null
  }
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function searchTranscript(
  segments: TranscriptSegment[],
  query: string
): Array<{ segment: TranscriptSegment; matchIndex: number }> {
  const results: Array<{ segment: TranscriptSegment; matchIndex: number }> = []
  const lowerQuery = query.toLowerCase()

  segments.forEach((segment, index) => {
    if (segment.text.toLowerCase().includes(lowerQuery)) {
      results.push({ segment, matchIndex: index })
    }
  })

  return results
}
