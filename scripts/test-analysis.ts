/**
 * Direct test of analysis flow - bypasses Inngest to test core logic
 * Run with: npx tsx scripts/test-analysis.ts
 */

import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"

const prisma = new PrismaClient()

async function testAnalysis() {
  console.log("=== Testing Analysis Flow Directly ===\n")

  // Step 1: Check database connection
  console.log("1. Testing database connection...")
  try {
    const contentCount = await prisma.content.count()
    console.log(`   ✓ Database connected. ${contentCount} content items found.\n`)
  } catch (error) {
    console.error("   ✗ Database connection failed:", error)
    process.exit(1)
  }

  // Step 2: Find content with transcript
  console.log("2. Finding content with transcript...")
  const content = await prisma.content.findFirst({
    where: {
      transcript: { isNot: null },
    },
    include: {
      transcript: true,
      source: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (!content || !content.transcript) {
    console.error("   ✗ No content with transcript found")
    process.exit(1)
  }

  console.log(`   ✓ Found: "${content.title}"`)
  console.log(`   Transcript: ${content.transcript.wordCount} words\n`)

  // Step 3: Get or create analysis prompt
  console.log("3. Getting analysis prompt...")
  let prompt = await prisma.analysisPrompt.findFirst({
    where: { isDefault: true, isActive: true },
  })

  if (!prompt) {
    console.log("   Creating default prompt...")
    prompt = await prisma.analysisPrompt.create({
      data: {
        name: "Disruption Analysis",
        description: "Default analysis prompt",
        isDefault: true,
        isActive: true,
        systemPrompt: `You are an expert analyst. Analyze the transcript and return JSON:
{
  "summary": "2-3 paragraph summary",
  "keyInsights": ["insight 1", "insight 2"],
  "quotableLines": [{"quote": "exact quote", "context": "why it matters"}],
  "relevanceScore": 0.0-1.0,
  "categories": ["AI", "Tech"]
}`,
      },
    })
  }

  console.log(`   ✓ Using prompt: "${prompt.name}"\n`)

  // Step 4: Test Anthropic API
  console.log("4. Testing Anthropic API...")
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()

  if (!apiKey) {
    console.error("   ✗ ANTHROPIC_API_KEY not set")
    process.exit(1)
  }

  console.log(`   API Key: ${apiKey.substring(0, 20)}...`)

  const anthropic = new Anthropic({ apiKey })

  // Use a short test prompt first
  console.log("   Sending test message to Claude...")

  try {
    const testMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'API working' in 3 words or less" }],
    })

    const testResponse = testMessage.content[0].type === "text" ? testMessage.content[0].text : ""
    console.log(`   ✓ Claude responded: "${testResponse}"\n`)
  } catch (error) {
    console.error("   ✗ Anthropic API error:", error)
    process.exit(1)
  }

  // Step 5: Run actual analysis
  console.log("5. Running full analysis...")
  const transcriptPreview = content.transcript.fullText.substring(0, 500)
  console.log(`   Transcript preview: "${transcriptPreview}..."\n`)

  const startTime = Date.now()

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${prompt.systemPrompt}\n\nTRANSCRIPT:\n${content.transcript.fullText.substring(0, 50000)}`,
        },
      ],
    })

    const duration = Date.now() - startTime
    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    console.log(`   ✓ Analysis complete in ${duration}ms`)
    console.log(`   Tokens used: ${message.usage.input_tokens + message.usage.output_tokens}`)
    console.log(`   Response length: ${responseText.length} chars\n`)

    // Parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      console.log("6. Parsed result:")
      console.log(`   Summary: ${result.summary?.substring(0, 100)}...`)
      console.log(`   Insights: ${result.keyInsights?.length || 0}`)
      console.log(`   Quotes: ${result.quotableLines?.length || 0}`)
      console.log(`   Relevance: ${result.relevanceScore}`)
      console.log(`   Categories: ${result.categories?.join(", ")}\n`)

      // Step 7: Save to database
      console.log("7. Saving analysis to database...")
      const analysis = await prisma.analysis.create({
        data: {
          contentId: content.id,
          promptId: prompt.id,
          model: "claude-sonnet-4-5-20250929",
          result: result,
          summary: result.summary || "",
          keyInsights: result.keyInsights || [],
          quotableLines: (result.quotableLines || []).map((q: any) =>
            typeof q === "string" ? q : q.quote
          ),
          relevanceScore: result.relevanceScore || 0.5,
          tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
          processingTime: duration,
        },
      })

      console.log(`   ✓ Saved analysis: ${analysis.id}`)

      // Update content status
      await prisma.content.update({
        where: { id: content.id },
        data: { status: "ANALYZED" },
      })

      console.log(`   ✓ Updated content status to ANALYZED\n`)
      console.log("=== TEST PASSED ===")
    } else {
      console.error("   ✗ Could not parse JSON from response")
      console.log("   Response:", responseText.substring(0, 500))
    }
  } catch (error) {
    console.error("   ✗ Analysis failed:", error)
    process.exit(1)
  }

  await prisma.$disconnect()
}

testAnalysis().catch(console.error)
