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
    const [
      totalSources,
      activeSources,
      totalContent,
      analyzedContent,
      processingContent,
      pendingContent,
      failedContent,
      totalAnalyses,
      recentContent,
      recentAnalyses,
      avgRelevanceScore,
    ] = await Promise.all([
      prisma.source.count(),
      prisma.source.count({ where: { isActive: true } }),
      prisma.content.count(),
      prisma.content.count({ where: { status: "ANALYZED" } }),
      prisma.content.count({ where: { status: "PROCESSING" } }),
      prisma.content.count({ where: { status: "PENDING" } }),
      prisma.content.count({ where: { status: "FAILED" } }),
      prisma.analysis.count(),
      prisma.content.findMany({
        take: 5,
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          status: true,
          source: {
            select: { name: true },
          },
        },
      }),
      prisma.analysis.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          model: true,
          relevanceScore: true,
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
      }),
      prisma.analysis.aggregate({
        _avg: {
          relevanceScore: true,
        },
        where: {
          relevanceScore: {
            not: null,
          },
        },
      }),
    ])

    return NextResponse.json({
      totalSources,
      activeSources,
      totalContent,
      analyzedContent,
      processingContent,
      pendingContent,
      failedContent,
      totalAnalyses,
      avgRelevanceScore: avgRelevanceScore._avg.relevanceScore || 0,
      recentContent: recentContent.map((c) => ({
        id: c.id,
        title: c.title,
        sourceName: c.source.name,
        publishedAt: c.publishedAt.toISOString(),
        status: c.status,
      })),
      recentAnalyses: recentAnalyses.map((a) => ({
        id: a.id,
        contentId: a.content.id,
        contentTitle: a.content.title,
        model: a.model,
        relevanceScore: a.relevanceScore,
        tokensUsed: a.tokensUsed,
        processingTime: a.processingTime,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
