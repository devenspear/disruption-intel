/**
 * Utility functions for fetching system prompts from the database
 */

import { prisma } from "@/lib/db"

// Cache prompts in memory to avoid repeated database calls
const promptCache = new Map<string, { prompt: string; cachedAt: number }>()
const CACHE_TTL = 60000 // 1 minute cache

// Default prompts used as fallback if database is unavailable
const defaultPrompts: Record<string, string> = {
  executive_briefing: `You are an executive intelligence analyst. Below are individual content analyses covering AI, technology, and disruption topics.

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

  simple_summary: `Summarize the following text in {{maxWords}} words or less. Focus on the key points and main takeaways.

Guidelines:
- Be concise and direct
- Highlight the most important information
- Use clear, professional language
- Avoid jargon unless necessary for accuracy`,

  tag_suggestion: `Based on the following text, suggest 3-5 relevant tags/categories. Return only the tags as a JSON array of strings.

Guidelines:
- Tags should be broad enough to be useful for categorization
- Tags should be specific enough to be meaningful
- Use consistent naming conventions (e.g., "Artificial Intelligence" not "AI" and "artificial-intelligence")
- Focus on the main topics and themes, not minor mentions
- Consider: technologies, industries, companies, trends, concepts

Example output format:
["Artificial Intelligence", "Machine Learning", "Healthcare", "Startups"]`,
}

/**
 * Get a system prompt by key
 * Uses in-memory cache to reduce database calls
 * Falls back to hardcoded default if database is unavailable
 */
export async function getSystemPrompt(key: string): Promise<string> {
  // Check cache first
  const cached = promptCache.get(key)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.prompt
  }

  try {
    const systemPrompt = await prisma.systemPrompt.findUnique({
      where: { key },
    })

    if (systemPrompt && systemPrompt.isActive) {
      promptCache.set(key, { prompt: systemPrompt.prompt, cachedAt: Date.now() })
      return systemPrompt.prompt
    }
  } catch (error) {
    console.error(`Failed to fetch system prompt "${key}":`, error)
  }

  // Fall back to default
  return defaultPrompts[key] || ""
}

/**
 * Clear the prompt cache (useful after updates)
 */
export function clearPromptCache(key?: string) {
  if (key) {
    promptCache.delete(key)
  } else {
    promptCache.clear()
  }
}
