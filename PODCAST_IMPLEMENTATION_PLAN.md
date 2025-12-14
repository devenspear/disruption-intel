# Podcast Content Source Implementation Plan v2

## Executive Summary

Expand Disruption Intel to support podcast content sources alongside YouTube videos, with a unified content management interface designed for future expansion (Twitter, newsletters, etc.). Focus on RSS-based transcript acquisition without ASR infrastructure.

---

## Scope Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ASR Service | Deferred | Focus on existing transcripts first |
| Historical Import | Last 10 episodes | Manageable initial dataset |
| Transcript Priority | RSS > YouTube | More reliable, better quality |
| Audio Storage | Not needed | No ASR means no audio processing |
| Speaker Diarization | Natural from RSS | Will appear in transcript if available |
| UI Scope | Full robust UI | Future-proof for Twitter, newsletters |

---

## UI/UX Vision: Unified Content Intelligence Platform

### Design Principles

1. **Source-Agnostic Content View** - All content (videos, podcasts, future tweets) in unified interface
2. **Source Management Hub** - Easy to add/manage diverse source types
3. **Smart Filtering** - Filter by source type, status, relevance, date range
4. **Professional Aesthetic** - Clean, modern, data-rich interface
5. **Scalable Architecture** - UI patterns that accommodate new source types

### Information Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  DISRUPTION INTEL                                    [User] [Settings]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐                                                        │
│  │ Dashboard│  Quick stats, recent activity, alerts                  │
│  ├──────────┤                                                        │
│  │ Content  │  ← Unified view of ALL content (videos + podcasts)     │
│  ├──────────┤                                                        │
│  │ Sources  │  ← Manage YouTube channels, Podcast feeds, (Twitter)   │
│  ├──────────┤                                                        │
│  │ Search   │  Full-text search across all transcripts               │
│  ├──────────┤                                                        │
│  │ Insights │  AI-generated trends, key quotes, signals (future)     │
│  ├──────────┤                                                        │
│  │ Settings │  Prompts, API keys, preferences                        │
│  └──────────┘                                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Sources Page Redesign

