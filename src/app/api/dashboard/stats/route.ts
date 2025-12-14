import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [
    totalSources,
    activeSources,
    totalContent,
    pendingAnalysis,
    recentContent,
  ] = await Promise.all([
    prisma.source.count(),
    prisma.source.count({ where: { isActive: true } }),
    prisma.content.count(),
    prisma.content.count({ where: { status: "PENDING" } }),
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
  ])

  return NextResponse.json({
    totalSources,
    activeSources,
    totalContent,
    pendingAnalysis,
    recentContent: recentContent.map((c: {
      id: string
      title: string
      publishedAt: Date
      status: string
      source: { name: string }
    }) => ({
      id: c.id,
      title: c.title,
      sourceName: c.source.name,
      publishedAt: c.publishedAt.toISOString(),
      status: c.status,
    })),
  })
}
