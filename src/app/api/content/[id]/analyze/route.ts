import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { inngest } from "@/inngest/client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { promptId } = body

  const content = await prisma.content.findUnique({
    where: { id },
    include: { transcript: true },
  })

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  if (!content.transcript) {
    // Trigger transcript fetch first
    await inngest.send({
      name: "content/process",
      data: { contentId: id },
    })
    return NextResponse.json({ success: true, message: "Processing started" })
  }

  // Trigger analysis
  await inngest.send({
    name: "content/analyze",
    data: { contentId: id, promptId },
  })

  return NextResponse.json({ success: true, message: "Analysis triggered" })
}
