/**
 * Twitter/X Ingestion Module using TwitterAPI.io
 *
 * Handles fetching tweets from users or search queries
 * for the Disruption Intel platform.
 */

import { logger } from '@/lib/logger'

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter'

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
  created_at: string
  author?: {
    id: string
    userName: string
    name: string
    profilePicUrl?: string
  }
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  quoteCount?: number
  isRetweet?: boolean
  isReply?: boolean
  quoted_tweet?: {
    id: string
    text: string
    author?: { userName: string }
  }
  media?: Array<{
    type: string
    url: string
  }>
}

interface TwitterAPIResponse {
  tweets?: RawTweet[]
  status?: string
  msg?: string
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
  return {
    id: rawTweet.id,
    text: rawTweet.text,
    createdAt: new Date(rawTweet.created_at),
    author: {
      id: rawTweet.author?.id || '',
      userName: rawTweet.author?.userName || '',
      name: rawTweet.author?.name || '',
      profileImageUrl: rawTweet.author?.profilePicUrl,
    },
    metrics: {
      likes: rawTweet.likeCount || 0,
      retweets: rawTweet.retweetCount || 0,
      replies: rawTweet.replyCount || 0,
      quotes: rawTweet.quoteCount || 0,
    },
    url: `https://x.com/${rawTweet.author?.userName}/status/${rawTweet.id}`,
    isRetweet: rawTweet.isRetweet || false,
    isReply: rawTweet.isReply || false,
    quotedTweet: rawTweet.quoted_tweet ? {
      id: rawTweet.quoted_tweet.id,
      text: rawTweet.quoted_tweet.text,
      author: rawTweet.quoted_tweet.author?.userName || '',
    } : undefined,
    media: rawTweet.media,
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

    if (!response.tweets || response.tweets.length === 0) {
      logger.warn('twitter', 'getUserTweets', `No tweets found for @${userName}`)
      return []
    }

    const tweets = response.tweets
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

    if (!response.tweets || response.tweets.length === 0) {
      logger.warn('twitter', 'searchTweets', `No tweets found for query: ${query}`)
      return []
    }

    const tweets = response.tweets
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
