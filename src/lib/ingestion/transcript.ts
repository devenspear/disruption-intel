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
    method: string
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
    method: "api",
  }

  console.log(`[Transcript] Starting fetch for video: ${videoId}`)

  try {
    // Try external transcript service first (Railway/etc)
    const transcriptServiceUrl = process.env.TRANSCRIPT_SERVICE_URL

    if (transcriptServiceUrl) {
      console.log(`[Transcript] Using external service: ${transcriptServiceUrl}`)
      debug.method = "external-api"

      try {
        const response = await fetch(`${transcriptServiceUrl}/transcript?videoId=${encodeURIComponent(videoId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        const result = await response.json()

        if (result.success) {
          debug.itemCount = result.segments?.length ?? 0
          console.log(`[Transcript] Success! ${result.wordCount} words, ${debug.itemCount} segments`)

          return {
            success: true,
            data: {
              fullText: result.fullText,
              segments: result.segments,
              language: result.language || "en",
              source: "youtube_auto",
              wordCount: result.wordCount,
            },
            error: null,
            debug,
          }
        } else {
          console.log(`[Transcript] External service error: ${result.error}`)
          // Fall through to Python fallback
        }
      } catch (apiError) {
        console.log(`[Transcript] External service failed: ${apiError}`)
        // Fall through to Python fallback
      }
    }

    // Fallback: Use Python subprocess (works locally)
    debug.method = "python-local"
    const { exec } = await import("child_process")
    const { promisify } = await import("util")
    const execAsync = promisify(exec)

    const pythonPaths = [
      process.env.PYTHON_PATH,
      `${process.cwd()}/.venv/bin/python3`,
      "python3",
      "python",
    ].filter(Boolean) as string[]

    let result = null
    let lastError = null

    for (const pythonPath of pythonPaths) {
      try {
        const scriptPath = `${process.cwd()}/scripts/fetch-transcript.py`
        console.log(`[Transcript] Trying Python: ${pythonPath}`)

        const { stdout } = await execAsync(
          `"${pythonPath}" "${scriptPath}" "${videoId}"`,
          { timeout: 30000, cwd: process.cwd() }
        )

        result = JSON.parse(stdout)
        debug.method = `python:${pythonPath}`
        break
      } catch (e) {
        lastError = e
        continue
      }
    }

    if (!result) {
      debug.errorType = "TranscriptUnavailable"
      debug.errorMessage = "Transcript service not configured. Set TRANSCRIPT_SERVICE_URL environment variable."

      console.log(`[Transcript] No transcript service available: ${lastError}`)

      return {
        success: false,
        data: null,
        error: "Transcript fetching unavailable. Please configure TRANSCRIPT_SERVICE_URL.",
        debug,
      }
    }

    if (!result.success) {
      debug.errorType = result.errorType || "FetchError"
      debug.errorMessage = result.error || "Unknown error"
      console.log(`[Transcript] Python returned error: ${debug.errorMessage}`)

      return {
        success: false,
        data: null,
        error: debug.errorMessage,
        debug,
      }
    }

    debug.itemCount = result.segments?.length ?? 0
    console.log(`[Transcript] Success! ${result.wordCount} words, ${debug.itemCount} segments`)

    return {
      success: true,
      data: {
        fullText: result.fullText,
        segments: result.segments,
        language: result.language || "en",
        source: "youtube_auto",
        wordCount: result.wordCount,
      },
      error: null,
      debug,
    }
  } catch (error) {
    const err = error as Error
    debug.errorType = err.name || "UnknownError"
    debug.errorMessage = err.message || "Unknown error occurred"

    console.error(`[Transcript] ERROR for ${videoId}:`, {
      type: debug.errorType,
      message: debug.errorMessage,
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
