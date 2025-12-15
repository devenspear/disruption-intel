import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

// Default settings
const DEFAULT_SETTINGS = {
  retentionDays: "30",
  autoPurgeEnabled: "false",
}

// GET - Fetch all settings
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await prisma.systemSetting.findMany()

    // Convert to key-value object with defaults
    const settingsMap = { ...DEFAULT_SETTINGS }
    for (const setting of settings) {
      settingsMap[setting.key as keyof typeof DEFAULT_SETTINGS] = setting.value
    }

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT - Update a setting
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 }
      )
    }

    // Upsert the setting
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update setting:", error)
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}
