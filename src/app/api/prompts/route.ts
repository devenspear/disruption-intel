import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const promptSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  outputSchema: z.any().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prompts = await prisma.analysisPrompt.findMany({
    include: {
      _count: {
        select: { analyses: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(prompts)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = promptSchema.parse(body)

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.analysisPrompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const prompt = await prisma.analysisPrompt.create({
      data: {
        ...data,
        outputSchema: data.outputSchema as Prisma.InputJsonValue | undefined,
      },
    })

    return NextResponse.json(prompt, { status: 201 })
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
