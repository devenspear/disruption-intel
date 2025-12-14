import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  outputSchema: z.any().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
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

  const prompt = await prisma.analysisPrompt.findUnique({
    where: { id },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  })

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
  }

  return NextResponse.json(prompt)
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
    const data = updatePromptSchema.parse(body)

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.analysisPrompt.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const prompt = await prisma.analysisPrompt.update({
      where: { id },
      data: {
        ...data,
        outputSchema: data.outputSchema as Prisma.InputJsonValue | undefined,
      },
    })

    return NextResponse.json(prompt)
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

  // Check if prompt has analyses
  const prompt = await prisma.analysisPrompt.findUnique({
    where: { id },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  })

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
  }

  if (prompt._count.analyses > 0) {
    return NextResponse.json(
      { error: "Cannot delete prompt with existing analyses" },
      { status: 400 }
    )
  }

  await prisma.analysisPrompt.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
