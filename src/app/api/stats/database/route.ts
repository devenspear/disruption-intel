import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get record counts for all tables
    const [
      sourcesCount,
      contentCount,
      transcriptsCount,
      analysesCount,
      tagsCount,
      promptsCount,
      usageRecordsCount,
      jobsCount,
    ] = await Promise.all([
      prisma.source.count(),
      prisma.content.count(),
      prisma.transcript.count(),
      prisma.analysis.count(),
      prisma.tag.count(),
      prisma.analysisPrompt.count(),
      prisma.usageRecord.count(),
      prisma.job.count(),
    ])

    // Get content status breakdown
    const contentByStatus = await prisma.content.groupBy({
      by: ["status"],
      _count: { status: true },
    })

    // Get sources by type
    const sourcesByType = await prisma.source.groupBy({
      by: ["type"],
      _count: { type: true },
    })

    // Get recent analyses (last 10)
    const recentAnalyses = await prisma.analysis.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        model: true,
        tokensUsed: true,
        processingTime: true,
        createdAt: true,
        content: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Get recent content (last 10)
    const recentContent = await prisma.content.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        source: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    })

    // Get recent transcripts (last 5)
    const recentTranscripts = await prisma.transcript.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        wordCount: true,
        source: true,
        language: true,
        createdAt: true,
        content: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Get total tokens used (all time)
    const tokenStats = await prisma.analysis.aggregate({
      _sum: { tokensUsed: true },
      _avg: { tokensUsed: true },
      _count: true,
    })

    // Get most used tags
    const topTags = await prisma.tag.findMany({
      take: 10,
      orderBy: {
        contents: {
          _count: "desc",
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { contents: true },
        },
      },
    })

    return NextResponse.json({
      counts: {
        sources: sourcesCount,
        content: contentCount,
        transcripts: transcriptsCount,
        analyses: analysesCount,
        tags: tagsCount,
        prompts: promptsCount,
        usageRecords: usageRecordsCount,
        jobs: jobsCount,
      },
      contentByStatus: contentByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      sourcesByType: sourcesByType.reduce((acc, item) => {
        acc[item.type] = item._count.type
        return acc
      }, {} as Record<string, number>),
      recentAnalyses,
      recentContent,
      recentTranscripts,
      tokenStats: {
        total: tokenStats._sum.tokensUsed || 0,
        average: Math.round(tokenStats._avg.tokensUsed || 0),
        count: tokenStats._count,
      },
      topTags,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to get database stats:", error)
    return NextResponse.json(
      { error: "Failed to get database statistics" },
      { status: 500 }
    )
  }
}
