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
 * Fetch full article content from a Twitter Article URL
 * Twitter Articles are long-form posts stored at URLs like:
 * https://x.com/i/article/2000566143803686919
 */
export async function fetchArticleContent(articleUrl: string): Promise<string | null> {
  try {
    logger.info('twitter', 'fetchArticleContent', `Fetching article from ${articleUrl}`)

    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DisruptionRadar/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      logger.warn('twitter', 'fetchArticleContent', `Failed to fetch article: ${response.status}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try to extract article content from various selectors
    // Twitter Articles typically have content in article tags or specific data attributes
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
            // Try to extract JSON and find article body
            // Use [\s\S] instead of 's' flag for multiline matching
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
      logger.info('twitter', 'fetchArticleContent', `Fetched article content: ${content.length} chars`)
      return content
    }

    logger.warn('twitter', 'fetchArticleContent', 'Could not extract article content')
    return null
  } catch (error) {
    logger.error('twitter', 'fetchArticleContent', `Error fetching article: ${error}`)
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
