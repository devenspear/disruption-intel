/**
 * Twitter/X Ingestion Module using TwitterAPI.io
 *
 * Handles fetching tweets from users or search queries
 * for the Disruption Intel platform.
 */

import { logger } from '@/lib/logger'
import * as cheerio from 'cheerio'

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter'

/**
 * Fetch full article content from a Twitter Article URL using Jina AI Reader
 * This handles JavaScript-rendered pages like X.com articles
 *
 * Twitter Articles are long-form posts stored at URLs like:
 * https://x.com/i/article/2000566143803686919
 * or directly on the tweet URL like:
 * https://x.com/alexwg/status/2000567264353927485
 */
async function fetchArticleWithJinaReader(url: string): Promise<string | null> {
  const FETCH_TIMEOUT_MS = 15000 // 15 seconds for Jina - it needs time to render JS

  try {
    logger.info('twitter', 'fetchArticleWithJinaReader', `Fetching via Jina Reader: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    // Jina AI Reader - free service that renders JS and extracts content
    const jinaUrl = `https://r.jina.ai/${url}`

    let response: Response
    try {
      response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      logger.warn('twitter', 'fetchArticleWithJinaReader', `Jina Reader failed: ${response.status}`)
      return null
    }

    const content = await response.text()

    // Jina returns markdown - clean it up
    if (content && content.length > 100) {
      // Remove any jina-specific headers/footers
      const cleaned = content
        .replace(/^Title:.*\n/m, '')
        .replace(/^URL Source:.*\n/m, '')
        .replace(/^Markdown Content:\n/m, '')
        .trim()

      logger.info('twitter', 'fetchArticleWithJinaReader', `Got content: ${cleaned.length} chars`)
      return cleaned
    }

    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('twitter', 'fetchArticleWithJinaReader', `Timeout after 15s: ${url}`)
    } else {
      logger.warn('twitter', 'fetchArticleWithJinaReader', `Error: ${error}`)
    }
    return null
  }
}

/**
 * Fetch full article content from a Twitter Article URL
 * Tries multiple methods in order:
 * 1. Jina AI Reader (handles JS rendering)
 * 2. Direct HTML scraping (fallback)
 *
 * NOTE: X.com often blocks/rate-limits scraping requests, so we use timeouts
 * and fall back to preview text if all methods fail.
 */
export async function fetchArticleContent(articleUrl: string): Promise<string | null> {
  // First try Jina Reader - best for JS-rendered content like Twitter Articles
  const jinaContent = await fetchArticleWithJinaReader(articleUrl)
  if (jinaContent && jinaContent.length > 200) {
    return jinaContent
  }

  // Fallback: Try direct scraping with short timeout
  const FETCH_TIMEOUT_MS = 5000

  try {
    logger.info('twitter', 'fetchArticleContent', `Trying direct fetch: ${articleUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      logger.warn('twitter', 'fetchArticleContent', `Direct fetch failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try to extract article content from various selectors
    let content = ''

    // Try article tag
    const articleTag = $('article').text().trim()
    if (articleTag && articleTag.length > 100) {
      content = articleTag
    }

    // Try main content area
    if (!content) {
      const mainContent = $('[data-testid="tweetText"]').text().trim()
      if (mainContent && mainContent.length > 100) {
        content = mainContent
      }
    }

    // Try extracting from script tags with JSON data
    if (!content) {
      $('script').each((_, el) => {
        const scriptContent = $(el).html() || ''
        if (scriptContent.includes('"article_results"') || scriptContent.includes('"body_text"')) {
          try {
            const jsonMatch = scriptContent.match(/\{[\s\S]*"body_text"[\s\S]*\}/)
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0])
              if (data.body_text) {
                content = data.body_text
              }
            }
          } catch {
            // JSON parsing failed, continue
          }
        }
      })
    }

    if (content && content.length > 100) {
      logger.info('twitter', 'fetchArticleContent', `Direct fetch got: ${content.length} chars`)
      return content
    }

    logger.warn('twitter', 'fetchArticleContent', 'Could not extract article content')
    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('twitter', 'fetchArticleContent', `Timeout after 5s: ${articleUrl}`)
    } else {
      logger.error('twitter', 'fetchArticleContent', `Error: ${error}`)
    }
    return null
  }
}

export interface Tweet {
  id: string
  text: string
  createdAt: Date
  author: {
    id: string
    userName: string
    name: string
    profileImageUrl?: string
  }
  metrics: {
    likes: number
    retweets: number
    replies: number
    quotes: number
  }
  url: string
  isRetweet: boolean
  isReply: boolean
  quotedTweet?: {
    id: string
    text: string
    author: string
  }
  media?: Array<{
    type: string
    url: string
  }>
  article?: {
    title: string
    previewText: string
    articleUrl?: string
    coverImageUrl?: string
  }
}

