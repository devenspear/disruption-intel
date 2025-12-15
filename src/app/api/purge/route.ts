import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// POST - Purge old transcripts (keeps analyses)
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

    // Count records before purge
    const transcriptCount = await prisma.transcript.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    const logCount = await prisma.systemLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Delete old transcripts (but keep analyses)
    const deletedTranscripts = await prisma.transcript.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Delete old system logs
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

    // Count records that would be deleted
    const transcriptCount = await prisma.transcript.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

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
