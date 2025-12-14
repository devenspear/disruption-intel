import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "7")

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Fetch all analyses from the time period
  const analyses = await prisma.analysis.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    include: {
      content: {
        select: {
          id: true,
          title: true,
          publishedAt: true,
          source: { select: { name: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get summary statistics
  const stats = {
    totalAnalyses: analyses.length,
    avgRelevanceScore: analyses.length > 0
      ? analyses.reduce((sum, a) => sum + (a.relevanceScore || 0), 0) / analyses.length
      : 0,
    totalTokens: analyses.reduce((sum, a) => sum + (a.tokensUsed || 0), 0),
    bySource: {} as Record<string, number>,
    byContentType: {} as Record<string, number>,
  }

  analyses.forEach(a => {
    const sourceName = a.content.source.name
    const sourceType = a.content.source.type
    stats.bySource[sourceName] = (stats.bySource[sourceName] || 0) + 1
    stats.byContentType[sourceType] = (stats.byContentType[sourceType] || 0) + 1
  })

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    stats,
    analyses: analyses.map(a => {
      const result = a.result as { technologies?: string[]; companies?: string[]; topics?: string[] } | null
      return {
        id: a.id,
        contentId: a.content.id,
        contentTitle: a.content.title,
        sourceName: a.content.source.name,
        relevanceScore: a.relevanceScore,
        summary: a.summary,
        keyInsights: a.keyInsights,
        technologies: result?.technologies || [],
        companies: result?.companies || [],
        topics: result?.topics || [],
        createdAt: a.createdAt,
      }
    }),
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { days = 7 } = await request.json()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Fetch all analyses from the time period
  const analyses = await prisma.analysis.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    include: {
      content: {
        select: {
          title: true,
          publishedAt: true,
          source: { select: { name: true } },
        },
      },
    },
    orderBy: { relevanceScore: "desc" },
    take: 50, // Limit to top 50 by relevance
  })

  if (analyses.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No analyses found in the specified period",
    })
  }

  // Compile all the individual analyses for the LLM
  const analysisData = analyses.map(a => {
    const result = a.result as { technologies?: string[]; companies?: string[]; topics?: string[] } | null
    return {
      title: a.content.title,
      source: a.content.source.name,
      publishedAt: a.content.publishedAt,
      relevanceScore: a.relevanceScore,
      summary: a.summary,
      keyInsights: a.keyInsights,
      technologies: result?.technologies || [],
      companies: result?.companies || [],
      topics: result?.topics || [],
    }
  })

  const prompt = `You are an executive intelligence analyst. Below are ${analyses.length} individual content analyses from the past ${days} days covering AI, technology, and disruption topics.

Your task is to synthesize these into a cohesive EXECUTIVE BRIEFING that:
1. Identifies the top 5-7 macro trends and themes emerging across all content
2. Highlights the most significant developments and their implications
3. Notes key companies and technologies that are recurring themes
4. Provides actionable strategic insights
5. Flags any important shifts or emerging patterns

Format your response as a structured JSON object with:
- executiveSummary: 2-3 paragraph overview (string)
- macroTrends: array of { trend: string, evidence: string, implication: string }
- keyDevelopments: array of { development: string, significance: string }
- companiesInFocus: array of { name: string, context: string }
- technologiesInFocus: array of { name: string, context: string }
- strategicInsights: array of strings (actionable recommendations)
- emergingPatterns: array of strings (early signals to watch)

INDIVIDUAL ANALYSES:
${JSON.stringify(analysisData, null, 2)}

Respond ONLY with valid JSON, no markdown.`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const responseText = response.content[0].type === "text" ? response.content[0].text : ""

    // Parse the JSON response
    let executiveBriefing
    try {
      executiveBriefing = JSON.parse(responseText)
    } catch {
      // If JSON parsing fails, return raw text
      executiveBriefing = { rawResponse: responseText }
    }

    return NextResponse.json({
      success: true,
      period: { days, startDate: startDate.toISOString(), endDate: new Date().toISOString() },
      analysisCount: analyses.length,
      executiveBriefing,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error("Failed to generate executive summary:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate executive summary",
    }, { status: 500 })
  }
}
