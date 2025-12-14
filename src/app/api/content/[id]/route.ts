import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const updateContentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "ANALYZED", "FAILED", "ARCHIVED"]).optional(),
  tags: z.array(z.string()).optional(),
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

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      source: true,
      transcript: true,
      analyses: {
        include: {
          prompt: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      tags: true,
      usageHistory: {
        orderBy: { usedAt: "desc" },
      },
    },
  })

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  return NextResponse.json(content)
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
    const { tags, ...data } = updateContentSchema.parse(body)

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...data,
        ...(tags && {
          tags: {
            set: [],
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        }),
      },
      include: {
        tags: true,
      },
    })

    return NextResponse.json(content)
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
    await prisma.content.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    )
  }
}
