import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { fetchTranscriptWithDebug } from "@/lib/ingestion/transcript"
import { Prisma } from "@prisma/client"
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

  console.log(`[API] Transcript fetch requested for content: ${id}`)

  const content = await prisma.content.findUnique({
    where: { id },
    include: { transcript: true },
  })

  if (!content) {
    console.log(`[API] Content not found: ${id}`)
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  // Check if transcript already exists
  if (content.transcript) {
    console.log(`[API] Transcript already exists for: ${id}`)
    return NextResponse.json({
      success: true,
      message: "Transcript already exists",
      transcript: {
        wordCount: content.transcript.wordCount,
        segmentCount: Array.isArray(content.transcript.segments)
          ? content.transcript.segments.length
          : 0,
      },
    })
  }

  console.log(`[API] Fetching transcript for video: ${content.externalId}`)

  // Update status to processing
  await prisma.content.update({
    where: { id },
    data: { status: "PROCESSING" },
  })

  // Fetch transcript with debug info
  const result = await fetchTranscriptWithDebug(content.externalId)

  console.log(`[API] Transcript fetch result:`, {
    success: result.success,
    error: result.error,
    itemCount: result.debug.itemCount,
  })

  if (result.success && result.data) {
    // Save transcript to database
    try {
      await prisma.transcript.create({
        data: {
          contentId: content.id,
          fullText: result.data.fullText,
          segments: result.data.segments as unknown as Prisma.InputJsonValue,
          language: result.data.language,
          source: result.data.source,
          wordCount: result.data.wordCount,
        },
      })

      // Update content status
      await prisma.content.update({
        where: { id },
        data: { status: "PROCESSING" },
      })

      console.log(`[API] Transcript saved successfully for: ${id}`)

      // Automatically trigger AI analysis
      console.log(`[API] Triggering automatic analysis for: ${id}`)
      await inngest.send({
        name: "content/analyze",
        data: { contentId: id },
      })

      return NextResponse.json({
        success: true,
        message: "Transcript fetched and saved - analysis started automatically",
        transcript: {
          wordCount: result.data.wordCount,
          segmentCount: result.data.segments.length,
        },
        analysisTriggered: true,
        debug: result.debug,
      })
    } catch (dbError) {
      console.error(`[API] Database error saving transcript:`, dbError)
      return NextResponse.json({
        success: false,
        error: "Failed to save transcript to database",
        debug: {
          ...result.debug,
          dbError: String(dbError),
        },
      }, { status: 500 })
    }
  } else {
    // Update content status to failed
    await prisma.content.update({
      where: { id },
      data: { status: "FAILED" },
    })

    return NextResponse.json({
      success: false,
      error: result.error || "Failed to fetch transcript",
      debug: result.debug,
    }, { status: 400 })
  }
}

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
    include: { transcript: true },
  })

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 })
  }

  return NextResponse.json({
    hasTranscript: !!content.transcript,
    transcript: content.transcript ? {
      wordCount: content.transcript.wordCount,
      segmentCount: Array.isArray(content.transcript.segments)
        ? content.transcript.segments.length
        : 0,
      language: content.transcript.language,
      source: content.transcript.source,
    } : null,
    status: content.status,
  })
}
