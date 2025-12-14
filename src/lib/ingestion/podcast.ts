/**
 * Podcast RSS Feed Ingestion Module
 *
 * Handles parsing podcast RSS feeds, discovering episodes,
 * and extracting metadata for the Disruption Intel platform.
 */

import Parser from 'rss-parser'

// Types for podcast data
export interface PodcastEpisode {
  guid: string
  title: string
  description: string
  publishedAt: Date
  duration: number // in seconds
  audioUrl: string
  episodeUrl: string
  imageUrl?: string
  transcriptUrl?: string // From <podcast:transcript> tag if available
}

export interface PodcastFeed {
  title: string
  description: string
  author: string
  imageUrl?: string
  feedUrl: string
  websiteUrl: string
  language?: string
  episodeCount: number
  latestEpisodeDate?: Date
}

export interface PodcastFeedWithEpisodes extends PodcastFeed {
  episodes: PodcastEpisode[]
}

// Custom RSS parser with podcast namespace support
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parser = new Parser<any, any>({
  customFields: {
    feed: [
      ['itunes:author', 'itunesAuthor'],
      ['itunes:image', 'itunesImage'],
      ['language', 'language'],
    ] as unknown as string[],
    item: [
      ['podcast:transcript', 'podcastTranscript', { keepArray: true }],
      ['itunes:duration', 'itunesDuration'],
      ['itunes:image', 'itunesImage'],
      ['itunes:episode', 'itunesEpisode'],
      ['enclosure', 'enclosure'],
    ] as unknown as string[],
  },
})

/**
 * Parse duration string to seconds
 * Handles formats: "1:23:45", "23:45", "1234" (seconds)
 */
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0

  // If it's just a number, assume seconds
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10)
  }

  // Parse HH:MM:SS or MM:SS format
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }

  return 0
}

/**
 * Extract transcript URL from podcast:transcript tags
 */
function extractTranscriptUrl(transcriptTags: any[] | undefined): string | null {
  if (!transcriptTags || !Array.isArray(transcriptTags)) return null

  // Look for text/plain or text/html transcripts first
  for (const tag of transcriptTags) {
    const attrs = tag.$ || tag
    if (attrs?.url) {
      const type = attrs.type?.toLowerCase() || ''
      // Prefer plain text, then HTML
      if (type.includes('text/plain') || type.includes('text/html')) {
        return attrs.url
      }
    }
  }

  // Fall back to any transcript URL
  for (const tag of transcriptTags) {
    const attrs = tag.$ || tag
    if (attrs?.url) {
      return attrs.url
    }
  }

  return null
}

/**
 * Parse a podcast RSS feed and return feed metadata with episodes
 */
export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeedWithEpisodes> {
  const feed = await parser.parseURL(feedUrl)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const episodes: PodcastEpisode[] = feed.items.map((item: any) => {
    const itemAny = item

    // Get audio URL from enclosure
    let audioUrl = ''
    if (itemAny.enclosure?.url) {
      audioUrl = itemAny.enclosure.url
    } else if (item.enclosure?.url) {
      audioUrl = item.enclosure.url
    }

    // Get episode URL (link to episode page)
    const episodeUrl = item.link || ''

    // Get image URL
    let imageUrl: string | undefined
    if (itemAny.itunesImage?.href) {
      imageUrl = itemAny.itunesImage.href
    } else if (typeof itemAny.itunesImage === 'string') {
      imageUrl = itemAny.itunesImage
    }

    // Get transcript URL if available
    const transcriptUrl = extractTranscriptUrl(itemAny.podcastTranscript)

    // Parse published date
    let publishedAt = new Date()
    if (item.pubDate) {
      publishedAt = new Date(item.pubDate)
    } else if (item.isoDate) {
      publishedAt = new Date(item.isoDate)
    }

    return {
      guid: item.guid || item.link || `${feedUrl}-${item.title}`,
      title: item.title || 'Untitled Episode',
      description: item.contentSnippet || item.content || '',
      publishedAt,
      duration: parseDuration(itemAny.itunesDuration),
      audioUrl,
      episodeUrl,
      imageUrl,
      transcriptUrl,
    }
  })

  // Sort episodes by date (newest first)
  episodes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  // Get feed-level image
  const feedAny = feed as any
  let feedImageUrl: string | undefined
  if (feedAny.itunesImage?.href) {
    feedImageUrl = feedAny.itunesImage.href
  } else if (typeof feedAny.itunesImage === 'string') {
    feedImageUrl = feedAny.itunesImage
  } else if (feed.image?.url) {
    feedImageUrl = feed.image.url
  }

  return {
    title: feed.title || 'Unknown Podcast',
    description: feed.description || '',
    author: feedAny.itunesAuthor || feed.creator || '',
    imageUrl: feedImageUrl,
    feedUrl,
    websiteUrl: feed.link || '',
    language: feedAny.language || 'en',
    episodeCount: episodes.length,
    latestEpisodeDate: episodes[0]?.publishedAt,
    episodes,
  }
}

