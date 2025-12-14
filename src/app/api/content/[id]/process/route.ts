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

  // Verify content exists
  const content = await prisma.content.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  // Trigger processing via Inngest
  await inngest.send({
    name: "content/process",
    data: { contentId: id },
  })

  return NextResponse.json({
    success: true,
    message: "Processing triggered",
    contentId: id
  })
}
