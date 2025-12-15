import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Approximate pricing per 1M tokens (input rate used as average)
const MODEL_PRICING: Record<string, number> = {
  "claude-sonnet-4-5-20241022": 3.00,  // $3 per 1M input tokens
  "claude-sonnet-4-20250514": 3.00,
  "gpt-4o": 2.50,
  "gpt-4o-mini": 0.15,
  "gpt-4-turbo": 10.00,
  "default": 3.00,
}

function getModelCost(model: string, tokens: number): number {
  // Find matching price (partial match for versioned model names)
  const price = Object.entries(MODEL_PRICING).find(([key]) =>
    model.toLowerCase().includes(key.toLowerCase())
  )?.[1] ?? MODEL_PRICING.default

  return (tokens / 1_000_000) * price
}

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get this month's usage
    const thisMonthAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      select: {
        model: true,
        tokensUsed: true,
        createdAt: true,
      },
    })

    // Get last month's usage
    const lastMonthAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      select: {
        model: true,
        tokensUsed: true,
      },
    })

    // Get all-time usage
    const allTimeAnalyses = await prisma.analysis.findMany({
      select: {
        model: true,
        tokensUsed: true,
      },
    })

    // Calculate this month's stats
    const thisMonthTokens = thisMonthAnalyses.reduce((sum, a) => sum + a.tokensUsed, 0)
    const thisMonthCost = thisMonthAnalyses.reduce(
      (sum, a) => sum + getModelCost(a.model, a.tokensUsed),
      0
    )
    const thisMonthCount = thisMonthAnalyses.length

    // Calculate last month's stats
    const lastMonthTokens = lastMonthAnalyses.reduce((sum, a) => sum + a.tokensUsed, 0)
    const lastMonthCost = lastMonthAnalyses.reduce(
      (sum, a) => sum + getModelCost(a.model, a.tokensUsed),
      0
    )
    const lastMonthCount = lastMonthAnalyses.length

    // Calculate all-time stats
    const allTimeTokens = allTimeAnalyses.reduce((sum, a) => sum + a.tokensUsed, 0)
    const allTimeCost = allTimeAnalyses.reduce(
      (sum, a) => sum + getModelCost(a.model, a.tokensUsed),
      0
    )
    const allTimeCount = allTimeAnalyses.length

    // Group by model for this month
    const byModel = thisMonthAnalyses.reduce((acc, a) => {
      const modelKey = a.model.split("-").slice(0, 3).join("-") // Normalize model names
      if (!acc[modelKey]) {
        acc[modelKey] = { tokens: 0, cost: 0, count: 0 }
      }
      acc[modelKey].tokens += a.tokensUsed
      acc[modelKey].cost += getModelCost(a.model, a.tokensUsed)
      acc[modelKey].count += 1
      return acc
    }, {} as Record<string, { tokens: number; cost: number; count: number }>)

    // Daily usage for chart (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        tokensUsed: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const dailyUsage = recentAnalyses.reduce((acc, a) => {
      const date = a.createdAt.toISOString().split("T")[0]
      if (!acc[date]) {
        acc[date] = { tokens: 0, count: 0 }
      }
      acc[date].tokens += a.tokensUsed
      acc[date].count += 1
      return acc
    }, {} as Record<string, { tokens: number; count: number }>)

    return NextResponse.json({
      thisMonth: {
        tokens: thisMonthTokens,
        cost: thisMonthCost,
        count: thisMonthCount,
        period: {
          start: startOfMonth.toISOString(),
          end: now.toISOString(),
        },
      },
      lastMonth: {
        tokens: lastMonthTokens,
        cost: lastMonthCost,
        count: lastMonthCount,
        period: {
          start: startOfLastMonth.toISOString(),
          end: endOfLastMonth.toISOString(),
        },
      },
      allTime: {
        tokens: allTimeTokens,
        cost: allTimeCost,
        count: allTimeCount,
      },
      byModel,
      dailyUsage,
    })
  } catch (error) {
    console.error("Failed to get usage stats:", error)
    return NextResponse.json(
      { error: "Failed to get usage statistics" },
      { status: 500 }
    )
  }
}
