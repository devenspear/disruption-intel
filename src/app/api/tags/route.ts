import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all tags with their content count, ordered by usage (most used first)
  const tags = await prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { contents: true },
      },
    },
    orderBy: {
      contents: {
        _count: "desc",
      },
    },
  })

  return NextResponse.json(tags)
}
