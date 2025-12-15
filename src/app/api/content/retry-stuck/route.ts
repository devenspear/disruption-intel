import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { inngest } from "@/inngest/client"

/**
 * POST /api/content/retry-stuck
 * Retry analysis for all content stuck in PROCESSING status
 * This handles items where the Inngest event was never sent due to API timeouts
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all content stuck in PROCESSING status with a transcript
    // (Processing means transcript exists but analysis didn't complete)
    const stuckContent = await prisma.content.findMany({
      where: {
        status: "PROCESSING",
        transcript: { isNot: null },
      },
      include: {
        transcript: {
          select: { wordCount: true },
        },
      },
      take: 50, // Limit to 50 at a time to avoid overwhelming Inngest
    })

    if (stuckContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stuck items found",
        retriedCount: 0,
      })
    }

    // Send analyze events for each stuck item
    const events = stuckContent.map((content) => ({
      name: "content/analyze" as const,
      data: { contentId: content.id },
    }))

    await inngest.send(events)

    return NextResponse.json({
      success: true,
      message: `Retrying analysis for ${stuckContent.length} items`,
      retriedCount: stuckContent.length,
      items: stuckContent.map((c) => ({
        id: c.id,
        title: c.title,
        wordCount: c.transcript?.wordCount,
      })),
    })
  } catch (error) {
    console.error("Failed to retry stuck content:", error)
    return NextResponse.json(
      { error: "Failed to retry stuck content" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/content/retry-stuck
 * Get count of items stuck in PROCESSING status
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stuckCount = await prisma.content.count({
      where: {
        status: "PROCESSING",
        transcript: { isNot: null },
      },
    })

    const pendingCount = await prisma.content.count({
      where: {
        status: "PENDING",
      },
    })

    return NextResponse.json({
      stuckInProcessing: stuckCount,
      pending: pendingCount,
    })
  } catch (error) {
    console.error("Failed to get stuck count:", error)
    return NextResponse.json(
      { error: "Failed to get stuck count" },
      { status: 500 }
    )
  }
}
