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
  const category = searchParams.get("category")
  const contentId = searchParams.get("contentId")
  const level = searchParams.get("level")
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")

  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (contentId) {
    where.contentId = contentId
  }

  if (level) {
    where.level = level
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.systemLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const olderThanDays = parseInt(searchParams.get("olderThanDays") || "7")

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  try {
    const result = await prisma.systemLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} logs older than ${olderThanDays} days`,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