```
┌─────────────────────────────────────────────────────────────────────┐
│  Sources                                          [+ Add Source ▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Filter: [All Types ▼] [Active ▼]           Search: [____________]   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 📺 YOUTUBE CHANNELS                                    4 sources │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ┌─────────────────────┐ ┌─────────────────────┐                 │ │
│  │ │ [img] All-In Pod    │ │ [img] Lex Fridman   │ ...             │ │
│  │ │ 24 videos │ Active  │ │ 156 videos │ Active │                 │ │
│  │ │ Last: 2 days ago    │ │ Last: 5 days ago    │                 │ │
│  │ └─────────────────────┘ └─────────────────────┘                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🎙️ PODCASTS                                          18 sources │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ┌─────────────────────┐ ┌─────────────────────┐                 │ │
│  │ │ [img] 20 VC         │ │ [img] Hard Fork     │ ...             │ │
│  │ │ 10 episodes │ Active│ │ 10 episodes │ Active│                 │ │
│  │ │ Last: 1 day ago     │ │ Last: 3 days ago    │                 │ │
│  │ └─────────────────────┘ └─────────────────────┘                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🐦 TWITTER FEEDS (Coming Soon)                         0 sources │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Content Page Redesign

```
┌─────────────────────────────────────────────────────────────────────┐
│  Content                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Type: [All ▼] [📺 Videos] [🎙️ Podcasts]                       │   │
│  │ Status: [All ▼] Source: [All ▼] Date: [Last 30 days ▼]        │   │
│  │ Sort: [Newest ▼]                    Search: [______________]   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ │ Type │ Title                    │ Source   │ Status │ Date  │   │
│  │ ├──────┼──────────────────────────┼──────────┼────────┼───────│   │
│  │ │ 🎙️   │ AI Safety with Dario... │ 20 VC    │ ✅ Done │ Dec 12│   │
│  │ │ 📺   │ The Future of AGI       │ Lex F.   │ ✅ Done │ Dec 11│   │
│  │ │ 🎙️   │ Scaling Laws Deep Dive  │ Dwarkesh │ ⏳ Proc │ Dec 10│   │
│  │ │ 📺   │ OpenAI DevDay Recap     │ All-In   │ ❌ Fail │ Dec 9 │   │
│  │ │ 🎙️   │ Google Gemini Launch    │ Hard Fork│ ✅ Done │ Dec 8 │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Showing 1-25 of 342 items                      [< 1 2 3 ... 14 >]   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Add Source Dialog (Multi-Type)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Add New Source                                              [X]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Select Source Type:                                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │     📺       │  │     🎙️       │  │     🐦       │               │
│  │   YouTube    │  │   Podcast    │  │   Twitter    │               │
│  │   Channel    │  │    Feed      │  │  (Coming)    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│       ▲ Selected                                                     │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  YouTube Channel URL:                                                │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ https://youtube.com/@lexfridman                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ ✓ Lex Fridman Podcast                                       │     │
│  │   @lexfridman • 4.2M subscribers • 430 videos               │     │
│  │   Latest: "Sam Altman: OpenAI CEO on GPT-5..." (2 days ago) │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Check Frequency: [Daily ▼]                                          │
│                                                                      │
│                                    [Cancel]  [Add Source]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Podcast Source Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│  Add New Source                                              [X]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Select Source Type:                                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │     📺       │  │     🎙️       │  │     🐦       │               │
│  │   YouTube    │  │   Podcast    │  │   Twitter    │               │
│  │   Channel    │  │    Feed      │  │  (Coming)    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                         ▲ Selected                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  Podcast RSS Feed or Website URL:                                    │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ https://www.thetwentyminutevc.com/                          │     │
│  └─────────────────────────────────────────────────────────────┘     │
│  [Discover Feed]                                                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ ✓ 20VC with Harry Stebbings                                 │     │
│  │   RSS: https://feeds.megaphone.fm/20vc                      │     │
│  │   Episodes: 2,847 • Latest: "Dario Amodei..." (1 day ago)   │     │
│  │                                                              │     │
│  │   Transcript Availability:                                   │     │
│  │   ├─ RSS Transcript Tag: ✓ Available                        │     │
│  │   ├─ Episode Page Scraping: ✓ Likely available              │     │
│  │   └─ YouTube Mirror: ✓ Channel linked                       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Import Options:                                                     │
│  ○ Latest episode only                                               │
│  ● Last 10 episodes (recommended)                                    │
│  ○ Last 30 episodes                                                  │
│  ○ Custom date range                                                 │
│                                                                      │
│  Check Frequency: [Daily ▼]                                          │
│                                                                      │
│                                    [Cancel]  [Add Source]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Content Detail Page (Podcast Episode)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Content                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🎙️ PODCAST EPISODE                                             │  │
│  │                                                                 │  │
│  │ The Future of AI Safety with Dario Amodei                      │  │
│  │                                                                 │  │
│  │ 20VC with Harry Stebbings • December 12, 2024 • 58 min         │  │
│  │                                                                 │  │
│  │ [▶ Listen on 20VC.com]  [📋 Copy Link]  [🔄 Re-analyze]        │  │
│  │                                                                 │  │
│  │ Status: ✅ Analyzed • Transcript: RSS (Official)               │  │
│  │ Relevance Score: 94/100                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ [Summary] [Key Insights] [Quotes] [Transcript] [Raw JSON]    │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │                                                               │    │
│  │ SUMMARY                                                       │    │
│  │ ────────                                                      │    │
│  │ Dario Amodei, CEO of Anthropic, discusses the company's      │    │
│  │ approach to AI safety, the race to AGI, and why he believes  │    │
│  │ constitutional AI represents a breakthrough in alignment...   │    │
│  │                                                               │    │
│  │ KEY INSIGHTS                                                  │    │
│  │ ────────────                                                  │    │
│  │ • Anthropic expects to reach AGI-level capabilities within   │    │
│  │   2-3 years, but emphasizes safety-first development         │    │
│  │ • Constitutional AI has shown 40% improvement in avoiding    │    │
│  │   harmful outputs compared to RLHF alone                     │    │
│  │ • The "race to the bottom" narrative is overblown...         │    │
│  │                                                               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Extensions

