# Podcast Content Source Implementation Plan

## Executive Summary

This plan extends Disruption Intel to support podcast content sources alongside YouTube videos. The architecture is designed to be extensible for future content types (newsletters, RSS feeds, etc.).

---

## Phase 1: Database Schema Extensions

### 1.1 Extend Transcript Source Enum
**File:** `prisma/schema.prisma`

```prisma
// Expand the Transcript model's source field to support:
// Current: "youtube_auto" | "whisper" | "manual"
// New:     + "podcast_rss" | "podcast_scraped" | "youtube_captions" | "asr_whisper"
```

### 1.2 Add Content Type Field
**File:** `prisma/schema.prisma`

Add `contentType` enum and field to Content model:
```prisma
enum ContentType {
  VIDEO
  PODCAST_EPISODE
  ARTICLE
}

model Content {
  // ... existing fields
  contentType    ContentType @default(VIDEO)
}
```

### 1.3 Add Transcript Strategy Configuration
**File:** `prisma/schema.prisma`

Source metadata should track transcription preferences:
```prisma
// Already exists as JSON: metadata field on Source
// Will store: { transcriptStrategy: ["rss", "scrape", "youtube", "asr"] }
```

### 1.4 Migration
- Run `npx prisma migrate dev --name add-podcast-support`
- Update existing Content records to `contentType: VIDEO`

---

## Phase 2: Podcast Ingestion Layer

### 2.1 Create Podcast Module
**File:** `src/lib/ingestion/podcast.ts` (NEW)

```typescript
interface PodcastEpisode {
  guid: string              // Unique episode identifier
  title: string
  description: string
  publishedAt: Date
  duration: number          // seconds
  audioUrl: string          // enclosure URL
  episodeUrl: string        // episode page URL
  imageUrl?: string
  transcriptUrl?: string    // from <podcast:transcript> tag
}

interface PodcastFeed {
  title: string
  description: string
  author: string
  imageUrl?: string
  feedUrl: string
  websiteUrl: string
  episodes: PodcastEpisode[]
}

// Functions to implement:
export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeed>
export async function discoverPodcastFeed(websiteUrl: string): Promise<string | null>
export async function getLatestEpisodes(feedUrl: string, limit?: number): Promise<PodcastEpisode[]>
```

### 2.2 Dependencies to Add
```bash
npm install feedparser-promised rss-parser fast-xml-parser
```

### 2.3 RSS Feed Parsing Implementation
- Use `rss-parser` for standard RSS parsing
- Look for `<podcast:transcript>` tags (Podcasting 2.0 namespace)
- Extract episode metadata: guid, title, description, enclosure (audio URL)
- Handle iTunes namespace for duration, image, etc.

---

## Phase 3: Multi-Tier Transcript Acquisition

### 3.1 Refactor Transcript Module
**File:** `src/lib/ingestion/transcript.ts`

```typescript
type TranscriptStrategy =
  | "podcast_rss"      // Tier 1: Pull from RSS <podcast:transcript>
  | "podcast_scrape"   // Tier 2: Scrape episode page
  | "youtube_captions" // Tier 3: YouTube captions
  | "asr_whisper"      // Tier 4: ASR transcription

interface TranscriptOptions {
  contentType: "video" | "podcast"
  strategies?: TranscriptStrategy[]  // Priority order
  audioUrl?: string                  // For ASR fallback
  episodeUrl?: string                // For scraping
  transcriptUrl?: string             // Direct URL from RSS
}

export async function fetchTranscriptWithFallback(
  contentId: string,
  videoId: string | null,
  options: TranscriptOptions
): Promise<TranscriptResult | null>
```

### 3.2 Implement Transcript Strategy Handlers
**File:** `src/lib/ingestion/transcript-strategies/` (NEW directory)

```
transcript-strategies/
├── index.ts           # Strategy orchestrator
├── rss-transcript.ts  # Fetch from <podcast:transcript> URL
├── page-scraper.ts    # Scrape episode page for transcript
├── youtube.ts         # Existing YouTube logic (refactored)
└── asr.ts             # Whisper ASR transcription
```

### 3.3 Page Scraping Strategy
**Dependencies:**
```bash
npm install cheerio playwright  # cheerio for simple scraping, playwright for JS-heavy pages
```

**Implementation:**
- Pattern matching for transcript sections
- Look for: "Transcript", "Full transcript", "Read transcript"
- Check `<details>/<summary>` blocks
- Extract JSON-LD structured data

### 3.4 ASR Transcription Strategy
**Options:**
1. **External Service:** Use AssemblyAI, Deepgram, or OpenAI Whisper API
2. **Self-Hosted:** Deploy Whisper model (requires GPU)

