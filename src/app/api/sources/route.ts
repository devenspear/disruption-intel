import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const sourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["YOUTUBE_CHANNEL", "PODCAST", "RSS", "SUBSTACK", "TWITTER", "MANUAL"]),
  url: z.string().min(1).refine((val) => {
    // Allow search: prefix for Twitter searches
    if (val.startsWith("search:")) return true
    // Otherwise validate as URL
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, { message: "Must be a valid URL or search:query format" }),
  checkFrequency: z.string().default("daily"),
  isActive: z.boolean().default(true),
  metadata: z.any().optional(),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isActive = searchParams.get("isActive")

  const sources = await prisma.source.findMany({
    where: isActive !== null ? { isActive: isActive === "true" } : undefined,
    include: {
      _count: {
        select: { contents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(sources)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = sourceSchema.parse(body)

    const source = await prisma.source.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