### 1.1 Add ContentType Enum
**File:** `prisma/schema.prisma`

```prisma
enum ContentType {
  VIDEO
  PODCAST_EPISODE
  ARTICLE          // Future: newsletters
  SOCIAL_POST      // Future: Twitter
}

model Content {
  // ... existing fields
  contentType    ContentType @default(VIDEO)
}
```

### 1.2 Extend Transcript Source Options
Track where transcripts came from for debugging/quality:
```prisma
// Transcript.source field will accept:
// "youtube_auto" | "podcast_rss" | "podcast_scraped" | "manual"
```

### 1.3 Migration
```bash
npx prisma migrate dev --name add-content-type-and-podcast-support
```

---

## Phase 2: Podcast Ingestion Module

### 2.1 Create Podcast Module
**File:** `src/lib/ingestion/podcast.ts`

```typescript
import Parser from 'rss-parser'

interface PodcastEpisode {
  guid: string
  title: string
  description: string
  publishedAt: Date
  duration: number
  audioUrl: string
  episodeUrl: string
  imageUrl?: string
  transcriptUrl?: string  // From <podcast:transcript> tag
}

interface PodcastFeed {
  title: string
  description: string
  author: string
  imageUrl?: string
  feedUrl: string
  websiteUrl: string
  language?: string
  episodes: PodcastEpisode[]
}

export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeed>
export async function discoverFeedFromWebsite(websiteUrl: string): Promise<string | null>
export async function getLatestEpisodes(feedUrl: string, limit?: number): Promise<PodcastEpisode[]>
export async function fetchRSSTranscript(transcriptUrl: string): Promise<string | null>
```

### 2.2 Dependencies
```bash
npm install rss-parser cheerio
```

### 2.3 RSS Parsing with Podcasting 2.0 Support
- Parse standard RSS/Atom feeds
- Extract `<podcast:transcript>` tags (Podcasting 2.0 namespace)
- Handle iTunes namespace for podcast metadata
- Support multiple transcript formats (plain text, VTT, SRT, JSON)

---

## Phase 3: Transcript Acquisition Strategies

### 3.1 Strategy Priority (No ASR)

```
For Podcasts:
1. RSS <podcast:transcript> tag → Direct URL to transcript file
2. Scrape episode page → Look for transcript sections
3. YouTube fallback → If podcast has YouTube mirror (last resort)

For YouTube Videos:
1. Existing YouTube transcript logic (unchanged)
```

### 3.2 Refactor Transcript Module
**File:** `src/lib/ingestion/transcript.ts`

```typescript
type TranscriptSource =
  | "youtube_auto"
  | "podcast_rss"
  | "podcast_scraped"
  | "youtube_fallback"
  | "manual"

interface TranscriptOptions {
  contentType: "video" | "podcast"
  transcriptUrl?: string      // Direct URL from RSS
  episodeUrl?: string         // For scraping fallback
  youtubeVideoId?: string     // For YouTube fallback
}

export async function fetchTranscriptForContent(
  contentId: string,
  externalId: string,
  options: TranscriptOptions
): Promise<TranscriptResult | null>
```

### 3.3 Page Scraping Strategy
**File:** `src/lib/ingestion/transcript-strategies/page-scraper.ts`

```typescript
import * as cheerio from 'cheerio'

// Look for common transcript patterns:
// - Links with text: "Transcript", "Full transcript", "Read transcript"
// - <details>/<summary> blocks containing transcript
// - Sections with id/class containing "transcript"
// - JSON-LD structured data

export async function scrapeTranscriptFromPage(episodeUrl: string): Promise<string | null>
```

---

## Phase 4: Inngest Job Extensions

