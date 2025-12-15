import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// GET - Fetch the latest executive briefing
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get the most recent briefing
    const briefing = await prisma.executiveBriefing.findFirst({
      orderBy: { createdAt: "desc" },
    })

    if (!briefing) {
      return NextResponse.json({ briefing: null })
    }

    return NextResponse.json({
      briefing: {
        success: true,
        period: {
          days: briefing.periodDays,
          startDate: briefing.periodStartDate.toISOString(),
          endDate: briefing.periodEndDate.toISOString(),
        },
        analysisCount: briefing.analysisCount,
        executiveBriefing: briefing.briefing,
        usage: {
          inputTokens: briefing.inputTokens,
          outputTokens: briefing.outputTokens,
        },
        generatedAt: briefing.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to fetch briefing:", error)
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 }
    )
  }
}

// POST - Save a new executive briefing
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { period, analysisCount, executiveBriefing, usage } = body

    // Create new briefing record
    const briefing = await prisma.executiveBriefing.create({
      data: {
        periodDays: period.days,
        periodStartDate: new Date(period.startDate),
        periodEndDate: new Date(period.endDate),
        analysisCount,
        briefing: executiveBriefing,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    })

    return NextResponse.json({
      success: true,
      briefingId: briefing.id,
    })
  } catch (error) {
    console.error("Failed to save briefing:", error)
    return NextResponse.json(
      { error: "Failed to save briefing" },
      { status: 500 }
    )
  }
}
