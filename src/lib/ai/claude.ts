import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { logger } from "@/lib/logger"
import { getSystemPrompt } from "@/lib/prompts"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AnalysisResult {
  result: Record<string, unknown>
  summary: string
  keyInsights: string[]
  quotableLines: string[]
  relevanceScore: number
  tokensUsed: number
  model: string
}

// Timeout wrapper for API calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ])
}

// Parse JSON from AI response
function parseAnalysisResponse(responseText: string): Record<string, unknown> {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fall through to default
  }
  return {
    summary: responseText,
    keyInsights: [],
    quotableLines: [],
    relevanceScore: 0.5,
  }
}

// Format analysis result from parsed response
function formatAnalysisResult(
  parsedResult: Record<string, unknown>,
  tokensUsed: number,
  model: string
): AnalysisResult {
  return {
    result: parsedResult,
    summary: (parsedResult.summary as string) || "",
    keyInsights: (parsedResult.keyInsights as string[]) || [],
    quotableLines: ((parsedResult.quotableLines as Array<{ quote: string } | string>) || []).map(
      (q) => (typeof q === "string" ? q : q.quote)
    ),
    relevanceScore: (parsedResult.relevanceScore as number) || 0.5,
    tokensUsed,
    model,
  }
}

// Claude analysis with timeout
async function analyzeWithClaudeInternal(
  transcript: string,
  systemPrompt: string,
  timeoutMs: number = 90000
): Promise<AnalysisResult> {
  const startTime = Date.now()

  await logger.debug("claude", "analyze-start", `Starting Claude analysis`, {
    metadata: {
      transcriptLength: transcript.length,
      timeoutMs,
    },
  })

  const maxLength = 100000
  const truncatedTranscript =
    transcript.length > maxLength
      ? transcript.substring(0, maxLength) + "\n\n[Transcript truncated due to length...]"
      : transcript

  const messagePromise = anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\nTRANSCRIPT:\n${truncatedTranscript}`,
      },
    ],
  })

  const message = await withTimeout(messagePromise, timeoutMs, "Claude API call")

  const apiDuration = Date.now() - startTime
  await logger.info("claude", "api-response", `Claude responded in ${apiDuration}ms`, {
    duration: apiDuration,
    metadata: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  })

  const responseText = message.content[0].type === "text" ? message.content[0].text : ""
  const parsedResult = parseAnalysisResponse(responseText)
  const tokensUsed = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0)

  return formatAnalysisResult(parsedResult, tokensUsed, "claude-sonnet-4-5-20250929")
}

// OpenAI analysis with timeout
async function analyzeWithOpenAIInternal(
  transcript: string,
  systemPrompt: string,
  timeoutMs: number = 90000
): Promise<AnalysisResult> {
  const startTime = Date.now()

  await logger.debug("openai", "analyze-start", `Starting OpenAI analysis`, {
    metadata: {
      transcriptLength: transcript.length,
      timeoutMs,
    },
  })

  const maxLength = 100000
  const truncatedTranscript =
    transcript.length > maxLength
      ? transcript.substring(0, maxLength) + "\n\n[Transcript truncated due to length...]"
      : transcript

  const completionPromise = openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `TRANSCRIPT:\n${truncatedTranscript}`,
      },
    ],
  })

  const completion = await withTimeout(completionPromise, timeoutMs, "OpenAI API call")

  const apiDuration = Date.now() - startTime
  await logger.info("openai", "api-response", `OpenAI responded in ${apiDuration}ms`, {
    duration: apiDuration,
    metadata: {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    },
  })

  const responseText = completion.choices[0]?.message?.content || ""
  const parsedResult = parseAnalysisResponse(responseText)
  const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0)

  return formatAnalysisResult(parsedResult, tokensUsed, "gpt-4o")
}

// Main analysis function with fallback
export async function analyzeWithClaude(
  transcript: string,
  systemPrompt: string
): Promise<AnalysisResult> {
  const startTime = Date.now()
  const TIMEOUT_MS = 90000 // 90 seconds

  // Try Claude first
  try {
    await logger.info("ai", "analysis-attempt", "Attempting analysis with Claude", {
      metadata: { transcriptLength: transcript.length },
    })

    const result = await analyzeWithClaudeInternal(transcript, systemPrompt, TIMEOUT_MS)

    await logger.info("ai", "analysis-success", `Analysis completed with Claude in ${Date.now() - startTime}ms`, {
      duration: Date.now() - startTime,
      metadata: { model: result.model, tokensUsed: result.tokensUsed },
    })

    return result
  } catch (claudeError) {
    const errorMsg = claudeError instanceof Error ? claudeError.message : "Unknown error"
    await logger.warn("ai", "claude-failed", `Claude failed: ${errorMsg}, falling back to OpenAI`, {
      duration: Date.now() - startTime,
      metadata: { error: errorMsg },
    })

    // Fall back to OpenAI
    try {
      await logger.info("ai", "fallback-attempt", "Attempting analysis with OpenAI fallback", {
        metadata: { transcriptLength: transcript.length },
      })

      const result = await analyzeWithOpenAIInternal(transcript, systemPrompt, TIMEOUT_MS)

      await logger.info("ai", "analysis-success", `Analysis completed with OpenAI fallback in ${Date.now() - startTime}ms`, {
        duration: Date.now() - startTime,
        metadata: { model: result.model, tokensUsed: result.tokensUsed },
      })

      return result
    } catch (openaiError) {
      const openaiErrorMsg = openaiError instanceof Error ? openaiError.message : "Unknown error"
      await logger.error("ai", "all-providers-failed", `Both Claude and OpenAI failed`, {
        duration: Date.now() - startTime,
        metadata: {
          claudeError: errorMsg,
          openaiError: openaiErrorMsg,
        },
      })

      throw new Error(`Analysis failed with both providers. Claude: ${errorMsg}. OpenAI: ${openaiErrorMsg}`)
    }
  }
}

// Direct OpenAI analysis (for explicit use)
export async function analyzeWithOpenAI(
  transcript: string,
  systemPrompt: string
): Promise<AnalysisResult> {
  return analyzeWithOpenAIInternal(transcript, systemPrompt, 90000)
}

export async function generateSummary(text: string, maxWords: number = 100): Promise<string> {
  // Fetch prompt from database and replace placeholder
  const promptTemplate = await getSystemPrompt("simple_summary")
  const userPrompt = promptTemplate.replace("{{maxWords}}", String(maxWords)) + `\n\nTEXT:\n${text}`

  try {
    const message = await withTimeout(
      anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      30000,
      "Summary generation"
    )
    return message.content[0].type === "text" ? message.content[0].text : ""
  } catch {
    // Fallback to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    })
    return completion.choices[0]?.message?.content || ""
  }
}

export async function suggestTags(text: string): Promise<string[]> {
  // Fetch prompt from database
  const promptTemplate = await getSystemPrompt("tag_suggestion")
  const userPrompt = promptTemplate + `\n\nTEXT:\n${text.substring(0, 5000)}`

  try {
    const message = await withTimeout(
      anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      30000,
      "Tag suggestion"
    )

    const responseText = message.content[0].type === "text" ? message.content[0].text : "[]"
    const match = responseText.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
  } catch {
    // Fallback - return empty array
  }

  return []
}
