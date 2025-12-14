import { prisma } from "@/lib/db"
import { LogLevel, Prisma } from "@prisma/client"

export interface LogEntry {
  level?: LogLevel
  category: string
  action: string
  message: string
  contentId?: string
  metadata?: Record<string, unknown>
  duration?: number
}

class Logger {
  private async writeToDb(entry: LogEntry) {
    try {
      await prisma.systemLog.create({
        data: {
          level: entry.level || "INFO",
          category: entry.category,
          action: entry.action,
          message: entry.message,
          contentId: entry.contentId,
          metadata: (entry.metadata || {}) as Prisma.InputJsonValue,
          duration: entry.duration,
        },
      })
    } catch (error) {
      // Fallback to console if DB write fails
      console.error("[Logger DB Error]", error)
      console.log(`[${entry.level || "INFO"}] ${entry.category}/${entry.action}: ${entry.message}`)
    }
  }

  private formatConsole(entry: LogEntry): string {
    const timestamp = new Date().toISOString()
    const meta = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : ""
    const duration = entry.duration ? ` (${entry.duration}ms)` : ""
    return `[${timestamp}] [${entry.level || "INFO"}] ${entry.category}/${entry.action}: ${entry.message}${duration}${meta}`
  }

  async debug(category: string, action: string, message: string, opts?: Partial<LogEntry>) {
    const entry: LogEntry = { level: "DEBUG", category, action, message, ...opts }
    console.log(this.formatConsole(entry))
    await this.writeToDb(entry)
  }

  async info(category: string, action: string, message: string, opts?: Partial<LogEntry>) {
    const entry: LogEntry = { level: "INFO", category, action, message, ...opts }
    console.log(this.formatConsole(entry))
    await this.writeToDb(entry)
  }

  async warn(category: string, action: string, message: string, opts?: Partial<LogEntry>) {
    const entry: LogEntry = { level: "WARN", category, action, message, ...opts }
    console.warn(this.formatConsole(entry))
    await this.writeToDb(entry)
  }

  async error(category: string, action: string, message: string, opts?: Partial<LogEntry>) {
    const entry: LogEntry = { level: "ERROR", category, action, message, ...opts }
    console.error(this.formatConsole(entry))
    await this.writeToDb(entry)
  }

  // Helper for timing operations
  startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }
}

export const logger = new Logger()

// Convenience functions for specific categories
export const analysisLogger = {
  start: (contentId: string, promptId?: string) =>
    logger.info("analysis", "start", `Starting analysis for content`, {
      contentId,
      metadata: { promptId },
    }),

  getContent: (contentId: string, hasTranscript: boolean, wordCount?: number) =>
    logger.debug("analysis", "get-content", `Fetched content: hasTranscript=${hasTranscript}, words=${wordCount || 0}`, {
      contentId,
      metadata: { hasTranscript, wordCount },
    }),

  getPrompt: (contentId: string, promptId: string, promptName: string) =>
    logger.debug("analysis", "get-prompt", `Using prompt: ${promptName}`, {
      contentId,
      metadata: { promptId, promptName },
    }),

  aiStart: (contentId: string, transcriptLength: number) =>
    logger.info("analysis", "ai-start", `Starting Claude analysis (${transcriptLength} chars)`, {
      contentId,
      metadata: { transcriptLength },
    }),

  aiComplete: (contentId: string, duration: number, tokensUsed: number) =>
    logger.info("analysis", "ai-complete", `Claude analysis complete`, {
      contentId,
      duration,
      metadata: { tokensUsed },
    }),

  aiError: (contentId: string, error: string) =>
    logger.error("analysis", "ai-error", `Claude analysis failed: ${error}`, {
      contentId,
      metadata: { error },
    }),

  saved: (contentId: string, analysisId: string, relevanceScore?: number) =>
    logger.info("analysis", "saved", `Analysis saved`, {
      contentId,
      metadata: { analysisId, relevanceScore },
    }),

  complete: (contentId: string, duration: number) =>
    logger.info("analysis", "complete", `Analysis workflow complete`, {
      contentId,
      duration,
    }),

  error: (contentId: string, error: string, step?: string) =>
    logger.error("analysis", "error", `Analysis failed${step ? ` at ${step}` : ""}: ${error}`, {
      contentId,
      metadata: { error, step },
    }),
}

export const transcriptLogger = {
  start: (videoId: string, contentId?: string) =>
    logger.info("transcript", "start", `Fetching transcript for video: ${videoId}`, {
      contentId,
      metadata: { videoId },
    }),

  methodUsed: (videoId: string, method: string) =>
    logger.debug("transcript", "method", `Using method: ${method}`, {
      metadata: { videoId, method },
    }),

  success: (videoId: string, wordCount: number, segmentCount: number, duration: number) =>
    logger.info("transcript", "success", `Transcript fetched: ${wordCount} words, ${segmentCount} segments`, {
      duration,
      metadata: { videoId, wordCount, segmentCount },
    }),

  error: (videoId: string, error: string, errorType?: string) =>
    logger.error("transcript", "error", `Failed to fetch transcript: ${error}`, {
      metadata: { videoId, error, errorType },
    }),
}

export const inngestLogger = {
  eventReceived: (eventName: string, data: Record<string, unknown>) =>
    logger.info("inngest", "event-received", `Received event: ${eventName}`, {
      metadata: { eventName, ...data },
    }),

  stepStart: (eventName: string, stepName: string) =>
    logger.debug("inngest", "step-start", `Starting step: ${stepName}`, {
      metadata: { eventName, stepName },
    }),

  stepComplete: (eventName: string, stepName: string, duration?: number) =>
    logger.debug("inngest", "step-complete", `Completed step: ${stepName}`, {
      duration,
      metadata: { eventName, stepName },
    }),

  functionComplete: (eventName: string, duration: number, result?: Record<string, unknown>) =>
    logger.info("inngest", "function-complete", `Function complete: ${eventName}`, {
      duration,
      metadata: { eventName, result },
    }),

  functionError: (eventName: string, error: string) =>
    logger.error("inngest", "function-error", `Function failed: ${eventName} - ${error}`, {
      metadata: { eventName, error },
    }),
}

export const apiLogger = {
  request: (endpoint: string, method: string, params?: Record<string, unknown>) =>
    logger.debug("api", "request", `${method} ${endpoint}`, {
      metadata: { endpoint, method, ...params },
    }),

  response: (endpoint: string, status: number, duration?: number) =>
    logger.debug("api", "response", `Response: ${status}`, {
      duration,
      metadata: { endpoint, status },
    }),

  error: (endpoint: string, error: string, status?: number) =>
    logger.error("api", "error", `API error: ${error}`, {
      metadata: { endpoint, error, status },
    }),
}
