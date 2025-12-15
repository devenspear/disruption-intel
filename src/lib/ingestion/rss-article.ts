/**
 * RSS Article Feed Ingestion Module
 *
 * Handles parsing RSS/Atom feeds for blog posts and newsletters (e.g., Substack).
 * For articles, the content itself serves as the "transcript" for analysis.
 */

import Parser from 'rss-parser'

export interface RSSArticle {
  guid: string
  title: string
  description: string
  content: string // Full article content (HTML stripped)
  publishedAt: Date
  articleUrl: string
  author?: string
  imageUrl?: string
  wordCount: number
}

export interface RSSFeed {
  title: string
  description: string
  author?: string
  imageUrl?: string
  feedUrl: string
  websiteUrl: string
  language?: string
  articleCount: number
  latestArticleDate?: Date
}

export interface RSSFeedWithArticles extends RSSFeed {
  articles: RSSArticle[]
}

// RSS parser with extended fields for Substack and other newsletter platforms
const parser = new Parser<any, any>({
  customFields: {
    feed: [
      ['language', 'language'],
      ['dc:creator', 'creator'],
    ] as unknown as string[],
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
      ['author', 'author'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
    ] as unknown as string[],
  },
})

/**
 * Strip HTML tags and decode entities from content
 */
function stripHTML(html: string): string {
  if (!html) return ''

  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Replace br and p tags with newlines for better readability
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<li>/gi, '\n• ')

  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&rsquo;/g, "'")
  text = text.replace(/&lsquo;/g, "'")
  text = text.replace(/&rdquo;/g, '"')
  text = text.replace(/&ldquo;/g, '"')
  text = text.replace(/&mdash;/g, '—')
  text = text.replace(/&ndash;/g, '–')
  text = text.replace(/&hellip;/g, '...')
  text = text.replace(/&#\d+;/g, '') // Remove remaining numeric entities

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n')
  text = text.replace(/^\s+|\s+$/gm, '')

  return text.trim()
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Extract image URL from various RSS fields
 */
function extractImageUrl(item: any): string | undefined {
  // Try media:thumbnail
  if (item.mediaThumbnail?.$.url) {
    return item.mediaThumbnail.$.url
  }

  // Try media:content
  if (item.mediaContent?.$.url) {
    return item.mediaContent.$.url
  }

  // Try to extract first image from content
  const content = item.contentEncoded || item.content || ''
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgMatch) {
    return imgMatch[1]
  }

  return undefined
}

/**
 * Parse an RSS/Atom feed and return feed metadata with articles
 */
export async function parseRSSFeed(feedUrl: string): Promise<RSSFeedWithArticles> {
  const feed = await parser.parseURL(feedUrl)

  const articles: RSSArticle[] = feed.items.map((item: any) => {
    // Get full content - prefer content:encoded for full article
    const rawContent = item.contentEncoded || item.content || item.contentSnippet || ''
    const content = stripHTML(rawContent)
    const wordCount = countWords(content)

    // Get description (shorter summary)
    const description = item.contentSnippet || stripHTML(item.description || '').slice(0, 500)

    // Parse published date
    let publishedAt = new Date()
    if (item.pubDate) {
      publishedAt = new Date(item.pubDate)
    } else if (item.isoDate) {
      publishedAt = new Date(item.isoDate)
    }

    // Get author
    const author = item.dcCreator || item.creator || item.author || feed.creator

    return {
      guid: item.guid || item.id || item.link || `${feedUrl}-${item.title}`,
      title: item.title || 'Untitled Article',
      description,
      content,
      publishedAt,
      articleUrl: item.link || '',
      author,
      imageUrl: extractImageUrl(item),
      wordCount,
    }
  })

  // Sort articles by date (newest first)
  articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  // Get feed-level image
  let feedImageUrl: string | undefined
  if (feed.image?.url) {
    feedImageUrl = feed.image.url
  }

  return {
    title: feed.title || 'Unknown Feed',
    description: feed.description || '',
    author: feed.creator || '',
    imageUrl: feedImageUrl,
    feedUrl,
    websiteUrl: feed.link || '',
    language: (feed as any).language || 'en',
    articleCount: articles.length,
    latestArticleDate: articles[0]?.publishedAt,
    articles,
  }
}

/**
 * Get latest articles from an RSS feed
 */
export async function getLatestArticles(
  feedUrl: string,
  limit: number = 10
): Promise<RSSArticle[]> {
  const feed = await parseRSSFeed(feedUrl)
  return feed.articles.slice(0, limit)
}

/**
 * Validate that a feed URL is accessible and parseable
 */
export async function validateRSSFeed(
  feedUrl: string
): Promise<{ valid: boolean; error?: string; feed?: RSSFeed }> {
  try {
    const feed = await parseRSSFeed(feedUrl)

    if (!feed.title || feed.articleCount === 0) {
      return {
        valid: false,
        error: 'Feed has no title or articles',
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
        articleCount: feed.articleCount,
        latestArticleDate: feed.latestArticleDate,
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