/**
 * Get latest episodes from a podcast feed
 */
export async function getLatestEpisodes(
  feedUrl: string,
  limit: number = 10
): Promise<PodcastEpisode[]> {
  const feed = await parsePodcastFeed(feedUrl)
  return feed.episodes.slice(0, limit)
}

/**
 * Fetch transcript content from a URL
 * Returns null if fetch fails or content is empty
 */
export async function fetchTranscriptFromUrl(transcriptUrl: string): Promise<string | null> {
  try {
    const response = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'DisruptionIntel/1.0',
        Accept: 'text/plain, text/html, text/vtt, application/json, */*',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch transcript from ${transcriptUrl}: ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    if (!text || text.trim().length === 0) {
      return null
    }

    // Handle different transcript formats
    if (contentType.includes('text/vtt') || text.startsWith('WEBVTT')) {
      return parseVTT(text)
    } else if (contentType.includes('application/json')) {
      return parseJSONTranscript(text)
    } else if (contentType.includes('text/html')) {
      return stripHTML(text)
    }

    // Plain text - return as-is
    return text.trim()
  } catch (error) {
    console.error(`Error fetching transcript from ${transcriptUrl}:`, error)
    return null
  }
}

/**
 * Parse VTT/WebVTT format transcript to plain text
 */
function parseVTT(vttContent: string): string {
  const lines = vttContent.split('\n')
  const textLines: string[] = []

  let inCue = false
  for (const line of lines) {
    const trimmed = line.trim()

    // Skip WEBVTT header and empty lines
    if (trimmed === 'WEBVTT' || trimmed === '') {
      inCue = false
      continue
    }

    // Skip timestamp lines
    if (trimmed.includes('-->')) {
      inCue = true
      continue
    }

    // Skip cue identifiers (lines that are just numbers)
    if (/^\d+$/.test(trimmed)) {
      continue
    }

    // Collect text content
    if (inCue && trimmed) {
      // Remove VTT tags like <v Speaker>
      const cleanText = trimmed.replace(/<[^>]+>/g, '')
      if (cleanText) {
        textLines.push(cleanText)
      }
    }
  }

  return textLines.join(' ')
}

/**
 * Parse JSON transcript format to plain text
 */
function parseJSONTranscript(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent)

    // Handle various JSON transcript formats
    if (Array.isArray(data)) {
      // Array of segments
      return data
        .map((segment) => segment.text || segment.content || segment.transcript || '')
        .filter(Boolean)
        .join(' ')
    } else if (data.segments) {
      // Object with segments array
      return data.segments
        .map((segment: any) => segment.text || segment.content || '')
        .filter(Boolean)
        .join(' ')
    } else if (data.transcript) {
      // Object with transcript field
      return data.transcript
    } else if (data.text) {
      // Object with text field
      return data.text
    }

    return ''
  } catch {
    return ''
  }
}

/**
 * Strip HTML tags from content
 */
function stripHTML(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Replace br and p tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n')

  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ')

  return text.trim()
}

/**
 * Validate that a feed URL is accessible and parseable
 */
export async function validatePodcastFeed(
  feedUrl: string
): Promise<{ valid: boolean; error?: string; feed?: PodcastFeed }> {
  try {
    const feed = await parsePodcastFeed(feedUrl)

    if (!feed.title || feed.episodeCount === 0) {
      return {
        valid: false,
        error: 'Feed has no title or episodes',
      }
    }

    return {
      valid: true,
      feed: {
        title: feed.title,
        description: feed.description,
        author: feed.author,
        imageUrl: feed.imageUrl,
        feedUrl: feed.feedUrl,
        websiteUrl: feed.websiteUrl,
        language: feed.language,
        episodeCount: feed.episodeCount,
        latestEpisodeDate: feed.latestEpisodeDate,
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
