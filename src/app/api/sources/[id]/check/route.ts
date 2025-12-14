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

  const source = await prisma.source.findUnique({
    where: { id },
  })

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 })
  }

  // Trigger the check source job
  await inngest.send({
    name: "source/check",
    data: { sourceId: id },
  })

  return NextResponse.json({ success: true, message: "Check triggered" })
}