**Recommended:** Start with OpenAI Whisper API for simplicity:
```typescript
import OpenAI from 'openai'

async function transcribeWithWhisper(audioUrl: string): Promise<TranscriptResult>
```

---

## Phase 4: Inngest Job Extensions

### 4.1 Modify Source Check Handler
**File:** `src/inngest/functions/check-sources.ts`

```typescript
// Add podcast handling to checkSource function:
if (source.type === "YOUTUBE_CHANNEL") {
  // existing code
} else if (source.type === "PODCAST") {
  const episodes = await step.run("fetch-podcast-episodes", async () => {
    const { getLatestEpisodes } = await import("@/lib/ingestion/podcast")
    return getLatestEpisodes(source.url, 10)
  })

  // Create Content records for new episodes
  for (const episode of episodes) {
    const exists = await prisma.content.findFirst({
      where: { sourceId: source.id, externalId: episode.guid }
    })

    if (!exists) {
      const content = await prisma.content.create({
        data: {
          sourceId: source.id,
          externalId: episode.guid,
          title: episode.title,
          description: episode.description,
          publishedAt: episode.publishedAt,
          duration: episode.duration,
          originalUrl: episode.episodeUrl,
          thumbnailUrl: episode.imageUrl,
          status: "PENDING",
          contentType: "PODCAST_EPISODE",
          metadata: {
            audioUrl: episode.audioUrl,
            transcriptUrl: episode.transcriptUrl
          }
        }
      })

      // Trigger processing
      await inngest.send({
        name: "content/process",
        data: { contentId: content.id }
      })
    }
  }
}
```

### 4.2 Modify Content Processing
**File:** `src/inngest/functions/check-sources.ts` or new file

Extend `processContent` to handle podcasts:
```typescript
// Determine content type from source
const source = await prisma.source.findUnique({ where: { id: content.sourceId } })

if (source.type === "YOUTUBE_CHANNEL") {
  // existing YouTube transcript logic
} else if (source.type === "PODCAST") {
  transcript = await fetchTranscriptWithFallback(content.id, null, {
    contentType: "podcast",
    strategies: source.metadata?.transcriptStrategy || ["podcast_rss", "podcast_scrape", "asr_whisper"],
    audioUrl: content.metadata?.audioUrl,
    episodeUrl: content.originalUrl,
    transcriptUrl: content.metadata?.transcriptUrl
  })
}
```

---

## Phase 5: API Route Extensions

### 5.1 Source Discovery Endpoint
**File:** `src/app/api/sources/discover/route.ts` (NEW)

```typescript
// POST /api/sources/discover
// Body: { url: string, type: "PODCAST" | "YOUTUBE_CHANNEL" }
// Returns: { name, description, feedUrl, latestEpisodes[] }

// Validates podcast RSS feeds before adding as source
// Returns preview of what would be ingested
```

### 5.2 Transcript Retry Endpoint
**File:** `src/app/api/content/[id]/retry-transcript/route.ts` (NEW)

```typescript
// POST /api/content/{id}/retry-transcript
// Body: { strategy?: TranscriptStrategy }
// Attempts alternative transcript strategies
```

### 5.3 Bulk Import Endpoint
**File:** `src/app/api/sources/[id]/import-episodes/route.ts` (NEW)

```typescript
// POST /api/sources/{id}/import-episodes
// Body: { limit?: number, startDate?: string }
// Imports historical episodes from a podcast feed
```

---

## Phase 6: UI Modifications

### 6.1 Source Management Updates
**File:** `src/components/sources/add-source-dialog.tsx`

- Add source type selector (YouTube Channel, Podcast, RSS, Manual)
- Show type-specific fields:
  - **YouTube:** Channel URL
  - **Podcast:** RSS Feed URL or Website URL (with auto-discovery)
  - **RSS:** Feed URL
- Add transcript strategy configuration for podcasts

### 6.2 Source Card Updates
**File:** `src/components/sources/source-card.tsx`

- Show content type icon (video vs podcast icon)
- Display podcast-specific metadata (episode count, feed URL)
- Type-specific action buttons

### 6.3 Content List Updates
**File:** `src/components/content/content-table.tsx`

- Add content type column/indicator
- Show appropriate icon (video vs podcast)
- Filter by content type

### 6.4 Content Detail Page Updates
**File:** `src/app/(dashboard)/content/[id]/page.tsx`

- Show podcast-specific metadata (audio player, episode URL)
- Display transcript source with fallback status
- Option to retry transcript with different strategy

### 6.5 New Components Needed

```
src/components/
├── content/
│   └── audio-player.tsx        # Simple audio player for podcasts
├── sources/
│   ├── podcast-preview.tsx     # Preview before adding podcast source
│   └── transcript-config.tsx   # Configure transcript strategies
└── ui/
    └── content-type-badge.tsx  # Visual indicator for content type
```

