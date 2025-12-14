# Podcast RSS Feed Discovery Report

**Generated:** December 14, 2024
**Status:** Dry-Run Complete - Awaiting Approval

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Podcasts in PRD | 18 |
| Successfully Discovered | **13** |
| Failed/Not Found | 5 |
| With RSS Transcript Tags | **0** |

### Key Finding
**None of the 13 discovered podcasts have `<podcast:transcript>` tags in their RSS feeds.** This means transcript acquisition will rely on:
1. **Page scraping** - Scrape episode pages for embedded transcripts
2. **YouTube fallback** - Many podcasts have YouTube mirrors with captions
3. **Future ASR** - Whisper API integration (deferred per plan)

---

## Successfully Discovered Podcasts (13)

| # | Podcast | Episodes | RSS Feed URL |
|---|---------|----------|--------------|
| 1 | **20 VC** | 1,394 | `https://thetwentyminutevc.libsyn.com/rss` |
| 2 | **BG2 Pod** | 41 | `https://anchor.fm/s/f06c2370/podcast/rss` |
| 3 | **Big Technology Podcast** | 20 | `https://www.bigtechnology.com/feed` |
| 4 | **Dwarkesh Podcast** | 112 | `https://api.substack.com/feed/podcast/69345.rss` |
| 5 | **Google DeepMind: The Podcast** | 45 | `https://feeds.simplecast.com/JT6pbPkg` |
| 6 | **Hard Fork** | 170 | `https://feeds.simplecast.com/l2i9YnTd` |
| 7 | **Lenny's Podcast** | 313 | `https://api.substack.com/feed/podcast/10845.rss` |
| 8 | **Lex Fridman Podcast** | 488 | `https://lexfridman.com/feed/podcast/` |
| 9 | **No Priors** | 144 | `https://feeds.megaphone.fm/nopriors` |
| 10 | **The a16z Show** | 982 | `https://feeds.simplecast.com/JGE3yC0V` |
| 11 | **The Cognitive Revolution** | 15 | `https://www.cognitiverevolution.ai/latest/rss/` |
| 12 | **The MAD Podcast** | 102 | `https://anchor.fm/s/f2ee4948/podcast/rss` |
| 13 | **Y Combinator Startup Podcast** | 287 | `https://anchor.fm/s/8c1524bc/podcast/rss` |

**Total Episodes Available:** ~4,113 episodes across 13 podcasts

---

## Failed/Not Found Podcasts (5)

| Podcast | Reason | Resolution |
|---------|--------|------------|
| **Google AI Release Notes** | Not a podcast | **Remove from list** - This is a blog/news section, not a podcast |
| **The 80,000 Hours Podcast** | 404 error on RSS | **Manual lookup needed** - Podcast exists but RSS URL changed |
| **The Logan Bartlett Show** | RSS parsing error | **Manual lookup needed** - Feed exists but has XML issues |
| **The OpenAI Podcast** | No RSS discovered | **Verify existence** - May not have public RSS feed |
| **Uncapped** | No RSS discovered | **Wrong URL in PRD** - uncapped.com/podcast doesn't exist |

### Recommendations for Failed Podcasts

1. **Remove "Google AI Release Notes"** - Not a podcast, just news updates
2. **80,000 Hours** - Try alternative: `https://feeds.transistor.fm/80000-hours-podcast-episodes`
3. **Logan Bartlett Show** - Try: `https://feeds.simplecast.com/LpAGSLnY`
4. **OpenAI Podcast** - May need to be removed or monitored via YouTube only
5. **Uncapped** - Consider "Uncapped with Jack Altman" instead: Apple Podcasts ID 1801867202

---

## Latest Episodes (Sample)

