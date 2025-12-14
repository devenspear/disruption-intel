import Anthropic from "@anthropic-ai/sdk"

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
  // Truncate transcript if too long (Claude has context limits)
  const maxLength = 100000 // ~25k tokens
  const truncatedTranscript =
    transcript.length > maxLength
      ? transcript.substring(0, maxLength) + "\n\n[Transcript truncated due to length...]"
      : transcript

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\nTRANSCRIPT:\n${truncatedTranscript}`,
      },
    ],
  })

  const responseText = message.content[0].type === "text" ? message.content[0].text : ""

  // Parse the JSON response
  let parsedResult: Record<string, unknown> = {}
  try {
    // Find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[0])
    }
  } catch {
    // If parsing fails, create a basic structure from the text
    parsedResult = {
      summary: responseText,
      keyInsights: [],
      quotableLines: [],
      relevanceScore: 0.5,
    }
  }

  const tokensUsed = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0)

  return {
    result: parsedResult,
    summary: (parsedResult.summary as string) || "",
    keyInsights: (parsedResult.keyInsights as string[]) || [],
    quotableLines: ((parsedResult.quotableLines as Array<{ quote: string }>) || []).map(
      (q) => (typeof q === "string" ? q : q.quote)
    ),
    relevanceScore: (parsedResult.relevanceScore as number) || 0.5,
    tokensUsed,
  }
}

export async function generateSummary(text: string, maxWords: number = 100): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
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
    model: "claude-3-5-sonnet-20241022",
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
