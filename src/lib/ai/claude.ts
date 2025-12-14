import Anthropic from "@anthropic-ai/sdk"
import { logger } from "@/lib/logger"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AnalysisResult {
  result: Record<string, unknown>
  summary: string
  keyInsights: string[]
  quotableLines: string[]
  relevanceScore: number
  tokensUsed: number
}

export async function analyzeWithClaude(
  transcript: string,
  systemPrompt: string
): Promise<AnalysisResult> {
  const startTime = Date.now()

  await logger.debug("claude", "analyze-start", `Starting Claude analysis`, {
    metadata: {
      transcriptLength: transcript.length,
      promptLength: systemPrompt.length,
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    },
  })

  // Truncate transcript if too long (Claude has context limits)
  const maxLength = 100000 // ~25k tokens
  const truncatedTranscript =
    transcript.length > maxLength
      ? transcript.substring(0, maxLength) + "\n\n[Transcript truncated due to length...]"
      : transcript

  if (transcript.length > maxLength) {
    await logger.warn("claude", "truncated", `Transcript truncated from ${transcript.length} to ${maxLength} chars`)
  }

  try {
    await logger.debug("claude", "api-call", `Calling Anthropic API with model claude-sonnet-4-5-20250929`)

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${systemPrompt}\n\nTRANSCRIPT:\n${truncatedTranscript}`,
        },
      ],
    })

    const apiDuration = Date.now() - startTime
    await logger.info("claude", "api-response", `Received response from Claude`, {
      duration: apiDuration,
      metadata: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        stopReason: message.stop_reason,
      },
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    await logger.debug("claude", "response-text", `Response text length: ${responseText.length} chars`, {
      metadata: { responsePreview: responseText.substring(0, 200) + "..." },
    })

    // Parse the JSON response
    let parsedResult: Record<string, unknown> = {}
    try {
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0])
        await logger.debug("claude", "json-parsed", `Successfully parsed JSON response`, {
          metadata: {
            hasSummary: !!parsedResult.summary,
            insightsCount: Array.isArray(parsedResult.keyInsights) ? parsedResult.keyInsights.length : 0,
            quotesCount: Array.isArray(parsedResult.quotableLines) ? parsedResult.quotableLines.length : 0,
          },
        })
      } else {
        await logger.warn("claude", "no-json", `No JSON found in response, using raw text as summary`)
      }
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : "Unknown parse error"
      await logger.warn("claude", "json-parse-error", `Failed to parse JSON: ${errorMsg}`, {
        metadata: { error: errorMsg, responsePreview: responseText.substring(0, 500) },
      })
      // If parsing fails, create a basic structure from the text
      parsedResult = {
        summary: responseText,
        keyInsights: [],
        quotableLines: [],
        relevanceScore: 0.5,
      }
    }

    const tokensUsed = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0)

    const result = {
      result: parsedResult,
      summary: (parsedResult.summary as string) || "",
      keyInsights: (parsedResult.keyInsights as string[]) || [],
      quotableLines: ((parsedResult.quotableLines as Array<{ quote: string }>) || []).map(
        (q) => (typeof q === "string" ? q : q.quote)
      ),
      relevanceScore: (parsedResult.relevanceScore as number) || 0.5,
      tokensUsed,
    }

    const totalDuration = Date.now() - startTime
    await logger.info("claude", "analyze-complete", `Claude analysis complete`, {
      duration: totalDuration,
      metadata: {
        tokensUsed,
        summaryLength: result.summary.length,
        insightsCount: result.keyInsights.length,
        quotesCount: result.quotableLines.length,
        relevanceScore: result.relevanceScore,
      },
    })

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    const errorName = error instanceof Error ? error.name : "UnknownError"

    await logger.error("claude", "api-error", `Claude API error: ${errorMsg}`, {
      duration: Date.now() - startTime,
      metadata: {
        errorName,
        errorMessage: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      },
    })

    throw error
  }
}

export async function generateSummary(text: string, maxWords: number = 100): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Summarize the following text in ${maxWords} words or less. Focus on the key points and main takeaways.\n\nTEXT:\n${text}`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}

export async function suggestTags(text: string): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Based on the following text, suggest 3-5 relevant tags/categories. Return only the tags as a JSON array of strings.\n\nTEXT:\n${text.substring(0, 5000)}`,
      },
    ],
  })

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]"

  try {
    const match = responseText.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
  } catch {
    // Fallback
  }

  return []
}
