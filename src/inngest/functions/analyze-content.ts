import { inngest } from "../client"
import { prisma } from "@/lib/db"
import { analyzeWithClaude } from "@/lib/ai/claude"
import { Prisma } from "@prisma/client"

export const analyzeContent = inngest.createFunction(
  { id: "analyze-content" },
  { event: "content/analyze" },
  async ({ event, step }) => {
    const { contentId, promptId } = event.data

    const content = await step.run("get-content-with-transcript", async () => {
      return prisma.content.findUnique({
        where: { id: contentId },
        include: {
          transcript: true,
          source: true,
        },
      })
    })

    if (!content || !content.transcript) {
      throw new Error("Content or transcript not found")
    }

    // Get the analysis prompt
    const prompt = await step.run("get-prompt", async () => {
      if (promptId) {
        return prisma.analysisPrompt.findUnique({
          where: { id: promptId },
        })
      }
      // Get default prompt
      return prisma.analysisPrompt.findFirst({
        where: { isDefault: true, isActive: true },
      })
    })

    if (!prompt) {
      // Create a default prompt if none exists
      const defaultPrompt = await step.run("create-default-prompt", async () => {
        return prisma.analysisPrompt.create({
          data: {
            name: "Disruption Analysis",
            description: "Default analysis prompt for disruption intelligence",
            isDefault: true,
            isActive: true,
            systemPrompt: `You are an expert analyst specializing in disruptive technologies, exponential trends, and future-forward thinking. Analyze the following transcript and provide a structured analysis.

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 paragraph executive summary",
  "keyInsights": [
    "Insight 1 with specific detail",
    "Insight 2 with specific detail"
  ],
  "disruptionSignals": [
    {
      "signal": "Name of the disruption",
      "sector": "Industry/sector affected",
      "timeframe": "Near-term/Mid-term/Long-term",
      "confidence": "High/Medium/Low"
    }
  ],
  "quotableLines": [
    {
      "quote": "Exact quote from transcript",
      "context": "Why this quote matters"
    }
  ],
  "relevanceScore": 0.0-1.0,
  "categories": ["AI", "Longevity", "Space", etc.],
  "actionItems": ["Potential follow-up or research item"],
  "relatedTopics": ["Topic for cross-referencing"]
}

Focus on:
- Specific predictions with timeframes
- Named technologies, companies, or people
- Contrarian or non-obvious insights
- Quantitative claims (numbers, percentages, dates)
- Implications for business strategy`,
          },
        })
      })

      return defaultPrompt
    }

    const startTime = Date.now()

    // Run AI analysis
    const analysisResult = await step.run("run-ai-analysis", async () => {
      return analyzeWithClaude(content.transcript!.fullText, prompt!.systemPrompt)
    })

    const processingTime = Date.now() - startTime

    // Save the analysis
    await step.run("save-analysis", async () => {
      return prisma.analysis.create({
        data: {
          contentId: content.id,
          promptId: prompt!.id,
          model: "claude-3-5-sonnet-20241022",
          result: analysisResult.result as Prisma.InputJsonValue,
          summary: analysisResult.summary,
          keyInsights: analysisResult.keyInsights,
          quotableLines: analysisResult.quotableLines,
          relevanceScore: analysisResult.relevanceScore,
          tokensUsed: analysisResult.tokensUsed,
          processingTime,
        },
      })
    })

    // Update content status
    await step.run("update-content-status", async () => {
      return prisma.content.update({
        where: { id: contentId },
        data: { status: "ANALYZED" },
      })
    })

    return {
      analyzed: true,
      relevanceScore: analysisResult.relevanceScore,
      processingTime,
    }
  }
)
