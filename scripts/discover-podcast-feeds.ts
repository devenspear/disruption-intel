/**
 * Podcast RSS Feed Discovery Script
 *
 * Automatically discovers RSS feeds from podcast website URLs,
 * validates them, and checks for transcript support.
 *
 * Usage: npx ts-node scripts/discover-podcast-feeds.ts
 */

import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Podcast URLs from the PRD
const PODCASTS = [
  { name: "20 VC", websiteUrl: "https://www.thetwentyminutevc.com/" },
  { name: "BG2 Pod", websiteUrl: "https://www.bg2pod.com/" },
  { name: "Big Technology Podcast", websiteUrl: "https://www.bigtechnology.com/" },
  { name: "Dwarkesh Podcast", websiteUrl: "https://www.dwarkeshpatel.com/podcast" },
  { name: "Google AI Release Notes", websiteUrl: "https://ai.google/updates/" },
  { name: "Google DeepMind: The Podcast", websiteUrl: "https://deepmind.google/discover/podcast/" },
  { name: "Hard Fork", websiteUrl: "https://www.nytimes.com/column/hard-fork" },
  { name: "Lenny's Podcast", websiteUrl: "https://www.lennyspodcast.com/" },
  { name: "Lex Fridman Podcast", websiteUrl: "https://lexfridman.com/podcast/" },
  { name: "No Priors", websiteUrl: "https://www.nopriors.com/" },
  { name: "The 80,000 Hours Podcast", websiteUrl: "https://80000hours.org/podcast/" },
  { name: "The a16z Show", websiteUrl: "https://a16z.com/podcasts/" },
  { name: "The Cognitive Revolution", websiteUrl: "https://www.cognitiverevolution.ai/" },
  { name: "The Logan Bartlett Show", websiteUrl: "https://www.loganbartlett.com/podcast" },
  { name: "The MAD Podcast", websiteUrl: "https://www.madpod.com/" },
  { name: "The OpenAI Podcast", websiteUrl: "https://openai.com/podcast/" },
  { name: "Uncapped", websiteUrl: "https://uncapped.com/podcast" },
  { name: "Y Combinator Startup Podcast", websiteUrl: "https://www.ycombinator.com/podcast" },
]

// Known RSS feed patterns to try
const RSS_PATTERNS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss/',
  '/feed.xml',
  '/rss.xml',
  '/podcast.xml',
  '/podcast/feed',
  '/podcast/rss',
  '/index.xml',
  '/atom.xml',
]

// Known RSS feeds from podcast directories (Apple Podcasts, etc.)
// Updated with verified URLs from web searches
const KNOWN_FEEDS: Record<string, string> = {
  // Verified working feeds
  "20 VC": "https://thetwentyminutevc.libsyn.com/rss",
  "BG2 Pod": "https://anchor.fm/s/f06c2370/podcast/rss",
  "Lex Fridman Podcast": "https://lexfridman.com/feed/podcast/",
  "Hard Fork": "https://feeds.simplecast.com/l2i9YnTd",
  "No Priors": "https://feeds.megaphone.fm/nopriors",
  "The a16z Show": "https://feeds.simplecast.com/JGE3yC0V",
  "Google DeepMind: The Podcast": "https://feeds.simplecast.com/JT6pbPkg",
  "The Logan Bartlett Show": "https://theloganbartlettshow.simplecast.com/rss",
  "The MAD Podcast": "https://anchor.fm/s/f2ee4948/podcast/rss",
  "Y Combinator Startup Podcast": "https://anchor.fm/s/8c1524bc/podcast/rss",
  "The 80,000 Hours Podcast": "https://feeds.transistor.fm/the-80000-hours-podcast",
}

interface DiscoveryResult {
  name: string
  websiteUrl: string
  feedUrl: string | null
  feedDiscoveryMethod: string | null
  feedValid: boolean
  feedTitle: string | null
  episodeCount: number
  latestEpisodeDate: string | null
  latestEpisodeTitle: string | null
  hasTranscriptTag: boolean
  transcriptTagCount: number
  sampleTranscriptUrl: string | null
  error: string | null
}

const parser = new Parser({
  customFields: {
    item: [
      ['podcast:transcript', 'podcastTranscript', { keepArray: true }],
      ['itunes:duration', 'duration'],
      ['enclosure', 'enclosure'],
    ],
  },
})

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DisruptionIntel/1.0 (Podcast Discovery)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

