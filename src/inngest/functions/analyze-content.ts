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

    // Skip analysis for content that's too short (e.g., link-only tweets)
    const MIN_WORDS_FOR_ANALYSIS = 10
    if (content.transcript.wordCount < MIN_WORDS_FOR_ANALYSIS) {
      await logger.info("inngest", "skip-analysis", `Skipping analysis: content too short (${content.transcript.wordCount} words, minimum ${MIN_WORDS_FOR_ANALYSIS})`, {
        contentId,
        metadata: { wordCount: content.transcript.wordCount, minimum: MIN_WORDS_FOR_ANALYSIS },
      })

      // Mark as analyzed but with no analysis (insufficient content)
      await step.run("mark-insufficient-content", async () => {
        return prisma.content.update({
          where: { id: contentId },
          data: {
            status: "ANALYZED",
            metadata: {
              ...(content.metadata as Record<string, unknown> || {}),
              analysisSkipped: true,
              skipReason: `Insufficient content (${content.transcript!.wordCount} words)`,
            },
          },
        })
      })

      return {
        analyzed: false,
        skipped: true,
        reason: `Content too short: ${content.transcript.wordCount} words (minimum: ${MIN_WORDS_FOR_ANALYSIS})`,
      }
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
              name: "Disruption Analysis (Verified)",
              description: "Citation-based analysis with verification requirements",
              isDefault: true,
              isActive: true,
              systemPrompt: `You are an expert analyst specializing in disruptive technologies, exponential trends, and future-forward thinking. Analyze the following transcript and provide a structured analysis.

CRITICAL VERIFICATION REQUIREMENTS:
1. Every quote MUST be VERBATIM from the transcript - absolutely NO paraphrasing
2. Include the approximate character position where the quote appears in the source
3. If you cannot find exact supporting text for a claim, DO NOT include it
4. Confidence scores: 100 = verbatim quote found, 80-99 = very close match, <80 = OMIT entirely
5. Only include insights that can be directly traced to specific statements in the transcript

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 paragraph executive summary based only on verified content from transcript",
  "keyInsights": [
    {
      "insight": "The specific insight with detail",
      "sourceText": "The exact text from transcript supporting this insight",
      "confidence": 80-100
    }
  ],
  "disruptionSignals": [
    {
      "signal": "Name of the disruption",
      "sector": "Industry/sector affected",
      "timeframe": "Near-term/Mid-term/Long-term",
      "sourceText": "Supporting quote from transcript",
      "confidence": 80-100
    }
  ],
  "quotableLines": [
    {
      "quote": "EXACT verbatim quote from transcript - no changes allowed",
      "sourcePosition": 12345,
      "context": "Why this quote matters",
      "speaker": "Name if identifiable, or 'Speaker'",
      "confidence": 100
    }
  ],
  "relevanceScore": 0.0-1.0,
  "categories": ["AI", "Longevity", "Space", etc.],
  "actionItems": [
    {
      "item": "Potential follow-up or research item",
      "sourceText": "What in the transcript prompted this"
    }
  ],
  "relatedTopics": ["Topic for cross-referencing"],
  "verificationSummary": {
    "totalClaims": 10,
    "verifiedClaims": 10,
    "averageConfidence": 95
  }
}

VERIFICATION RULES:
- Search the transcript for the EXACT text before including any quote
- If a quote would require even minor rewording, find a different quote that IS verbatim
- For insights, always cite the specific text that supports the insight
- sourcePosition should be the approximate character index where the quote starts
- Set confidence to 100 ONLY for exact verbatim matches
- NEVER fabricate or embellish quotes - accuracy is paramount

Focus on:
- Specific predictions with timeframes (cite the exact words used)
- Named technologies, companies, or people (as mentioned in transcript)
- Contrarian or non-obvious insights (with source citations)
- Quantitative claims (numbers, percentages, dates - exactly as stated)
- Implications for business strategy (grounded in transcript content)`,
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
            model: analysisResult.model || "claude-sonnet-4-5-20250929",
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
