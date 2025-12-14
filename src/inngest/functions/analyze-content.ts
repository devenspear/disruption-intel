import { inngest } from "../client"
import { prisma } from "@/lib/db"
import { analyzeWithClaude } from "@/lib/ai/claude"
import { Prisma } from "@prisma/client"
import { inngestLogger, analysisLogger, logger } from "@/lib/logger"

export const analyzeContent = inngest.createFunction(
  { id: "analyze-content" },
  { event: "content/analyze" },
  async ({ event, step }) => {
    const { contentId, promptId } = event.data
    const functionStartTime = Date.now()

    await inngestLogger.eventReceived("content/analyze", { contentId, promptId })

    const content = await step.run("get-content-with-transcript", async () => {
      await inngestLogger.stepStart("content/analyze", "get-content-with-transcript")
      const result = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          transcript: true,
          source: true,
        },
      })
      await analysisLogger.getContent(
        contentId,
        !!result?.transcript,
        result?.transcript?.wordCount
      )
      await inngestLogger.stepComplete("content/analyze", "get-content-with-transcript")
      return result
    })

    if (!content || !content.transcript) {
      const error = !content ? "Content not found" : "Transcript not found"
      await analysisLogger.error(contentId, error, "get-content-with-transcript")
      throw new Error(error)
    }

    // Get the analysis prompt
    const prompt = await step.run("get-prompt", async () => {
      await inngestLogger.stepStart("content/analyze", "get-prompt")
      let result
      if (promptId) {
        result = await prisma.analysisPrompt.findUnique({
          where: { id: promptId },
        })
      } else {
        result = await prisma.analysisPrompt.findFirst({
          where: { isDefault: true, isActive: true },
        })
      }
      if (result) {
        await analysisLogger.getPrompt(contentId, result.id, result.name)
      } else {
        await logger.warn("analysis", "get-prompt", "No prompt found, will create default", {
          contentId,
          metadata: { promptId },
        })
      }
      await inngestLogger.stepComplete("content/analyze", "get-prompt")
      return result
    })

    let activePrompt = prompt
    if (!activePrompt) {
      // Create a default prompt if none exists
      activePrompt = await step.run("create-default-prompt", async () => {
        await inngestLogger.stepStart("content/analyze", "create-default-prompt")
        const newPrompt = await prisma.analysisPrompt.create({
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
        await analysisLogger.getPrompt(contentId, newPrompt.id, newPrompt.name)
        await inngestLogger.stepComplete("content/analyze", "create-default-prompt")
        return newPrompt
      })
    }

    const aiStartTime = Date.now()

    // Run AI analysis
    const analysisResult = await step.run("run-ai-analysis", async () => {
      await inngestLogger.stepStart("content/analyze", "run-ai-analysis")
      await analysisLogger.aiStart(contentId, content.transcript!.fullText.length)

      try {
        const result = await analyzeWithClaude(content.transcript!.fullText, activePrompt!.systemPrompt)
        const aiDuration = Date.now() - aiStartTime
        await analysisLogger.aiComplete(contentId, aiDuration, result.tokensUsed)
        await inngestLogger.stepComplete("content/analyze", "run-ai-analysis", aiDuration)
        return result
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        await analysisLogger.aiError(contentId, errorMsg)
        throw error
      }
    })

    const processingTime = Date.now() - aiStartTime

    // Save the analysis
    const savedAnalysis = await step.run("save-analysis", async () => {
      await inngestLogger.stepStart("content/analyze", "save-analysis")
      const analysis = await prisma.analysis.create({
        data: {
          contentId: content.id,
          promptId: activePrompt!.id,
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
      await analysisLogger.saved(contentId, analysis.id, analysisResult.relevanceScore)
      await inngestLogger.stepComplete("content/analyze", "save-analysis")
      return analysis
    })

    // Update content status
    await step.run("update-content-status", async () => {
      await inngestLogger.stepStart("content/analyze", "update-content-status")
      const updated = await prisma.content.update({
        where: { id: contentId },
        data: { status: "ANALYZED" },
      })
      await inngestLogger.stepComplete("content/analyze", "update-content-status")
      return updated
    })

    const totalDuration = Date.now() - functionStartTime
    await analysisLogger.complete(contentId, totalDuration)
    await inngestLogger.functionComplete("content/analyze", totalDuration, {
      analysisId: savedAnalysis.id,
      relevanceScore: analysisResult.relevanceScore,
    })

    return {
      analyzed: true,
      analysisId: savedAnalysis.id,
      relevanceScore: analysisResult.relevanceScore,
      processingTime,
      totalDuration,
    }
  }
)
