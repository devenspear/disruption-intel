/**
 * Seed script for System Prompts
 * These are editable prompts used for AI operations (briefings, summaries, tags)
 *
 * Run with: npx tsx scripts/seed-system-prompts.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const systemPrompts = [
  {
    key: "executive_briefing",
    name: "Executive Briefing",
    description: "Prompt used to generate executive briefings from multiple content analyses",
    prompt: `You are an executive intelligence analyst. Below are individual content analyses covering AI, technology, and disruption topics.

Your task is to synthesize these into a cohesive EXECUTIVE BRIEFING that:
1. Identifies the top 5-7 macro trends and themes emerging across all content
2. Highlights the most significant developments and their implications
3. Notes key companies and technologies that are recurring themes
4. Provides actionable strategic insights
5. Flags any important shifts or emerging patterns

Format your response as a structured JSON object with:
- executiveSummary: 2-3 paragraph overview (string)
- macroTrends: array of { trend: string, evidence: string, implication: string }
- keyDevelopments: array of { development: string, significance: string }
- companiesInFocus: array of { name: string, context: string }
- technologiesInFocus: array of { name: string, context: string }
- strategicInsights: array of strings (actionable recommendations)
- emergingPatterns: array of strings (early signals to watch)

Respond ONLY with valid JSON, no markdown.`,
  },
  {
    key: "simple_summary",
    name: "Simple Summary",
    description: "Prompt used to generate quick summaries of content",
    prompt: `Summarize the following text in {{maxWords}} words or less. Focus on the key points and main takeaways.

Guidelines:
- Be concise and direct
- Highlight the most important information
- Use clear, professional language
- Avoid jargon unless necessary for accuracy`,
  },
  {
    key: "tag_suggestion",
    name: "Tag Suggestion",
    description: "Prompt used to automatically suggest tags/categories for content",
    prompt: `Based on the following text, suggest 3-5 relevant tags/categories. Return only the tags as a JSON array of strings.

Guidelines:
- Tags should be broad enough to be useful for categorization
- Tags should be specific enough to be meaningful
- Use consistent naming conventions (e.g., "Artificial Intelligence" not "AI" and "artificial-intelligence")
- Focus on the main topics and themes, not minor mentions
- Consider: technologies, industries, companies, trends, concepts

Example output format:
["Artificial Intelligence", "Machine Learning", "Healthcare", "Startups"]`,
  },
]

async function main() {
  console.log("Seeding system prompts...")

  for (const promptData of systemPrompts) {
    const existing = await prisma.systemPrompt.findUnique({
      where: { key: promptData.key },
    })

    if (existing) {
      console.log(`  [skip] ${promptData.name} already exists`)
    } else {
      await prisma.systemPrompt.create({ data: promptData })
      console.log(`  [created] ${promptData.name}`)
    }
  }

  console.log("\nDone! System prompts seeded successfully.")
}

main()
  .catch((e) => {
    console.error("Error seeding system prompts:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
