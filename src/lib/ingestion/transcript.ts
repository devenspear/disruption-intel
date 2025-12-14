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

export interface TranscriptFetchResult {
  success: boolean
  data: TranscriptResult | null
  error: string | null
  debug: {
    videoId: string
    timestamp: string
    itemCount: number | null
    errorType: string | null
    errorMessage: string | null
    errorStack: string | null
  }
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult | null> {
  const result = await fetchTranscriptWithDebug(videoId)
  return result.data
}

export async function fetchTranscriptWithDebug(videoId: string): Promise<TranscriptFetchResult> {
  const debug: TranscriptFetchResult["debug"] = {
    videoId,
    timestamp: new Date().toISOString(),
    itemCount: null,
    errorType: null,
    errorMessage: null,
    errorStack: null,
  }

  console.log(`[Transcript] Starting fetch for video: ${videoId}`)

  try {
    console.log(`[Transcript] Calling YoutubeTranscript.fetchTranscript...`)
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

    debug.itemCount = transcriptItems?.length ?? 0
    console.log(`[Transcript] Received ${debug.itemCount} transcript items`)

    if (!transcriptItems || transcriptItems.length === 0) {
      console.log(`[Transcript] No transcript items found for ${videoId}`)
      return {
        success: false,
        data: null,
        error: "No transcript available for this video",
        debug,
      }
    }

    console.log(`[Transcript] Processing ${transcriptItems.length} segments...`)
    const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
      start: item.offset / 1000,
      duration: item.duration / 1000,
      text: item.text,
    }))

    const fullText = segments.map((s) => s.text).join(" ")
    const wordCount = fullText.split(/\s+/).filter(Boolean).length

    console.log(`[Transcript] Success! ${wordCount} words, ${segments.length} segments`)

    return {
      success: true,
      data: {
        fullText,
        segments,
        language: "en",
        source: "youtube_auto",
        wordCount,
      },
      error: null,
      debug,
    }
  } catch (error) {
    const err = error as Error
    debug.errorType = err.name || "UnknownError"
    debug.errorMessage = err.message || "Unknown error occurred"
    debug.errorStack = err.stack || null

    console.error(`[Transcript] ERROR for ${videoId}:`, {
      type: debug.errorType,
      message: debug.errorMessage,
      stack: debug.errorStack,
    })

    return {
      success: false,
      data: null,
      error: debug.errorMessage,
      debug,
    }
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
