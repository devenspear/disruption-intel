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
  const status = searchParams.get("status")
  const sourceId = searchParams.get("sourceId")
  const search = searchParams.get("search")
  const sortBy = searchParams.get("sortBy") || "publishedAt"
  const sortOrder = searchParams.get("sortOrder") || "desc"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (sourceId) {
    where.sourceId = sourceId
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  // Build orderBy clause based on sortBy field
  type OrderByType = Record<string, unknown>
  let orderBy: OrderByType | OrderByType[]

  switch (sortBy) {
    case "sourceName":
      orderBy = { source: { name: sortOrder } }
      break
    case "wordCount":
      orderBy = { transcript: { wordCount: sortOrder } }
      break
    case "relevanceScore":
      // For relevance score, we need to sort by the latest analysis
      // Prisma doesn't support ordering by aggregated/related fields directly
      // So we'll fetch and sort in memory for this case
      orderBy = { publishedAt: "desc" } // fallback, will sort in memory
      break
    default:
      orderBy = { [sortBy]: sortOrder }
  }

  const [contents, total] = await Promise.all([
    prisma.content.findMany({
      where,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        status: true,
        contentType: true,
        thumbnailUrl: true,
        originalUrl: true,
        source: {
          select: { id: true, name: true, type: true },
        },
        transcript: {
          select: { wordCount: true, source: true },
        },
        analyses: {
          select: { relevanceScore: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { tags: true, usageHistory: true },
        },
      },
      orderBy,
      skip: sortBy === "relevanceScore" ? 0 : (page - 1) * limit,
      take: sortBy === "relevanceScore" ? undefined : limit,
    }),
    prisma.content.count({ where }),
  ])

  // Handle relevanceScore sorting in memory
  let sortedContents = contents
  if (sortBy === "relevanceScore") {
    sortedContents = [...contents].sort((a, b) => {
      const scoreA = a.analyses[0]?.relevanceScore ?? -1
      const scoreB = b.analyses[0]?.relevanceScore ?? -1
      return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA
    })
    // Apply pagination after sorting
    sortedContents = sortedContents.slice((page - 1) * limit, page * limit)
  }

  return NextResponse.json({
    contents: sortedContents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
