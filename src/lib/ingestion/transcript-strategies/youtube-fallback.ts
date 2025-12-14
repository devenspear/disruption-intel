/**
 * YouTube Fallback Strategy
 *
 * Uses YouTube transcript API as a fallback for podcasts
 * that are also published to YouTube.
 */

import { TranscriptResult, TranscriptSegment, countWords } from './index'

// Transcript service URL (Railway deployment)
const TRANSCRIPT_SERVICE_URL = process.env.TRANSCRIPT_SERVICE_URL || 'https://transcript-service-production.up.railway.app'

/**
 * Fetch transcript from YouTube using our transcript service
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult | null> {
  try {
    const response = await fetch(`${TRANSCRIPT_SERVICE_URL}/transcript/${videoId}`)

    if (!response.ok) {
      console.error(`YouTube transcript fetch failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data.success || !data.transcript) {
      return null
    }

    const segments: TranscriptSegment[] = data.transcript.map((item: { start: number; duration: number; text: string }) => ({
      start: item.start,
      duration: item.duration,
      text: item.text,
    }))

    const fullText = segments.map((s) => s.text).join(' ')

    return {
      fullText,
      segments,
      language: 'en',
      source: 'youtube_fallback',
      wordCount: countWords(fullText),
      confidence: 'medium',
    }
  } catch (error) {
    console.error('YouTube transcript fetch error:', error)
    return null
  }
}
