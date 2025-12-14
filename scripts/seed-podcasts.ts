/**
 * Podcast Seed Script
 *
 * Imports the 13 discovered podcast sources into the database
 * and fetches initial episodes (5 per podcast for testing).
 *
 * Usage: npx ts-node --esm scripts/seed-podcasts.ts
 */

import { PrismaClient } from '@prisma/client'
import { parsePodcastFeed, getLatestEpisodes, type PodcastEpisode } from '../src/lib/ingestion/podcast'

const prisma = new PrismaClient()

// Discovered podcast feeds from Sprint 0 discovery
const PODCAST_FEEDS = [
  {
    name: "20 VC",
    feedUrl: "https://thetwentyminutevc.libsyn.com/rss",
    websiteUrl: "https://www.thetwentyminutevc.com/",
  },
  {
    name: "BG2 Pod",
    feedUrl: "https://anchor.fm/s/f06c2370/podcast/rss",
    websiteUrl: "https://www.bg2pod.com/",
  },
  {
    name: "Big Technology Podcast",
    feedUrl: "https://www.bigtechnology.com/feed",
    websiteUrl: "https://www.bigtechnology.com/",
  },
  {
    name: "Dwarkesh Podcast",
    feedUrl: "https://api.substack.com/feed/podcast/69345.rss",
    websiteUrl: "https://www.dwarkeshpatel.com/podcast",
  },
  {
    name: "Google DeepMind: The Podcast",
    feedUrl: "https://feeds.simplecast.com/JT6pbPkg",
    websiteUrl: "https://deepmind.google/discover/podcast/",
  },
  {
    name: "Hard Fork",
    feedUrl: "https://feeds.simplecast.com/l2i9YnTd",
    websiteUrl: "https://www.nytimes.com/column/hard-fork",
  },
  {
    name: "Lenny's Podcast",
    feedUrl: "https://api.substack.com/feed/podcast/10845.rss",
    websiteUrl: "https://www.lennyspodcast.com/",
  },
  {
    name: "Lex Fridman Podcast",
    feedUrl: "https://lexfridman.com/feed/podcast/",
    websiteUrl: "https://lexfridman.com/podcast/",
  },
  {
    name: "No Priors",
    feedUrl: "https://feeds.megaphone.fm/nopriors",
    websiteUrl: "https://www.nopriors.com/",
  },
  {
    name: "The a16z Show",
    feedUrl: "https://feeds.simplecast.com/JGE3yC0V",
    websiteUrl: "https://a16z.com/podcasts/",
  },
  {
    name: "The Cognitive Revolution",
    feedUrl: "https://www.cognitiverevolution.ai/latest/rss/",
    websiteUrl: "https://www.cognitiverevolution.ai/",
  },
  {
    name: "The MAD Podcast",
    feedUrl: "https://anchor.fm/s/f2ee4948/podcast/rss",
    websiteUrl: "https://www.madpod.com/",
  },
  {
    name: "Y Combinator Startup Podcast",
    feedUrl: "https://anchor.fm/s/8c1524bc/podcast/rss",
    websiteUrl: "https://www.ycombinator.com/podcast",
  },
]

// Number of episodes to import per podcast (for initial testing)
const EPISODES_PER_PODCAST = 5

interface SeedResult {
  podcastName: string
  sourceId: string | null
  episodesImported: number
  errors: string[]
}

