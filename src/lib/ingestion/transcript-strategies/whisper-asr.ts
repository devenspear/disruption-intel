/**
 * Whisper ASR Strategy
 *
 * Downloads podcast audio from URL and transcribes using OpenAI Whisper API.
 * This is the fallback when all other transcript acquisition methods fail.
 *
 * Cost: ~$0.006 per minute of audio
 */

import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { TranscriptResult, TranscriptSegment, countWords, createSegmentsFromText } from './index'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Maximum audio file size (25MB - OpenAI's limit)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024

// Maximum duration in seconds (roughly 2 hours - practical limit)
const MAX_DURATION_SECONDS = 7200

interface WhisperTranscriptionOptions {
  audioUrl: string
  contentId?: string
  expectedDuration?: number // in seconds
}

/**
 * Download audio from URL as a buffer
 */
async function downloadAudio(url: string, contentId?: string): Promise<Buffer | null> {
  try {
    await logger.debug('whisper', 'download.start', `Downloading audio from ${url}`, { contentId })

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DisruptionIntel/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_AUDIO_SIZE) {
      throw new Error(`Audio file too large: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB > 25MB limit`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length > MAX_AUDIO_SIZE) {
      throw new Error(`Audio file too large: ${Math.round(buffer.length / 1024 / 1024)}MB > 25MB limit`)
    }

    await logger.info('whisper', 'download.complete', `Downloaded ${Math.round(buffer.length / 1024)}KB audio`, {
      contentId,
      metadata: { sizeKB: Math.round(buffer.length / 1024) },
    })

    return buffer
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('whisper', 'download.failed', `Failed to download audio: ${errorMsg}`, { contentId })
    return null
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeWithWhisper(
  options: WhisperTranscriptionOptions
): Promise<TranscriptResult | null> {
  const { audioUrl, contentId, expectedDuration } = options

  // Check duration limit
  if (expectedDuration && expectedDuration > MAX_DURATION_SECONDS) {
    await logger.warn('whisper', 'duration.exceeded', `Audio duration ${expectedDuration}s exceeds limit`, {
      contentId,
    })
    // Still attempt - Whisper might handle it
  }

  // Download audio
  const audioBuffer = await downloadAudio(audioUrl, contentId)
  if (!audioBuffer) {
    return null
  }

  try {
    await logger.info('whisper', 'transcribe.start', `Starting Whisper transcription`, {
      contentId,
      metadata: { audioSizeKB: Math.round(audioBuffer.length / 1024) },
    })

    const startTime = Date.now()

    // Determine file extension from URL
    const urlPath = new URL(audioUrl).pathname.toLowerCase()
    let mimeType = 'audio/mpeg'
    let fileName = 'audio.mp3'

    if (urlPath.endsWith('.m4a')) {
      mimeType = 'audio/mp4'
      fileName = 'audio.m4a'
    } else if (urlPath.endsWith('.wav')) {
      mimeType = 'audio/wav'
      fileName = 'audio.wav'
    } else if (urlPath.endsWith('.ogg')) {
      mimeType = 'audio/ogg'
      fileName = 'audio.ogg'
    } else if (urlPath.endsWith('.webm')) {
      mimeType = 'audio/webm'
      fileName = 'audio.webm'
    }

    // Create File object for OpenAI API
    const uint8Array = new Uint8Array(audioBuffer)
    const blob = new Blob([uint8Array], { type: mimeType })
    const file = new File([blob], fileName, { type: mimeType })

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    const duration = Date.now() - startTime

    // Extract text and segments
    const fullText = transcription.text
    const segments: TranscriptSegment[] = (transcription.segments || []).map((seg) => ({
      start: seg.start,
      duration: seg.end - seg.start,
      text: seg.text.trim(),
    }))

    // If no segments, create from text
    const finalSegments = segments.length > 0 ? segments : createSegmentsFromText(fullText)
    const wordCount = countWords(fullText)

    await logger.info('whisper', 'transcribe.complete', `Whisper transcription complete in ${duration}ms`, {
      contentId,
      duration,
      metadata: { wordCount, segmentCount: finalSegments.length },
    })

    return {
      fullText,
      segments: finalSegments,
      language: transcription.language || 'en',
      source: 'whisper_asr' as TranscriptResult['source'],
      wordCount,
      confidence: 'high',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('whisper', 'transcribe.failed', `Whisper transcription failed: ${errorMsg}`, {
      contentId,
      metadata: { error: errorMsg },
    })
    return null
  }
}

/**
 * Check if audio URL is valid for Whisper transcription
 */
export function isValidAudioUrl(url: string | null | undefined): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const path = parsed.pathname.toLowerCase()

    // Check for common audio extensions
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.webm', '.mp4', '.mpeg', '.mpga']
    return audioExtensions.some((ext) => path.endsWith(ext)) || path.includes('audio')
  } catch {
    return false
  }
}
