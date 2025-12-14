import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["YOUTUBE_CHANNEL", "PODCAST", "RSS", "MANUAL"]).optional(),
  url: z.string().url().optional(),
  checkFrequency: z.string().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      contents: {
        take: 10,
        orderBy: { publishedAt: "desc" },
      },
      _count: {
        select: { contents: true },
      },
    },
  })

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 })
  }

  return NextResponse.json(source)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const data = updateSourceSchema.parse(body)

    const source = await prisma.source.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    })

    return NextResponse.json(source)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.source.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    )
  }
}
