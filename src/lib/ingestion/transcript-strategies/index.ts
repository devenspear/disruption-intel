/**
 * Transcript Strategy Orchestrator
 *
 * Implements a fallback chain for acquiring podcast transcripts:
 * 1. RSS transcript URL (from <podcast:transcript> tag)
 * 2. Page scraping (scrape episode page for transcript section)
 * 3. YouTube fallback (if podcast has YouTube mirror)
 * 4. Whisper ASR (download audio and transcribe with OpenAI Whisper)
 */

import { fetchRSSTranscript } from './rss-transcript'
import { scrapeTranscriptFromPage } from './page-scraper'
import { fetchYouTubeTranscript } from './youtube-fallback'
import { transcribeWithWhisper, isValidAudioUrl } from './whisper-asr'
import { logger } from '@/lib/logger'

export type TranscriptSource =
  | 'podcast_rss'
  | 'podcast_scraped'
  | 'youtube_auto'
  | 'youtube_fallback'
  | 'whisper_asr'
  | 'manual'
  | 'unavailable'

export interface TranscriptResult {
  fullText: string
  segments: TranscriptSegment[]
  language: string
  source: TranscriptSource
  wordCount: number
  confidence: 'high' | 'medium' | 'low'
}

export interface TranscriptSegment {
  start?: number
  duration?: number
  text: string
}

export interface TranscriptAcquisitionOptions {
  transcriptUrl?: string | null // From RSS feed
  episodeUrl?: string | null // For page scraping
  youtubeVideoId?: string | null // For YouTube fallback
  audioUrl?: string | null // For Whisper ASR transcription
  audioDuration?: number // Duration in seconds (for cost estimation)
  contentId?: string // For logging
}

export interface TranscriptAcquisitionResult {
  success: boolean
  transcript: TranscriptResult | null
  attemptedStrategies: {
    strategy: string
    success: boolean
    error?: string
  }[]
}

/**
 * Attempt to acquire transcript using fallback chain
 * Returns transcript result and logs all attempts
 */