### 4.1 Extend Source Checker
**File:** `src/inngest/functions/check-sources.ts`

Add PODCAST handling alongside existing YouTube logic:

```typescript
if (source.type === "YOUTUBE_CHANNEL") {
  // existing YouTube logic
} else if (source.type === "PODCAST") {
  const episodes = await step.run("fetch-podcast-episodes", async () => {
    const { getLatestEpisodes } = await import("@/lib/ingestion/podcast")
    return getLatestEpisodes(source.url, 10)
  })

  for (const episode of episodes) {
    // Check if already exists
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

      await inngest.send({
        name: "content/process",
        data: { contentId: content.id }
      })
    }
  }
}
```

### 4.2 Extend Content Processor
Handle podcast transcript fetching:

```typescript
const source = await prisma.source.findUnique({ where: { id: content.sourceId } })

if (source.type === "YOUTUBE_CHANNEL") {
  // existing YouTube transcript logic
} else if (source.type === "PODCAST") {
  transcript = await fetchTranscriptForContent(content.id, content.externalId, {
    contentType: "podcast",
    transcriptUrl: content.metadata?.transcriptUrl,
    episodeUrl: content.originalUrl
  })
}
```

---

## Phase 5: API Extensions

### 5.1 Source Discovery Endpoint
**File:** `src/app/api/sources/discover/route.ts` (NEW)

```typescript
// POST /api/sources/discover
// Body: { url: string, type: "PODCAST" | "YOUTUBE_CHANNEL" }
// Returns preview of source before adding
```

### 5.2 Podcast Feed Validation
**File:** `src/app/api/sources/validate-podcast/route.ts` (NEW)

```typescript
// POST /api/sources/validate-podcast
// Body: { url: string }
// Returns: feed info, transcript availability check, episode count
```

### 5.3 Extend Sources POST
**File:** `src/app/api/sources/route.ts`

Add validation for podcast RSS feeds and import options.

---

## Phase 6: UI Implementation

### 6.1 New/Modified Components

| Component | Status | Description |
|-----------|--------|-------------|
| `sources/source-type-selector.tsx` | NEW | Visual type picker (YouTube, Podcast, Twitter placeholder) |
| `sources/add-source-dialog.tsx` | MODIFY | Multi-type support with type-specific forms |
| `sources/podcast-preview.tsx` | NEW | Shows feed info before adding |
| `sources/source-card.tsx` | MODIFY | Type-specific icons and metadata |
| `content/content-table.tsx` | MODIFY | Add content type column/filter |
| `content/content-type-badge.tsx` | NEW | Visual badge for VIDEO/PODCAST |
| `content/transcript-source-badge.tsx` | NEW | Shows transcript origin (RSS, scraped, etc.) |
| `layout/sidebar.tsx` | MODIFY | Updated navigation structure |

### 6.2 Page Updates

| Page | Changes |
|------|---------|
| `/sources` | Grouped by type, visual cards layout |
| `/content` | Type filter, type column, icons |
| `/content/[id]` | Type-specific metadata display |
| `/dashboard` | Stats by content type |

---

## Phase 7: Initial Podcast Sources

### 7.1 Seed Script
**File:** `scripts/seed-podcasts.ts`

Import the 18 podcasts from PRD with discovered RSS feeds:

```typescript
const INITIAL_PODCASTS = [
  { name: "20 VC", url: "https://feeds.megaphone.fm/20vc" },
  { name: "BG2 Pod", url: "TBD" },
  { name: "Big Technology Podcast", url: "TBD" },
  { name: "Dwarkesh Podcast", url: "TBD" },
  { name: "Google AI Release Notes", url: "TBD" },
  { name: "Google DeepMind: The Podcast", url: "TBD" },
  { name: "Hard Fork", url: "TBD" },
  { name: "Lenny's Podcast", url: "TBD" },
  { name: "Lex Fridman Podcast", url: "TBD" },
  { name: "No Priors", url: "TBD" },
  { name: "The 80,000 Hours Podcast", url: "TBD" },
  { name: "The a16z Show", url: "TBD" },
  { name: "The Cognitive Revolution", url: "TBD" },
  { name: "The Logan Bartlett Show", url: "TBD" },
  { name: "The MAD Podcast", url: "TBD" },
  { name: "The OpenAI Podcast", url: "TBD" },
  { name: "Uncapped", url: "TBD" },
  { name: "Y Combinator Startup Podcast", url: "TBD" }
]
```

