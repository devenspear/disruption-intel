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
    method: "python-local",
  }

  console.log(`[Transcript] Starting fetch for video: ${videoId}`)

  try {
    // Use Python subprocess for transcript fetching
    // This works locally and on platforms that support Python
    const { exec } = await import("child_process")
    const { promisify } = await import("util")
    const execAsync = promisify(exec)

    // Try multiple Python paths
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
      // Python not available - provide helpful error
      debug.errorType = "PythonNotAvailable"
      debug.errorMessage = "Transcript fetching requires Python. YouTube blocks server-side requests from npm packages."

      console.log(`[Transcript] Python not available: ${lastError}`)

      return {
        success: false,
        data: null,
        error: "Automatic transcript fetching is temporarily unavailable. Please try again later or contact support.",
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