---

## Phase 7: Initial Podcast Sources

### 7.1 Seed Data
Add the 18 podcasts from the PRD as initial sources:

1. 20 VC
2. BG2 Pod
3. Big Technology Podcast
4. Dwarkesh Podcast
5. Google AI Release Notes
6. Google DeepMind: The Podcast
7. Hard Fork
8. Lenny's Podcast
9. Lex Fridman Podcast
10. No Priors
11. The 80,000 Hours Podcast
12. The a16z Show
13. The Cognitive Revolution
14. The Logan Bartlett Show
15. The MAD Podcast
16. The OpenAI Podcast
17. Uncapped
18. Y Combinator Startup Podcast

### 7.2 RSS Feed Discovery
Create script to discover RSS feeds for each podcast:
**File:** `scripts/discover-podcast-feeds.ts`

---

## Implementation Order

### Sprint 1: Database & Core Infrastructure (Foundation)
1. ✅ Schema migrations (ContentType enum, metadata updates)
2. ✅ Podcast feed parsing module (`src/lib/ingestion/podcast.ts`)
3. ✅ Basic RSS transcript fetching strategy
4. ✅ Unit tests for feed parsing

### Sprint 2: Inngest Integration (Backend Logic)
1. ✅ Extend `checkSource` for PODCAST type
2. ✅ Implement transcript fallback system
3. ✅ Add page scraping strategy
4. ✅ Integration tests for full pipeline

### Sprint 3: API & UI (User Interface)
1. ✅ Source discovery endpoint
2. ✅ Update AddSourceDialog for podcasts
3. ✅ Content type indicators in UI
4. ✅ Audio player component

### Sprint 4: ASR Fallback (Complete Coverage)
1. ✅ OpenAI Whisper API integration
2. ✅ ASR transcript strategy
3. ✅ Transcript retry UI
4. ✅ Handle failed transcripts

### Sprint 5: Polish & Seed (Launch)
1. ✅ Seed initial 18 podcast sources
2. ✅ Bulk historical import
3. ✅ Dashboard analytics for podcasts
4. ✅ Documentation updates

---

## Technical Considerations

### Rate Limiting
- RSS feeds: Respect cache headers, poll no more than hourly
- ASR: OpenAI Whisper has rate limits, implement queuing

### Storage
- Audio files: Stream from source, don't store locally
- Transcripts: Store in database (already implemented)
- Consider S3 for raw audio archival if needed

### Error Handling
- Graceful degradation through transcript strategies
- Mark content as FAILED only after all strategies exhausted
- Detailed logging for debugging transcript acquisition

### Cost Considerations
- ASR transcription costs: ~$0.006/minute with OpenAI Whisper
- A typical 1-hour podcast = ~$0.36 for ASR
- Prioritize free strategies (RSS, scraping) first

---

## Questions for Deven

Before proceeding, I'd like to clarify:

1. **ASR Service Preference:** Should we use:
   - OpenAI Whisper API (simple, pay-per-use)
   - AssemblyAI (better speaker diarization)
   - Self-hosted Whisper (cost-effective at scale, requires setup)

2. **Historical Import Depth:** How many past episodes should we import for each podcast?
   - Last 10 episodes only?
   - Last 3 months?
   - Full archive?

3. **Transcript Quality Priority:** For podcasts with both RSS transcripts and YouTube versions, which should take priority?
   - Official RSS transcripts (often auto-generated)
   - YouTube captions (may be better quality)

4. **Audio Storage:** Should we archive podcast audio files, or always stream from source?
   - Stream only (no storage costs)
   - Archive to S3 (reproducibility, ASR retries)

5. **Speaker Diarization:** Is identifying "who said what" important for your analysis?
   - If yes: Need WhisperX or AssemblyAI
   - If no: Standard Whisper is simpler

6. **UI Priority:** Should we build out the podcast management UI fully, or start with a minimal "add by RSS URL" approach?

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RSS feed structure varies | Medium | Robust parsing with fallbacks |
| Some podcasts lack transcripts | High | ASR fallback ensures 100% coverage |
| ASR costs for large archives | Medium | Prioritize free strategies first |
| Rate limiting from sources | Low | Implement respectful polling |
| JavaScript-heavy episode pages | Medium | Playwright fallback for scraping |

---

## Success Metrics

1. **Coverage:** 100% of episodes have transcripts
2. **Cost:** < $1 per episode on average (including ASR fallback)
3. **Latency:** New episodes processed within 24 hours of publication
4. **Quality:** Transcripts sufficient for meaningful AI analysis
