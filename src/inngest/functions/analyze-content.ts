import { inngest } from "../client"
import { prisma } from "@/lib/db"
import { analyzeWithClaude } from "@/lib/ai/claude"
import { Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"

export const analyzeContent = inngest.createFunction(
  { id: "analyze-content" },
  { event: "content/analyze" },
  async ({ event, step }) => {
    const { contentId, promptId } = event.data
    const functionStartTime = Date.now()

    // Log function start (outside step.run for reliability)
    await logger.info("inngest", "function-start", `Starting analyze-content for ${contentId}`, {
      contentId,
      metadata: { promptId },
    })

    // Step 1: Get content with transcript
    let content
    try {
      content = await step.run("get-content-with-transcript", async () => {
        return prisma.content.findUnique({
          where: { id: contentId },
          include: {
            transcript: true,
            source: true,
          },
        })
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      await logger.error("inngest", "step-error", `get-content failed: ${msg}`, { contentId })
      throw error
    }

    // Log after step completes
    await logger.info("inngest", "step-complete", `get-content: hasTranscript=${!!content?.transcript}, words=${content?.transcript?.wordCount || 0}`, {
      contentId,
      metadata: { hasTranscript: !!content?.transcript },
    })

    if (!content || !content.transcript) {
      const error = !content ? "Content not found" : "Transcript not found"
      await logger.error("inngest", "validation-error", error, { contentId })
      throw new Error(error)
    }

    // Step 2: Get the analysis prompt
    await logger.debug("inngest", "step-start", "Starting get-prompt step", { contentId })

    let prompt
    try {
      prompt = await step.run("get-prompt", async () => {
        if (promptId) {
          return prisma.analysisPrompt.findUnique({
            where: { id: promptId },
          })
        }
        return prisma.analysisPrompt.findFirst({
          where: { isDefault: true, isActive: true },
        })
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      await logger.error("inngest", "step-error", `get-prompt failed: ${msg}`, { contentId })
      throw error
    }

    await logger.info("inngest", "step-complete", `get-prompt: found=${!!prompt}, name=${prompt?.name || "none"}`, {
      contentId,
      metadata: { promptId: prompt?.id, promptName: prompt?.name },
    })

    // Step 3: Create default prompt if needed
    let activePrompt = prompt
    if (!activePrompt) {
      await logger.info("inngest", "step-start", "Creating default prompt", { contentId })

      try {
        activePrompt = await step.run("create-default-prompt", async () => {
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
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error"
        await logger.error("inngest", "step-error", `create-default-prompt failed: ${msg}`, { contentId })
        throw error
      }

      await logger.info("inngest", "step-complete", `Created default prompt: ${activePrompt.name}`, { contentId })
    }

    // Step 4: Run AI analysis
    const aiStartTime = Date.now()
    await logger.info("inngest", "step-start", `Starting Claude analysis (${content.transcript.fullText.length} chars)`, {
      contentId,
      metadata: { transcriptLength: content.transcript.fullText.length },
    })

    let analysisResult
    try {
      analysisResult = await step.run("run-ai-analysis", async () => {
        return analyzeWithClaude(content.transcript!.fullText, activePrompt!.systemPrompt)
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      await logger.error("inngest", "step-error", `run-ai-analysis failed: ${msg}`, {
        contentId,
        metadata: { error: msg },
      })
      throw error
    }

    const aiDuration = Date.now() - aiStartTime
    await logger.info("inngest", "step-complete", `Claude analysis complete in ${aiDuration}ms, ${analysisResult.tokensUsed} tokens`, {
      contentId,
      duration: aiDuration,
      metadata: { tokensUsed: analysisResult.tokensUsed, relevanceScore: analysisResult.relevanceScore },
    })

    // Step 5: Save the analysis
    await logger.debug("inngest", "step-start", "Saving analysis to database", { contentId })

    let savedAnalysis
    try {
      savedAnalysis = await step.run("save-analysis", async () => {
        return prisma.analysis.create({
          data: {
            contentId: content.id,
            promptId: activePrompt!.id,
            model: "claude-sonnet-4-5-20250929",
            result: analysisResult.result as Prisma.InputJsonValue,
            summary: analysisResult.summary,
            keyInsights: analysisResult.keyInsights,
            quotableLines: analysisResult.quotableLines,
            relevanceScore: analysisResult.relevanceScore,
            tokensUsed: analysisResult.tokensUsed,
            processingTime: aiDuration,
          },
        })
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      await logger.error("inngest", "step-error", `save-analysis failed: ${msg}`, { contentId })
      throw error
    }

    await logger.info("inngest", "step-complete", `Analysis saved: ${savedAnalysis.id}`, {
      contentId,
      metadata: { analysisId: savedAnalysis.id },
    })

    // Step 6: Update content status
    try {
      await step.run("update-content-status", async () => {
        return prisma.content.update({
          where: { id: contentId },
          data: { status: "ANALYZED" },
        })
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      await logger.error("inngest", "step-error", `update-content-status failed: ${msg}`, { contentId })
      throw error
    }

    const totalDuration = Date.now() - functionStartTime
    await logger.info("inngest", "function-complete", `Analysis complete in ${totalDuration}ms`, {
      contentId,
      duration: totalDuration,
      metadata: {
        analysisId: savedAnalysis.id,
        relevanceScore: analysisResult.relevanceScore,
        tokensUsed: analysisResult.tokensUsed,
      },
    })

    return {
      analyzed: true,
      analysisId: savedAnalysis.id,
      relevanceScore: analysisResult.relevanceScore,
      processingTime: aiDuration,
      totalDuration,
    }
  }
)
