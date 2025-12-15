import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Purge old transcripts (keeps analyses)
// Purges based on content's publishedAt date, not transcript's createdAt
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

    // Find transcripts for content published before cutoff date
    const transcriptsToDelete = await prisma.transcript.findMany({
      where: {
        content: {
          publishedAt: { lt: cutoffDate },
        },
      },
      select: { id: true },
    })

    const logCount = await prisma.systemLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Delete transcripts for old content (based on content's publishedAt)
    const deletedTranscripts = await prisma.transcript.deleteMany({
      where: {
        content: {
          publishedAt: { lt: cutoffDate },
        },
      },
    })

    // Delete old system logs (still use createdAt for logs)
    const deletedLogs = await prisma.systemLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Update content status for items with deleted transcripts
    // (They'll need to be re-processed if needed)
    await prisma.content.updateMany({
      where: {
        transcript: null,
        status: { in: ["ANALYZED", "PROCESSING"] },
      },
      data: {
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      purged: {
        transcripts: deletedTranscripts.count,
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

    // Count transcripts for content published before cutoff date
    const transcriptCount = await prisma.transcript.count({
      where: {
        content: {
          publishedAt: { lt: cutoffDate },
        },
      },
    })

    // Count logs older than cutoff (still use createdAt for logs)
    const logCount = await prisma.systemLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Get total counts for context
    const totalTranscripts = await prisma.transcript.count()
    const totalLogs = await prisma.systemLog.count()

    return NextResponse.json({
      wouldPurge: {
        transcripts: transcriptCount,
        logs: logCount,
      },
      totals: {
        transcripts: totalTranscripts,
        logs: totalLogs,
      },
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
