import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const sourceId = searchParams.get("sourceId")
  const limit = parseInt(searchParams.get("limit") || "20")

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Search in transcripts and content titles
  const results = await prisma.content.findMany({
    where: {
      AND: [
        sourceId ? { sourceId } : {},
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            {
              transcript: {
                fullText: { contains: query, mode: "insensitive" },
              },
            },
          ],
        },
      ],
    },
    include: {
      source: {
        select: { name: true, type: true },
      },
      transcript: {
        select: { fullText: true, wordCount: true },
      },
      analyses: {
        select: { summary: true, relevanceScore: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    take: limit,
    orderBy: { publishedAt: "desc" },
  })

  // Extract matching snippets from transcripts
  const resultsWithSnippets = results.map((content: {
    id: string
    title: string
    description: string | null
    publishedAt: Date
    originalUrl: string
    source: { name: string; type: string }
    transcript: { fullText: string; wordCount: number } | null
    analyses: Array<{ summary: string; relevanceScore: number | null }>
  }) => {
    let snippet = ""
    if (content.transcript?.fullText) {
      const text = content.transcript.fullText
      const lowerQuery = query.toLowerCase()
      const index = text.toLowerCase().indexOf(lowerQuery)
      if (index !== -1) {
        const start = Math.max(0, index - 100)
        const end = Math.min(text.length, index + query.length + 100)
        snippet = (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "")
      }
    }

    return {
      id: content.id,
      title: content.title,
      description: content.description,
      publishedAt: content.publishedAt,
      originalUrl: content.originalUrl,
      source: content.source,
      wordCount: content.transcript?.wordCount,
      relevanceScore: content.analyses[0]?.relevanceScore,
      snippet,
    }
  })

  return NextResponse.json({ results: resultsWithSnippets })
}
