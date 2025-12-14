/**
 * Page Scraping Transcript Strategy
 *
 * Scrapes podcast episode pages for embedded transcripts.
 * Many podcasts publish transcripts on their show notes pages.
 *
 * Looks for:
 * - Sections with transcript headers
 * - <details>/<summary> blocks
 * - Expandable transcript sections
 * - Substack-style transcripts
 */

import * as cheerio from 'cheerio'
import { TranscriptResult, countWords, createSegmentsFromText } from './index'

// Minimum transcript length to be considered valid
const MIN_TRANSCRIPT_LENGTH = 500

// Maximum page size to fetch (10MB)
const MAX_PAGE_SIZE = 10 * 1024 * 1024

/**
 * Scrape a podcast episode page for transcript content
 */
export async function scrapeTranscriptFromPage(episodeUrl: string): Promise<TranscriptResult | null> {
  try {
    const response = await fetch(episodeUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      console.error(`Page fetch failed: ${response.status} for ${episodeUrl}`)
      return null
    }

    // Check content length
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_PAGE_SIZE) {
      console.error(`Page too large: ${contentLength} bytes for ${episodeUrl}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove script and style tags
    $('script, style, nav, header, footer, aside').remove()

    // Try various extraction strategies
    let transcript = tryTranscriptSection($)
    if (!transcript) transcript = tryDetailsBlock($)
    if (!transcript) transcript = trySubstackFormat($)
    if (!transcript) transcript = tryExpandableSection($)
    if (!transcript) transcript = tryTranscriptClass($)
    if (!transcript) transcript = tryTranscriptLinks($, episodeUrl)

    if (transcript && transcript.length >= MIN_TRANSCRIPT_LENGTH) {
      return {
        fullText: transcript,
        segments: createSegmentsFromText(transcript),
        language: 'en',
        source: 'podcast_scraped',
        wordCount: countWords(transcript),
        confidence: 'medium', // Scraped transcripts may have formatting issues
      }
    }

    return null
  } catch (error) {
    console.error(`Error scraping page ${episodeUrl}:`, error)
    return null
  }
}

/**
 * Look for sections with transcript-related headers
 */
function tryTranscriptSection($: cheerio.CheerioAPI): string | null {
  // Look for headings containing "transcript"
  const transcriptHeadings = $('h1, h2, h3, h4, h5, h6').filter(function () {
    const text = $(this).text().toLowerCase()
    return (
      text.includes('transcript') ||
      text.includes('full text') ||
      text.includes('episode text') ||
      text.includes('read the conversation')
    )
  })

  if (transcriptHeadings.length > 0) {
    const heading = transcriptHeadings.first()
    const parent = heading.parent()

    // Get all following siblings until the next heading
    let content = ''
    let current = heading.next()

    while (current.length > 0) {
      const tagName = current.prop('tagName')?.toLowerCase()
      if (tagName && ['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
        break
      }
      content += current.text() + '\n\n'
      current = current.next()
    }

    if (content.trim().length >= MIN_TRANSCRIPT_LENGTH) {
      return cleanTranscriptText(content)
    }

    // Try getting the entire parent section
    const parentText = parent.text()
    if (parentText.length >= MIN_TRANSCRIPT_LENGTH) {
      return cleanTranscriptText(parentText)
    }
  }

  return null
}

/**
 * Look for <details>/<summary> blocks containing transcript
 */
function tryDetailsBlock($: cheerio.CheerioAPI): string | null {
  const detailsElements = $('details').filter(function () {
    const summary = $(this).find('summary').text().toLowerCase()
    return (
      summary.includes('transcript') ||
      summary.includes('read') ||
      summary.includes('show text') ||
      summary.includes('expand')
    )
  })

  if (detailsElements.length > 0) {
    const content = detailsElements.first().text()
    if (content.length >= MIN_TRANSCRIPT_LENGTH) {
      return cleanTranscriptText(content)
    }
  }

  return null
}

/**
 * Try Substack-specific format (many podcasts use Substack)
 */
function trySubstackFormat($: cheerio.CheerioAPI): string | null {
  // Substack typically has post content in a specific class
  const substackContent = $('.post-content, .body, .available-content')

  if (substackContent.length > 0) {
    // Look for a section that appears to be a transcript
    // Substack podcasts often have the transcript after audio player
    const paragraphs = substackContent.find('p')
    const textBlocks: string[] = []
    let isTranscriptSection = false

    paragraphs.each(function () {
      const text = $(this).text().trim()

      // Check if this looks like a transcript header
      if (text.toLowerCase().includes('transcript') && text.length < 100) {
        isTranscriptSection = true
        return // Skip the header itself
      }

      // Look for speaker patterns like "Speaker:" or "**Speaker:**"
      const hasSpeakerPattern =
        /^[\w\s]+:\s/.test(text) || /^\*\*[\w\s]+:\*\*/.test(text) || /^\[[\w\s]+\]/.test(text)

      if (isTranscriptSection || hasSpeakerPattern) {
        if (text.length > 20) {
          textBlocks.push(text)
        }
      }
    })

    if (textBlocks.length > 10) {
      const transcript = textBlocks.join('\n\n')
      if (transcript.length >= MIN_TRANSCRIPT_LENGTH) {
        return cleanTranscriptText(transcript)
      }
    }
  }

  return null
}

/**
 * Look for expandable sections that might contain transcripts
 */
function tryExpandableSection($: cheerio.CheerioAPI): string | null {
  // Common expandable section patterns
  const expandables = $(
    '[data-transcript], [aria-label*="transcript" i], .transcript-container, .transcript-wrapper, .show-notes-transcript'
  )

  if (expandables.length > 0) {
    const content = expandables.first().text()
    if (content.length >= MIN_TRANSCRIPT_LENGTH) {
      return cleanTranscriptText(content)
    }
  }

  return null
}

/**
 * Look for elements with transcript-related class names
 */
function tryTranscriptClass($: cheerio.CheerioAPI): string | null {
  // Common class patterns for transcripts
  const selectors = [
    '[class*="transcript"]',
    '[id*="transcript"]',
    '.episode-transcript',
    '.podcast-transcript',
    '.full-transcript',
    '.show-transcript',
    '#transcript',
  ]

  for (const selector of selectors) {
    const elements = $(selector)
    if (elements.length > 0) {
      const content = elements.first().text()
      if (content.length >= MIN_TRANSCRIPT_LENGTH) {
        return cleanTranscriptText(content)
      }
    }
  }

  return null
}

/**
 * Look for links to transcript pages
 */
function tryTranscriptLinks($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Look for links that might lead to a transcript
  const transcriptLinks = $('a').filter(function () {
    const text = $(this).text().toLowerCase()
    const href = $(this).attr('href')?.toLowerCase() || ''
    return (
      (text.includes('transcript') ||
        text.includes('read full') ||
        text.includes('full text') ||
        href.includes('transcript')) &&
      !href.includes('mailto:')
    )
  })

  // For now, just return null - fetching linked pages would require recursion
  // which could be problematic. We'll note this for future enhancement.
  if (transcriptLinks.length > 0) {
    console.log(`Found transcript link on ${baseUrl}, but not following it`)
  }

  return null
}

/**
 * Clean up extracted transcript text
 */
function cleanTranscriptText(text: string): string {
  let cleaned = text

  // Remove common UI elements
  cleaned = cleaned.replace(/Share this post/gi, '')
  cleaned = cleaned.replace(/Subscribe/gi, '')
  cleaned = cleaned.replace(/Like|Comment|Share/gi, '')
  cleaned = cleaned.replace(/\d+\s*likes?/gi, '')
  cleaned = cleaned.replace(/\d+\s*comments?/gi, '')

  // Remove timestamps in various formats
  cleaned = cleaned.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, '')
  cleaned = cleaned.replace(/\(\d{1,2}:\d{2}(:\d{2})?\)/g, '')

  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  cleaned = cleaned.replace(/[ \t]+/g, ' ')

  // Remove lines that are just numbers or very short
  const lines = cleaned.split('\n')
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim()
    if (trimmed.length < 3) return false
    if (/^\d+$/.test(trimmed)) return false
    return true
  })

  return filteredLines.join('\n').trim()
}