async function seedPodcast(podcast: typeof PODCAST_FEEDS[0]): Promise<SeedResult> {
  const result: SeedResult = {
    podcastName: podcast.name,
    sourceId: null,
    episodesImported: 0,
    errors: [],
  }

  try {
    console.log(`\n📻 Processing: ${podcast.name}`)
    console.log(`   Feed URL: ${podcast.feedUrl}`)

    // Check if source already exists
    const existingSource = await prisma.source.findFirst({
      where: {
        url: podcast.feedUrl,
        type: 'PODCAST',
      },
    })

    let source
    if (existingSource) {
      console.log(`   ⚠️ Source already exists (ID: ${existingSource.id})`)
      source = existingSource
    } else {
      // Validate feed first
      console.log(`   Validating feed...`)
      const feed = await parsePodcastFeed(podcast.feedUrl)

      // Create source
      source = await prisma.source.create({
        data: {
          name: podcast.name,
          type: 'PODCAST',
          url: podcast.feedUrl,
          checkFrequency: 'daily',
          isActive: true,
          metadata: {
            websiteUrl: podcast.websiteUrl,
            feedTitle: feed.title,
            author: feed.author,
            imageUrl: feed.imageUrl,
            language: feed.language,
            totalEpisodes: feed.episodeCount,
          },
        },
      })
      console.log(`   ✅ Created source (ID: ${source.id})`)
    }

    result.sourceId = source.id

    // Fetch episodes
    console.log(`   Fetching ${EPISODES_PER_PODCAST} episodes...`)
    const episodes = await getLatestEpisodes(podcast.feedUrl, EPISODES_PER_PODCAST)

    for (const episode of episodes) {
      try {
        // Check if episode already exists
        const existingContent = await prisma.content.findFirst({
          where: {
            sourceId: source.id,
            externalId: episode.guid,
          },
        })

        if (existingContent) {
          console.log(`   ⚠️ Episode already exists: ${episode.title.substring(0, 50)}...`)
          continue
        }

        // Create content entry
        await prisma.content.create({
          data: {
            sourceId: source.id,
            externalId: episode.guid,
            title: episode.title,
            description: episode.description,
            publishedAt: episode.publishedAt,
            duration: episode.duration,
            thumbnailUrl: episode.imageUrl,
            originalUrl: episode.episodeUrl,
            contentType: 'PODCAST_EPISODE',
            metadata: {
              audioUrl: episode.audioUrl,
              transcriptUrl: episode.transcriptUrl,
            },
            status: 'PENDING',
          },
        })

        result.episodesImported++
        console.log(`   ✅ Imported: ${episode.title.substring(0, 50)}...`)
      } catch (episodeError) {
        const errorMsg = episodeError instanceof Error ? episodeError.message : String(episodeError)
        result.errors.push(`Episode "${episode.title.substring(0, 30)}...": ${errorMsg}`)
        console.error(`   ❌ Error importing episode: ${errorMsg}`)
      }
    }

    console.log(`   📊 Imported ${result.episodesImported}/${episodes.length} episodes`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`Feed error: ${errorMsg}`)
    console.error(`   ❌ Error processing feed: ${errorMsg}`)
  }

  return result
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  PODCAST SEED SCRIPT - Disruption Intel')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`\nImporting ${PODCAST_FEEDS.length} podcasts with ${EPISODES_PER_PODCAST} episodes each...\n`)

  const results: SeedResult[] = []

  for (const podcast of PODCAST_FEEDS) {
    const result = await seedPodcast(podcast)
    results.push(result)

    // Small delay between podcasts to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  SEED SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const successful = results.filter(r => r.sourceId !== null)
  const totalEpisodes = results.reduce((sum, r) => sum + r.episodesImported, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  console.log(`📊 Summary:`)
  console.log(`   Podcasts processed: ${results.length}`)
  console.log(`   Sources created: ${successful.length}`)
  console.log(`   Episodes imported: ${totalEpisodes}`)
  console.log(`   Errors: ${totalErrors}`)

  console.log(`\n✅ Successfully Seeded:`)
  console.log('─────────────────────────────────────────────────────────────────')
  for (const r of successful) {
    console.log(`   ${r.podcastName}`)
    console.log(`      Source ID: ${r.sourceId}`)
    console.log(`      Episodes: ${r.episodesImported}`)
    if (r.errors.length > 0) {
      console.log(`      Errors: ${r.errors.length}`)
    }
    console.log('')
  }

  if (totalErrors > 0) {
    console.log(`\n⚠️ Errors:`)
    console.log('─────────────────────────────────────────────────────────────────')
    for (const r of results) {
      for (const error of r.errors) {
        console.log(`   ${r.podcastName}: ${error}`)
      }
    }
  }

  // Final stats from database
  const sourceCount = await prisma.source.count({ where: { type: 'PODCAST' } })
  const contentCount = await prisma.content.count({ where: { contentType: 'PODCAST_EPISODE' } })

  console.log(`\n📈 Database Stats:`)
  console.log(`   Total PODCAST sources: ${sourceCount}`)
  console.log(`   Total PODCAST_EPISODE content: ${contentCount}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