### 7.2 Feed Discovery
Create utility to auto-discover RSS feeds from website URLs.

---

## Implementation Sprints

### Sprint 1: Foundation (Database + Podcast Parsing)
**Estimated Files: 8-10**

1. Prisma schema migration (ContentType enum)
2. `src/lib/ingestion/podcast.ts` - RSS parsing module
3. `src/lib/ingestion/transcript-strategies/rss-transcript.ts`
4. `src/lib/ingestion/transcript-strategies/page-scraper.ts`
5. Unit tests for podcast parsing
6. Update types throughout codebase

### Sprint 2: Backend Integration (Inngest + APIs)
**Estimated Files: 6-8**

1. Modify `check-sources.ts` for PODCAST type
2. Modify `process-content` for podcast transcripts
3. `src/app/api/sources/discover/route.ts`
4. `src/app/api/sources/validate-podcast/route.ts`
5. Update `src/app/api/sources/route.ts`
6. Integration tests

### Sprint 3: UI - Sources Page
**Estimated Files: 8-10**

1. `source-type-selector.tsx` component
2. Update `add-source-dialog.tsx` for multi-type
3. `podcast-preview.tsx` component
4. Update `source-card.tsx` with type support
5. Update `/sources/page.tsx` with grouped layout
6. Styling and polish

### Sprint 4: UI - Content Pages
**Estimated Files: 6-8**

1. `content-type-badge.tsx` component
2. `transcript-source-badge.tsx` component
3. Update `content-table.tsx` with type column/filter
4. Update `/content/[id]/page.tsx` for podcast metadata
5. Update filters component
6. Dashboard stats by type

### Sprint 5: Seed & Polish
**Estimated Files: 4-6**

1. RSS feed discovery script
2. `scripts/seed-podcasts.ts`
3. Run initial import of 18 podcasts × 10 episodes
4. End-to-end testing
5. Documentation
6. Bug fixes and polish

---

## Technical Notes

### RSS Feed Parsing Libraries
- Primary: `rss-parser` - Well-maintained, supports custom fields
- Fallback: `fast-xml-parser` for edge cases

### Transcript Format Handling
Podcasting 2.0 supports multiple formats:
- `text/plain` - Direct text, easiest
- `text/html` - Need to strip HTML
- `text/vtt` or `application/x-subrip` - Parse timing, extract text
- `application/json` - Parse structured segments

### Deduplication Strategy
When same interview exists on YouTube AND podcast RSS:
- Check if content with same title + similar date exists
- If podcast has RSS transcript, prefer it
- Mark as "duplicate" in metadata but keep both for reference

### Error Handling
- RSS parsing errors: Log and mark source as needing attention
- Transcript not found: Mark content status, show in UI
- No ASR fallback: Content stays in "PENDING_TRANSCRIPT" state

---

## Success Criteria

1. **18 podcast sources** added and actively monitored
2. **180 episodes** imported (18 × 10 episodes each)
3. **Daily polling** working for new episodes
4. **Transcript coverage** > 80% via RSS/scraping (no ASR)
5. **UI clearly shows** content type differentiation
6. **Zero disruption** to existing YouTube functionality

---

## Future Phases (Out of Scope)

- **ASR Integration:** Add Whisper API when transcript coverage drops below acceptable
- **Twitter Integration:** Monitor AI thought leaders
- **Newsletter Integration:** Stratechery, The AI Letter, etc.
- **Cross-Content Deduplication:** Smart matching of same interview across platforms
- **Trend Analysis:** AI-powered trend detection across all sources
