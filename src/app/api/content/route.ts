import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const sourceId = searchParams.get("sourceId")
  const sourceType = searchParams.get("sourceType")
  const search = searchParams.get("search")
  const tags = searchParams.get("tags") // Comma-separated tag names
  const sortBy = searchParams.get("sortBy") || "publishedAt"
  const sortOrderParam = searchParams.get("sortOrder") || "desc"
  // Ensure sortOrder is a valid Prisma sort order
  const sortOrder: Prisma.SortOrder = sortOrderParam === "asc" ? "asc" : "desc"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (sourceId) {
    where.sourceId = sourceId
  }

  if (sourceType) {
    where.source = { type: sourceType }
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  // Filter by tags (content must have ALL specified tags)
  if (tags) {
    const tagNames = tags.split(",").map(t => t.trim()).filter(Boolean)
    if (tagNames.length > 0) {
      where.AND = tagNames.map(tagName => ({
        tags: {
          some: {
            name: { equals: tagName, mode: "insensitive" },
          },
        },
      }))
    }
  }

  // Build orderBy clause based on sortBy field
  let orderBy: Prisma.ContentOrderByWithRelationInput | Prisma.ContentOrderByWithRelationInput[]

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
    case "publishedAt":
      orderBy = { publishedAt: sortOrder }
      break
    case "title":
      orderBy = { title: sortOrder }
      break
    case "status":
      orderBy = { status: sortOrder }
      break
    case "createdAt":
      orderBy = { createdAt: sortOrder }
      break
    default:
      orderBy = { publishedAt: sortOrder }
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
        tags: {
          select: { id: true, name: true, color: true },
          orderBy: { name: "asc" },
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