export interface TwitterUser {
  id: string
  userName: string
  name: string
  description: string
  profileImageUrl?: string
  followersCount: number
  followingCount: number
  tweetCount: number
  verified: boolean
}

interface RawTweet {
  id: string
  text: string
  created_at?: string
  createdAt?: string  // API uses createdAt not created_at
  author?: {
    id: string
    userName: string
    name: string
    profilePicUrl?: string
    profilePicture?: string  // API uses profilePicture not profilePicUrl
  }
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  quoteCount?: number
  viewCount?: number
  isRetweet?: boolean
  isReply?: boolean
  quoted_tweet?: {
    id: string
    text: string
    author?: { userName: string }
  }
  retweeted_tweet?: RawTweet | null
  media?: Array<{
    type: string
    url: string
  }>
  article?: {
    title: string
    preview_text: string
    cover_media_img_url?: string
  }
  entities?: {
    urls?: Array<{
      display_url: string
      expanded_url: string
      url: string
    }>
  }
}

interface TwitterAPIResponse {
  status?: string
  code?: number
  msg?: string
  data?: {
    pin_tweet?: RawTweet | null
    tweets?: RawTweet[]
  }
  // Some endpoints return tweets directly
  tweets?: RawTweet[]
  has_next_page?: boolean
  next_cursor?: string
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.TWITTER_API_KEY
  if (!apiKey) {
    throw new Error('TWITTER_API_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Make a request to TwitterAPI.io
 */
async function makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey()
  const url = new URL(`${TWITTER_API_BASE}${endpoint}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`TwitterAPI request failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Parse TwitterAPI response into our Tweet format
 */
function parseTweet(rawTweet: RawTweet): Tweet {
  // Handle both createdAt (new API) and created_at (old API) formats
  const createdAtStr = rawTweet.createdAt || rawTweet.created_at || new Date().toISOString()
  const profileImageUrl = rawTweet.author?.profilePicture || rawTweet.author?.profilePicUrl

  // Check if this is a retweet by looking at retweeted_tweet field
  const isRetweet = rawTweet.isRetweet || !!rawTweet.retweeted_tweet

  // Extract article URL from entities if present
  let articleUrl: string | undefined
  if (rawTweet.entities?.urls) {
    const articleUrlEntity = rawTweet.entities.urls.find(
      u => u.expanded_url?.includes('/article/') || u.display_url?.includes('/article/')
    )
    articleUrl = articleUrlEntity?.expanded_url
  }

  // Parse article content if present
  const article = rawTweet.article ? {
    title: rawTweet.article.title,
    previewText: rawTweet.article.preview_text,
    articleUrl,
    coverImageUrl: rawTweet.article.cover_media_img_url,
  } : undefined

  return {
    id: rawTweet.id,
    text: rawTweet.text,
    createdAt: new Date(createdAtStr),
    author: {
      id: rawTweet.author?.id || '',
      userName: rawTweet.author?.userName || '',
      name: rawTweet.author?.name || '',
      profileImageUrl,
    },
    metrics: {
      likes: rawTweet.likeCount || 0,
      retweets: rawTweet.retweetCount || 0,
      replies: rawTweet.replyCount || 0,
      quotes: rawTweet.quoteCount || 0,
    },
    url: `https://x.com/${rawTweet.author?.userName}/status/${rawTweet.id}`,
    isRetweet,
    isReply: rawTweet.isReply || false,
    quotedTweet: rawTweet.quoted_tweet ? {
      id: rawTweet.quoted_tweet.id,
      text: rawTweet.quoted_tweet.text,
      author: rawTweet.quoted_tweet.author?.userName || '',
    } : undefined,
    media: rawTweet.media,
    article,
  }
}

/**
 * Get recent tweets from a specific user
 */
export async function getUserTweets(
  userName: string,
  limit: number = 20
): Promise<Tweet[]> {
  try {
    logger.info('twitter', 'getUserTweets', `Fetching tweets for @${userName}`, {
      metadata: { userName, limit },
    })

    const response = await makeRequest<TwitterAPIResponse>('/user/last_tweets', {
      userName,
      // Note: limit may not be directly supported - API returns recent tweets
    })

    // Handle both response structures: data.tweets (new) and tweets (old)
    const rawTweets = response.data?.tweets || response.tweets

    if (!rawTweets || rawTweets.length === 0) {
      logger.warn('twitter', 'getUserTweets', `No tweets found for @${userName}`)
      return []
    }

    const tweets = rawTweets
      .slice(0, limit)
      .map(parseTweet)
      .filter(tweet => !tweet.isRetweet) // Filter out retweets by default

    logger.info('twitter', 'getUserTweets', `Found ${tweets.length} tweets for @${userName}`)
    return tweets
  } catch (error) {
    logger.error('twitter', 'getUserTweets', `Failed to fetch tweets: ${error}`, {
      metadata: { userName, error: String(error) },
    })
    throw error
  }
}

/**
 * Search for tweets using advanced search
 */
export async function searchTweets(
  query: string,
  queryType: 'Latest' | 'Top' = 'Latest',
  limit: number = 20
): Promise<Tweet[]> {
  try {
    logger.info('twitter', 'searchTweets', `Searching tweets: ${query}`, {
      metadata: { query, queryType, limit },
    })

    const response = await makeRequest<TwitterAPIResponse>('/tweet/advanced_search', {
      query,
      queryType,
    })

    // Handle both response structures: data.tweets (new) and tweets (old)
    const rawTweets = response.data?.tweets || response.tweets

    if (!rawTweets || rawTweets.length === 0) {
      logger.warn('twitter', 'searchTweets', `No tweets found for query: ${query}`)
      return []
    }

    const tweets = rawTweets
      .slice(0, limit)
      .map(parseTweet)

    logger.info('twitter', 'searchTweets', `Found ${tweets.length} tweets for query: ${query}`)
    return tweets
  } catch (error) {
    logger.error('twitter', 'searchTweets', `Failed to search tweets: ${error}`, {
      metadata: { query, error: String(error) },
    })
    throw error
  }
}

/**
 * Get user profile information
 */
export async function getUserProfile(userName: string): Promise<TwitterUser | null> {
  try {
    const response = await makeRequest<{
      id: string
      userName: string
      name: string
      description: string
      profilePicUrl?: string
      followersCount: number
      followingCount: number
      statusesCount: number
      verified: boolean
    }>('/user/info', { userName })

    return {
      id: response.id,
      userName: response.userName,
      name: response.name,
      description: response.description,
      profileImageUrl: response.profilePicUrl,
      followersCount: response.followersCount,
      followingCount: response.followingCount,
      tweetCount: response.statusesCount,
      verified: response.verified,
    }
  } catch (error) {
    logger.error('twitter', 'getUserProfile', `Failed to fetch user profile: ${error}`, {
      metadata: { userName, error: String(error) },
    })
    return null
  }
}

/**
 * Parse a Twitter source URL to determine the type and target
 * Supports:
 * - https://x.com/username - fetch user tweets
 * - https://twitter.com/username - fetch user tweets
 * - @username - fetch user tweets
 * - search:query - search tweets
 * - from:username - get tweets from specific user
 */
export function parseTwitterSource(sourceUrl: string): {
  type: 'user' | 'search'
  target: string
} {
  const trimmed = sourceUrl.trim()

  // Full X.com URL: https://x.com/username or https://x.com/username/...
  const xUrlMatch = trimmed.match(/^https?:\/\/(?:www\.)?x\.com\/([^\/\?]+)/)
  if (xUrlMatch) {
    return { type: 'user', target: xUrlMatch[1] }
  }

  // Full Twitter.com URL: https://twitter.com/username
  const twitterUrlMatch = trimmed.match(/^https?:\/\/(?:www\.)?twitter\.com\/([^\/\?]+)/)
  if (twitterUrlMatch) {
    return { type: 'user', target: twitterUrlMatch[1] }
  }

  // @username format
  if (trimmed.startsWith('@')) {
    return { type: 'user', target: trimmed.slice(1) }
  }

  // search:query format
  if (trimmed.toLowerCase().startsWith('search:')) {
    return { type: 'search', target: trimmed.slice(7).trim() }
  }

  // from:username format (convert to user type)
  if (trimmed.toLowerCase().startsWith('from:')) {
    return { type: 'user', target: trimmed.slice(5).trim() }
  }

  // Default: treat as username
  return { type: 'user', target: trimmed }
}

/**
 * Fetch tweets based on source configuration
 */
export async function fetchTweetsFromSource(
  sourceUrl: string,
  limit: number = 20
): Promise<Tweet[]> {
  const { type, target } = parseTwitterSource(sourceUrl)

  if (type === 'user') {
    return getUserTweets(target, limit)
  } else {
    return searchTweets(target, 'Latest', limit)
  }
}
