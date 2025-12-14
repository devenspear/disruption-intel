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
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.content.count({ where }),
  ])

  return NextResponse.json({
    contents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