| Podcast | Latest Episode | Date |
|---------|----------------|------|
| 20 VC | How Wiz Built a $30BN Brand in Enterprise | Dec 12, 2025 |
| BG2 Pod | All things AI w/ @altcap @sama & @satyanadella | Oct 31, 2025 |
| Google DeepMind | The Arrival of AGI with Shane Legg | Dec 11, 2025 |
| Hard Fork | Australia Kicks Kids Off Social Media | Dec 12, 2025 |
| Lenny's Podcast | Why humans are AI's biggest bottleneck | Dec 14, 2025 |
| Lex Fridman | Irving Finkel: Deciphering Ancient Secrets | Dec 12, 2025 |
| No Priors | Future of Voice AI with ElevenLabs | Dec 11, 2025 |
| The a16z Show | AI Eats the World with Benedict Evans | Dec 12, 2025 |
| Y Combinator | The End of the Designer-Engineer Divide | Dec 12, 2025 |

---

## Transcript Strategy Assessment

### RSS Transcript Tags: None Available
Unfortunately, none of the discovered podcasts use the Podcasting 2.0 `<podcast:transcript>` tag, which would provide direct transcript URLs.

### Alternative Transcript Sources

| Podcast | Website Transcripts | YouTube Mirror |
|---------|-------------------|----------------|
| Dwarkesh Podcast | ✅ Substack posts have transcripts | ✅ YouTube channel |
| Lex Fridman Podcast | ✅ Website has transcripts | ✅ YouTube channel |
| Lenny's Podcast | ✅ Substack posts have transcripts | ✅ YouTube channel |
| Hard Fork | ✅ NYTimes may have transcripts | ❓ Limited |
| No Priors | ❓ Check website | ✅ YouTube channel |
| 20 VC | ❓ Check website | ✅ YouTube channel |
| The a16z Show | ❓ Check website | ✅ YouTube channel |

### Transcript Coverage Estimate
- **High confidence (page scraping):** ~50% of episodes
- **YouTube fallback:** ~30% additional coverage
- **Remaining (needs ASR):** ~20%

---

## Import Plan (If Approved)

### Phase 1: Database Setup
```bash
npx prisma migrate dev --name add-podcast-support
```

### Phase 2: Import Sources
Import 13 podcasts as PODCAST type sources with:
- RSS feed URL
- Check frequency: Daily
- Status: Active

### Phase 3: Initial Episode Import
- Episodes per podcast: **5** (for testing)
- Total episodes: ~65
- Transcript strategy: Page scraping → YouTube fallback

### Phase 4: Validation
- Verify ingestion pipeline works
- Test transcript acquisition
- Confirm analysis runs successfully
- Expand to 10 episodes per podcast if successful

---

## Files Generated

| File | Description |
|------|-------------|
| `scripts/podcast-discovery-results.json` | Full discovery results (JSON) |
| `scripts/podcast-discovery-results.csv` | Summary for spreadsheet import |
| `scripts/discover-podcast-feeds.ts` | Discovery script (reusable) |

---

## Decision Points

### Awaiting Your Confirmation:

1. **Proceed with 13 podcasts?**
   - Remove the 5 failed podcasts from scope
   - Or: Manually find RSS feeds for Logan Bartlett & 80,000 Hours?

2. **Import 5 episodes per podcast (65 total) for initial test?**
   - Or: Jump to 10 episodes (130 total)?

3. **Accept transcript fallback strategy?**
   - Page scraping as primary
   - YouTube captions as secondary
   - Mark remaining as TRANSCRIPT-UNAVAILABLE

4. **Begin Sprint 1 implementation?**
   - Database migration
   - Podcast ingestion module
   - Page scraping transcript strategy

---

## Next Steps (Upon Approval)

1. Run database migration for ContentType enum
2. Create `src/lib/ingestion/podcast.ts` module
3. Create page scraping transcript strategy
4. Modify Inngest jobs for PODCAST type
5. Import 13 podcast sources
6. Seed 5 episodes each for testing
7. Validate end-to-end pipeline
8. Expand to full 10 episodes per podcast
