/**
 * RSS Transcript Strategy
 *
 * Fetches transcripts from URLs provided in podcast RSS feeds
 * via the <podcast:transcript> tag (Podcasting 2.0 spec).
 *
 * Supports formats: text/plain, text/html, text/vtt, application/json
 */

import { TranscriptResult, countWords, createSegmentsFromText } from './index'

/**
 * Fetch and parse transcript from RSS-provided URL
 */
export async function fetchRSSTranscript(transcriptUrl: string): Promise<TranscriptResult | null> {
  try {
    const response = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'DisruptionIntel/1.0 (Podcast Transcript Fetcher)',
        Accept: 'text/plain, text/html, text/vtt, application/json, */*',
      },
    })

    if (!response.ok) {
      console.error(`RSS transcript fetch failed: ${response.status} for ${transcriptUrl}`)
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    if (!text || text.trim().length === 0) {
      return null
    }

    let fullText: string
    let segments: TranscriptResult['segments'] = []

    // Parse based on content type
    if (contentType.includes('text/vtt') || text.startsWith('WEBVTT')) {
      const parsed = parseVTT(text)
      fullText = parsed.text
      segments = parsed.segments
    } else if (contentType.includes('application/json')) {
      const parsed = parseJSONTranscript(text)
      fullText = parsed.text
      segments = parsed.segments
    } else if (
      contentType.includes('text/srt') ||
      contentType.includes('application/x-subrip') ||
      /^\d+\r?\n\d{2}:\d{2}:\d{2}/.test(text)
    ) {
      const parsed = parseSRT(text)
      fullText = parsed.text
      segments = parsed.segments
    } else if (contentType.includes('text/html')) {
      fullText = stripHTML(text)
      segments = createSegmentsFromText(fullText)
    } else {
      // Plain text
      fullText = text.trim()
      segments = createSegmentsFromText(fullText)
    }

    if (!fullText || fullText.length < 100) {
      // Too short to be a real transcript
      return null
    }

    return {
      fullText,
      segments,
      language: 'en',
      source: 'podcast_rss',
      wordCount: countWords(fullText),
      confidence: 'high', // RSS transcripts are typically official
    }
  } catch (error) {
    console.error(`Error fetching RSS transcript from ${transcriptUrl}:`, error)
    return null
  }
}

/**
 * Parse VTT (WebVTT) format
 */
function parseVTT(vttContent: string): { text: string; segments: TranscriptResult['segments'] } {
  const lines = vttContent.split('\n')
  const segments: TranscriptResult['segments'] = []
  const textLines: string[] = []

  let currentSegment: { start?: number; text: string } | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip WEBVTT header and empty lines
    if (trimmed === 'WEBVTT' || trimmed === '' || trimmed.startsWith('NOTE')) {
      if (currentSegment && currentSegment.text) {
        segments.push({ start: currentSegment.start, text: currentSegment.text })
        textLines.push(currentSegment.text)
        currentSegment = null
      }
      continue
    }

    // Parse timestamp line
    const timestampMatch = trimmed.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*/)
    if (timestampMatch) {
      if (currentSegment && currentSegment.text) {
        segments.push({ start: currentSegment.start, text: currentSegment.text })
        textLines.push(currentSegment.text)
      }
      const hours = parseInt(timestampMatch[1], 10)
      const minutes = parseInt(timestampMatch[2], 10)
      const seconds = parseInt(timestampMatch[3], 10)
      const start = hours * 3600 + minutes * 60 + seconds
      currentSegment = { start, text: '' }
      continue
    }

    // Skip cue identifiers
    if (/^\d+$/.test(trimmed)) {
      continue
    }

    // Collect text content
    if (trimmed) {
      // Remove VTT tags like <v Speaker>
      const cleanText = trimmed.replace(/<[^>]+>/g, '').trim()
      if (cleanText) {
        if (currentSegment) {
          currentSegment.text += (currentSegment.text ? ' ' : '') + cleanText
        } else {
          currentSegment = { text: cleanText }
        }
      }
    }
  }

  // Don't forget the last segment
  if (currentSegment && currentSegment.text) {
    segments.push({ start: currentSegment.start, text: currentSegment.text })
    textLines.push(currentSegment.text)
  }

  return { text: textLines.join(' '), segments }
}

/**
 * Parse SRT (SubRip) format
 */
function parseSRT(srtContent: string): { text: string; segments: TranscriptResult['segments'] } {
  const segments: TranscriptResult['segments'] = []
  const textLines: string[] = []

  // Split by double newlines to get individual subtitle blocks
  const blocks = srtContent.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    // First line is index, second is timestamp
    const timestampLine = lines.find((l) => l.includes('-->'))
    if (!timestampLine) continue

    // Parse timestamp
    const timestampMatch = timestampLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    let start: number | undefined
    if (timestampMatch) {
      const hours = parseInt(timestampMatch[1], 10)
      const minutes = parseInt(timestampMatch[2], 10)
      const seconds = parseInt(timestampMatch[3], 10)
      start = hours * 3600 + minutes * 60 + seconds
    }

    // Get text lines (everything after timestamp)
    const timestampIndex = lines.indexOf(timestampLine)
    const textContent = lines
      .slice(timestampIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (textContent) {
      segments.push({ start, text: textContent })
      textLines.push(textContent)
    }
  }

  return { text: textLines.join(' '), segments }
}

/**
 * Parse JSON transcript format
 */
function parseJSONTranscript(
  jsonContent: string
): { text: string; segments: TranscriptResult['segments'] } {
  try {
    const data = JSON.parse(jsonContent)
    const segments: TranscriptResult['segments'] = []

    // Handle various JSON formats
    if (Array.isArray(data)) {
      // Array of segments
      for (const item of data) {
        const text = item.text || item.content || item.transcript || ''
        if (text) {
          segments.push({
            start: item.start || item.startTime,
            duration: item.duration,
            text,
          })
        }
      }
    } else if (data.segments && Array.isArray(data.segments)) {
      // Object with segments array
      for (const item of data.segments) {
        const text = item.text || item.content || ''
        if (text) {
          segments.push({
            start: item.start || item.startTime,
            duration: item.duration,
            text,
          })
        }
      }
    } else if (data.transcript) {
      // Object with transcript string
      return {
        text: data.transcript,
        segments: createSegmentsFromText(data.transcript),
      }
    } else if (data.text) {
      // Object with text string
      return {
        text: data.text,
        segments: createSegmentsFromText(data.text),
      }
    }

    const fullText = segments.map((s) => s.text).join(' ')
    return { text: fullText, segments }
  } catch {
    return { text: '', segments: [] }
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