async function discoverFeedFromHTML(websiteUrl: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(websiteUrl)
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    // Look for RSS/Atom link tags
    const rssLinks = $('link[type="application/rss+xml"], link[type="application/atom+xml"]')

    for (let i = 0; i < rssLinks.length; i++) {
      const href = $(rssLinks[i]).attr('href')
      if (href) {
        // Handle relative URLs
        if (href.startsWith('/')) {
          const baseUrl = new URL(websiteUrl)
          return `${baseUrl.origin}${href}`
        }
        return href
      }
    }

    // Look for common RSS link patterns in anchor tags
    const rssAnchors = $('a[href*="feed"], a[href*="rss"], a[href*=".xml"]')
    for (let i = 0; i < rssAnchors.length; i++) {
      const href = $(rssAnchors[i]).attr('href')
      const text = $(rssAnchors[i]).text().toLowerCase()
      if (href && (text.includes('rss') || text.includes('feed') || text.includes('subscribe'))) {
        if (href.startsWith('/')) {
          const baseUrl = new URL(websiteUrl)
          return `${baseUrl.origin}${href}`
        }
        if (href.startsWith('http')) {
          return href
        }
      }
    }

    return null
  } catch (error) {
    console.error(`  Error fetching ${websiteUrl}:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function tryCommonPatterns(websiteUrl: string): Promise<string | null> {
  const baseUrl = new URL(websiteUrl)

  for (const pattern of RSS_PATTERNS) {
    const feedUrl = `${baseUrl.origin}${pattern}`
    try {
      const response = await fetchWithTimeout(feedUrl, 5000)
      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const text = await response.text()

        // Check if it looks like RSS/XML
        if (
          contentType.includes('xml') ||
          contentType.includes('rss') ||
          text.includes('<rss') ||
          text.includes('<feed') ||
          text.includes('<channel')
        ) {
          return feedUrl
        }
      }
    } catch {
      // Continue to next pattern
    }
  }

  return null
}

async function validateFeed(feedUrl: string): Promise<{
  valid: boolean
  title: string | null
  episodeCount: number
  latestEpisodeDate: string | null
  latestEpisodeTitle: string | null
  hasTranscriptTag: boolean
  transcriptTagCount: number
  sampleTranscriptUrl: string | null
  error: string | null
}> {
  try {
    const feed = await parser.parseURL(feedUrl)

    let transcriptCount = 0
    let sampleTranscriptUrl: string | null = null

    // Check episodes for transcript tags
    for (const item of feed.items.slice(0, 10)) {
      const transcripts = (item as any).podcastTranscript
      if (transcripts && Array.isArray(transcripts) && transcripts.length > 0) {
        transcriptCount++
        if (!sampleTranscriptUrl && transcripts[0]?.$?.url) {
          sampleTranscriptUrl = transcripts[0].$.url
        }
      }
    }

    const latestItem = feed.items[0]

    return {
      valid: true,
      title: feed.title || null,
      episodeCount: feed.items.length,
      latestEpisodeDate: latestItem?.pubDate || latestItem?.isoDate || null,
      latestEpisodeTitle: latestItem?.title || null,
      hasTranscriptTag: transcriptCount > 0,
      transcriptTagCount: transcriptCount,
      sampleTranscriptUrl,
      error: null,
    }
  } catch (error) {
    return {
      valid: false,
      title: null,
      episodeCount: 0,
      latestEpisodeDate: null,
      latestEpisodeTitle: null,
      hasTranscriptTag: false,
      transcriptTagCount: 0,
      sampleTranscriptUrl: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function discoverPodcast(podcast: { name: string; websiteUrl: string }): Promise<DiscoveryResult> {
  console.log(`\n🔍 Discovering: ${podcast.name}`)
  console.log(`   Website: ${podcast.websiteUrl}`)

  let feedUrl: string | null = null
  let discoveryMethod: string | null = null

  // 1. Check known feeds first
  if (KNOWN_FEEDS[podcast.name]) {
    feedUrl = KNOWN_FEEDS[podcast.name]
    discoveryMethod = 'known_feed'
    console.log(`   ✓ Using known feed URL`)
  }

  // 2. Try HTML discovery
  if (!feedUrl) {
    console.log(`   Checking HTML for RSS links...`)
    feedUrl = await discoverFeedFromHTML(podcast.websiteUrl)
    if (feedUrl) {
      discoveryMethod = 'html_link_tag'
      console.log(`   ✓ Found via HTML link tag`)
    }
  }

  // 3. Try common URL patterns
  if (!feedUrl) {
    console.log(`   Trying common URL patterns...`)
    feedUrl = await tryCommonPatterns(podcast.websiteUrl)
    if (feedUrl) {
      discoveryMethod = 'url_pattern'
      console.log(`   ✓ Found via URL pattern`)
    }
  }

  // 4. Validate the feed if found
  if (feedUrl) {
    console.log(`   Feed URL: ${feedUrl}`)
    console.log(`   Validating feed...`)
    const validation = await validateFeed(feedUrl)

    if (validation.valid) {
      console.log(`   ✅ Valid feed: "${validation.title}" (${validation.episodeCount} episodes)`)
      if (validation.hasTranscriptTag) {
        console.log(`   📝 Transcript tags found: ${validation.transcriptTagCount}/10 recent episodes`)
      } else {
        console.log(`   ⚠️  No podcast:transcript tags found`)
      }

      return {
        name: podcast.name,
        websiteUrl: podcast.websiteUrl,
        feedUrl,
        feedDiscoveryMethod: discoveryMethod,
        feedValid: true,
        feedTitle: validation.title,
        episodeCount: validation.episodeCount,
        latestEpisodeDate: validation.latestEpisodeDate,
        latestEpisodeTitle: validation.latestEpisodeTitle,
        hasTranscriptTag: validation.hasTranscriptTag,
        transcriptTagCount: validation.transcriptTagCount,
        sampleTranscriptUrl: validation.sampleTranscriptUrl,
        error: null,
      }
    } else {
      console.log(`   ❌ Feed validation failed: ${validation.error}`)
      return {
        name: podcast.name,
        websiteUrl: podcast.websiteUrl,
        feedUrl,
        feedDiscoveryMethod: discoveryMethod,
        feedValid: false,
        feedTitle: null,
        episodeCount: 0,
        latestEpisodeDate: null,
        latestEpisodeTitle: null,
        hasTranscriptTag: false,
        transcriptTagCount: 0,
        sampleTranscriptUrl: null,
        error: validation.error,
      }
    }
  }

  console.log(`   ❌ No RSS feed found`)
  return {
    name: podcast.name,
    websiteUrl: podcast.websiteUrl,
    feedUrl: null,
    feedDiscoveryMethod: null,
    feedValid: false,
    feedTitle: null,
    episodeCount: 0,
    latestEpisodeDate: null,
    latestEpisodeTitle: null,
    hasTranscriptTag: false,
    transcriptTagCount: 0,
    sampleTranscriptUrl: null,
    error: 'No RSS feed discovered',
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  PODCAST RSS FEED DISCOVERY - Disruption Intel')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`\nDiscovering feeds for ${PODCASTS.length} podcasts...\n`)

  const results: DiscoveryResult[] = []

  for (const podcast of PODCASTS) {
    const result = await discoverPodcast(podcast)
    results.push(result)

    // Small delay to be respectful to servers
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  DISCOVERY REPORT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const successful = results.filter(r => r.feedValid)
  const withTranscripts = results.filter(r => r.hasTranscriptTag)
  const failed = results.filter(r => !r.feedValid)

  console.log(`📊 Summary:`)
  console.log(`   Total podcasts: ${results.length}`)
  console.log(`   Feeds discovered: ${successful.length}`)
  console.log(`   With transcript tags: ${withTranscripts.length}`)
  console.log(`   Failed/Not found: ${failed.length}`)

  console.log(`\n✅ Successfully Discovered (${successful.length}):`)
  console.log('─────────────────────────────────────────────────────────────────')
  for (const r of successful) {
    const transcriptStatus = r.hasTranscriptTag ? `📝 ${r.transcriptTagCount}/10` : '⚠️ No transcripts'
    console.log(`   ${r.name}`)
    console.log(`      Feed: ${r.feedUrl}`)
    console.log(`      Episodes: ${r.episodeCount} | Transcripts: ${transcriptStatus}`)
    console.log(`      Latest: ${r.latestEpisodeTitle?.substring(0, 50)}...`)
    console.log('')
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed/Not Found (${failed.length}):`)
    console.log('─────────────────────────────────────────────────────────────────')
    for (const r of failed) {
      console.log(`   ${r.name}`)
      console.log(`      Website: ${r.websiteUrl}`)
      console.log(`      Error: ${r.error}`)
      console.log('')
    }
  }

  // Save results to JSON
  const outputPath = path.join(__dirname, 'podcast-discovery-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n📁 Full results saved to: ${outputPath}`)

  // Save CSV for easy viewing
  const csvPath = path.join(__dirname, 'podcast-discovery-results.csv')
  const csvHeader = 'Name,Website URL,Feed URL,Valid,Episode Count,Has Transcripts,Transcript Count,Latest Episode,Error\n'
  const csvRows = results.map(r =>
    `"${r.name}","${r.websiteUrl}","${r.feedUrl || ''}",${r.feedValid},${r.episodeCount},${r.hasTranscriptTag},${r.transcriptTagCount},"${r.latestEpisodeTitle?.replace(/"/g, '""') || ''}","${r.error || ''}"`
  ).join('\n')
  fs.writeFileSync(csvPath, csvHeader + csvRows)
  console.log(`📁 CSV saved to: ${csvPath}`)

  return results
}

main().catch(console.error)
