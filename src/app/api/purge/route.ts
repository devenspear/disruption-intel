import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Purge old content and related data
// Purges based on content's publishedAt date
// Deletes: Content records, their transcripts, and their analyses
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { retentionDays = 30 } = body

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Count content to be deleted (for response)
    const contentCount = await prisma.content.count({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    })

    // Delete analyses for old content first (foreign key constraint)
    const deletedAnalyses = await prisma.analysis.deleteMany({
      where: {
        content: {
          publishedAt: { lt: cutoffDate },
        },
      },
    })

    // Delete transcripts for old content (foreign key constraint)
    const deletedTranscripts = await prisma.transcript.deleteMany({
      where: {
        content: {
          publishedAt: { lt: cutoffDate },
        },
      },
    })

    // Delete the old content records themselves
    const deletedContent = await prisma.content.deleteMany({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    })

    // Delete old system logs
    const deletedLogs = await prisma.systemLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return NextResponse.json({
      success: true,
      purged: {
        content: deletedContent.count,
        transcripts: deletedTranscripts.count,
        analyses: deletedAnalyses.count,
        logs: deletedLogs.count,
      },
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
    })
  } catch (error) {
    console.error("Failed to purge data:", error)
    return NextResponse.json(
      { error: "Failed to purge data" },
      { status: 500 }
    )
  }
}

// GET - Get purge statistics (what would be deleted)
// Shows counts based on content's publishedAt date
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const retentionDays = parseInt(searchParams.get("days") || "30")

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Count content published before cutoff date
    const contentCount = await prisma.content.count({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    })

    // Count logs older than cutoff (still use createdAt for logs)
    const logCount = await prisma.systemLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Get total counts for context
    const totalContent = await prisma.content.count()
    const totalLogs = await prisma.systemLog.count()

    // Get sample of content that would be purged (for user verification)
    const sampleContent = await prisma.content.findMany({
      where: {
        publishedAt: { lt: cutoffDate },
      },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        source: { select: { name: true } },
      },
      orderBy: { publishedAt: "asc" },
      take: 10,
    })

    return NextResponse.json({
      wouldPurge: {
        content: contentCount,
        logs: logCount,
      },
      totals: {
        content: totalContent,
        logs: totalLogs,
      },
      sampleContent,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
    })
  } catch (error) {
    console.error("Failed to get purge stats:", error)
    return NextResponse.json(
      { error: "Failed to get purge statistics" },
      { status: 500 }
    )
  }
}