export async function acquireTranscript(
  options: TranscriptAcquisitionOptions
): Promise<TranscriptAcquisitionResult> {
  const { transcriptUrl, episodeUrl, youtubeVideoId, contentId } = options
  const attemptedStrategies: TranscriptAcquisitionResult['attemptedStrategies'] = []

  // Strategy 1: RSS Transcript URL
  if (transcriptUrl) {
    logger.info('transcript', 'strategy.rss.start', `Attempting RSS transcript fetch`, {
      contentId,
      metadata: { url: transcriptUrl },
    })

    try {
      const result = await fetchRSSTranscript(transcriptUrl)
      if (result) {
        attemptedStrategies.push({ strategy: 'podcast_rss', success: true })
        logger.info('transcript', 'strategy.rss.success', `RSS transcript acquired`, {
          contentId,
          metadata: { wordCount: result.wordCount },
        })
        return { success: true, transcript: result, attemptedStrategies }
      }
      attemptedStrategies.push({ strategy: 'podcast_rss', success: false, error: 'Empty transcript' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      attemptedStrategies.push({ strategy: 'podcast_rss', success: false, error: errorMsg })
      logger.warn('transcript', 'strategy.rss.failed', `RSS transcript failed: ${errorMsg}`, {
        contentId,
      })
    }
  } else {
    attemptedStrategies.push({ strategy: 'podcast_rss', success: false, error: 'No transcript URL' })
  }

  // Strategy 2: Page Scraping
  if (episodeUrl) {
    logger.info('transcript', 'strategy.scrape.start', `Attempting page scrape`, {
      contentId,
      metadata: { url: episodeUrl },
    })

    try {
      const result = await scrapeTranscriptFromPage(episodeUrl)
      if (result) {
        attemptedStrategies.push({ strategy: 'podcast_scraped', success: true })
        logger.info('transcript', 'strategy.scrape.success', `Page scrape acquired transcript`, {
          contentId,
          metadata: { wordCount: result.wordCount },
        })
        return { success: true, transcript: result, attemptedStrategies }
      }
      attemptedStrategies.push({
        strategy: 'podcast_scraped',
        success: false,
        error: 'No transcript found on page',
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      attemptedStrategies.push({ strategy: 'podcast_scraped', success: false, error: errorMsg })
      logger.warn('transcript', 'strategy.scrape.failed', `Page scrape failed: ${errorMsg}`, {
        contentId,
      })
    }
  } else {
    attemptedStrategies.push({ strategy: 'podcast_scraped', success: false, error: 'No episode URL' })
  }

  // Strategy 3: YouTube Fallback
  if (youtubeVideoId) {
    logger.info('transcript', 'strategy.youtube.start', `Attempting YouTube fallback`, {
      contentId,
      metadata: { videoId: youtubeVideoId },
    })

    try {
      const result = await fetchYouTubeTranscript(youtubeVideoId)
      if (result) {
        attemptedStrategies.push({ strategy: 'youtube_fallback', success: true })
        logger.info('transcript', 'strategy.youtube.success', `YouTube transcript acquired`, {
          contentId,
          metadata: { wordCount: result.wordCount },
        })
        return { success: true, transcript: result, attemptedStrategies }
      }
      attemptedStrategies.push({
        strategy: 'youtube_fallback',
        success: false,
        error: 'No YouTube transcript available',
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      attemptedStrategies.push({ strategy: 'youtube_fallback', success: false, error: errorMsg })
      logger.warn('transcript', 'strategy.youtube.failed', `YouTube fallback failed: ${errorMsg}`, {
        contentId,
      })
    }
  } else {
    attemptedStrategies.push({ strategy: 'youtube_fallback', success: false, error: 'No YouTube ID' })
  }

  // Strategy 4: Whisper ASR (download audio and transcribe)
  if (isValidAudioUrl(options.audioUrl)) {
    logger.info('transcript', 'strategy.whisper.start', `Attempting Whisper ASR transcription`, {
      contentId,
      metadata: { audioUrl: options.audioUrl, duration: options.audioDuration },
    })

    try {
      const result = await transcribeWithWhisper({
        audioUrl: options.audioUrl!,
        contentId,
        expectedDuration: options.audioDuration,
      })
      if (result) {
        attemptedStrategies.push({ strategy: 'whisper_asr', success: true })
        logger.info('transcript', 'strategy.whisper.success', `Whisper transcription acquired`, {
          contentId,
          metadata: { wordCount: result.wordCount },
        })
        return { success: true, transcript: result, attemptedStrategies }
      }
      attemptedStrategies.push({
        strategy: 'whisper_asr',
        success: false,
        error: 'Whisper transcription failed',
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      attemptedStrategies.push({ strategy: 'whisper_asr', success: false, error: errorMsg })
      logger.warn('transcript', 'strategy.whisper.failed', `Whisper ASR failed: ${errorMsg}`, {
        contentId,
      })
    }
  } else {
    attemptedStrategies.push({ strategy: 'whisper_asr', success: false, error: 'No valid audio URL' })
  }

  // All strategies exhausted
  logger.warn(
    'transcript',
    'acquisition.unavailable',
    `All transcript strategies exhausted - marking unavailable`,
    {
      contentId,
      metadata: { attempts: attemptedStrategies },
    }
  )

  return { success: false, transcript: null, attemptedStrategies }
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

/**
 * Create transcript segments from plain text
 * (For transcripts without timing information)
 */
export function createSegmentsFromText(text: string): TranscriptSegment[] {
  // Split into paragraphs or sentences
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())

  if (paragraphs.length > 1) {
    return paragraphs.map((p) => ({ text: p.trim() }))
  }

  // If no paragraphs, split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  return sentences.map((s) => ({ text: s.trim() }))
}
