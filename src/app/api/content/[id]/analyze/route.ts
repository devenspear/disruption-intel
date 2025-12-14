import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { inngest } from "@/inngest/client"
import { apiLogger, analysisLogger } from "@/lib/logger"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await apiLogger.request(`/api/content/${id}/analyze`, "POST", { contentId: id })

  const session = await getServerSession(authOptions)
  if (!session) {
    await apiLogger.error(`/api/content/${id}/analyze`, "Unauthorized", 401)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { promptId } = body

  const content = await prisma.content.findUnique({
    where: { id },
    include: { transcript: true },
  })

  if (!content) {
    await apiLogger.error(`/api/content/${id}/analyze`, "Content not found", 404)
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  await analysisLogger.getContent(id, !!content.transcript, content.transcript?.wordCount)

  if (!content.transcript) {
    await apiLogger.request(`/api/content/${id}/analyze`, "POST", { action: "trigger-process", contentId: id })
    // Trigger transcript fetch first
    try {
      await inngest.send({
        name: "content/process",
        data: { contentId: id },
      })
      await apiLogger.response(`/api/content/${id}/analyze`, 200)
      return NextResponse.json({ success: true, message: "Processing started (no transcript, fetching first)" })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      await apiLogger.error(`/api/content/${id}/analyze`, `Failed to send Inngest event: ${errorMsg}`, 500)
      return NextResponse.json({ error: `Failed to trigger processing: ${errorMsg}` }, { status: 500 })
    }
  }

  // Trigger analysis
  try {
    await analysisLogger.start(id, promptId)
    await inngest.send({
      name: "content/analyze",
      data: { contentId: id, promptId },
    })
    await apiLogger.response(`/api/content/${id}/analyze`, 200)
    return NextResponse.json({ success: true, message: "Analysis triggered" })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    await analysisLogger.error(id, errorMsg, "inngest-send")
    await apiLogger.error(`/api/content/${id}/analyze`, `Failed to send Inngest event: ${errorMsg}`, 500)
    return NextResponse.json({ error: `Failed to trigger analysis: ${errorMsg}` }, { status: 500 })
  }
}
