Below is a practical “source registry” table format (same structure as the CSV/JSON I generated):

| source_id | source_name                  | initial_url    | transcript_strategy                                          |
| --------- | ---------------------------- | -------------- | ------------------------------------------------------------ |
| 1         | 20 VC                        | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 2         | BG2 Pod                      | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 3         | Big Technology Podcast       | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 4         | Dwarkesh Podcast             | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 5         | Google AI Release Notes      | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 6         | Google DeepMind: The Podcast | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 7         | Hard Fork                    | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 8         | Lenny’s Podcast              | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 9         | Lex Fridman Podcast          | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 10        | No Priors                    | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 11        | The 80,000 Hours Podcast     | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 12        | The a16z Show                | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 13        | The Cognitive Revolution     | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 14        | The Logan Bartlett Show      | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 15        | The Mad Podcast              | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 16        | The OpenAI Podcast           | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 17        | Uncapped                     | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |
| 18        | Y Combinator Startup Podcast | (tracking URL) | rss_podcast_transcript → scrape_episode_page → yt_captions → ASR |

If you want, you can add columns like `rss_url`, `website_url`, `platform` once your resolver discovers canonical destinations.

| #    | Podcast                      | Canonical URL                             |
| ---- | ---------------------------- | ----------------------------------------- |
| 1    | 20 VC                        | https://www.thetwentyminutevc.com/        |
| 2    | BG2 Pod                      | https://www.bg2pod.com/                   |
| 3    | Big Technology Podcast       | https://www.bigtechnology.com/            |
| 4    | Dwarkesh Podcast             | https://www.dwarkeshpatel.com/podcast     |
| 5    | Google AI Release Notes      | https://ai.google/updates/                |
| 6    | Google DeepMind: The Podcast | https://deepmind.google/discover/podcast/ |
| 7    | Hard Fork                    | https://www.nytimes.com/column/hard-fork  |
| 8    | Lenny’s Podcast              | https://www.lennyspodcast.com/            |
| 9    | Lex Fridman Podcast          | https://lexfridman.com/podcast/           |
| 10   | No Priors                    | https://www.nopriors.com/                 |
| 11   | The 80,000 Hours Podcast     | https://80000hours.org/podcast/           |
| 12   | The a16z Show                | https://a16z.com/podcasts/                |
| 13   | The Cognitive Revolution     | https://www.cognitiverevolution.ai/       |
| 14   | The Logan Bartlett Show      | https://www.loganbartlett.com/podcast     |
| 15   | The MAD Podcast              | https://www.madpod.com/                   |
| 16   | The OpenAI Podcast           | https://openai.com/podcast/               |
| 17   | Uncapped                     | https://uncapped.com/podcast              |
| 18   | Y Combinator Startup Podcast | https://www.ycombinator.com/podcast       |

------

## 2) A clean data schema for “Disruption Weekly” ingestion + digestion

### Option A: Minimal JSON schema (fast to implement)

Use this when you want speed and flexibility.

```json
{
  "source": {
    "source_id": "int",
    "source_name": "string",
    "seed_url": "string",
    "resolved_home_url": "string|null",
    "resolved_rss_url": "string|null",
    "enabled": "bool",
    "tags": ["string"],
    "default_language": "string|null",
    "ingestion_policy": {
      "poll_interval_hours": "int",
      "max_episodes_per_run": "int",
      "transcript_preference_order": [
        "rss_podcast_transcript",
        "episode_page_transcript",
        "youtube_captions",
        "third_party_transcript",
        "asr_transcription"
      ]
    }
  },
  "episode": {
    "episode_id": "string (uuid)",
    "source_id": "int",
    "title": "string",
    "published_at": "datetime",
    "guid": "string|null",
    "audio_url": "string|null",
    "episode_url": "string|null",
    "duration_seconds": "int|null",
    "hash_audio_sha256": "string|null"
  },
  "transcript": {
    "transcript_id": "string (uuid)",
    "episode_id": "string (uuid)",
    "provider": "enum: official|rss_tag|scraped|youtube|third_party|asr",
    "format": "enum: text/plain|text/html|text/vtt|application/json|application/x-subrip",
    "language": "string|null",
    "retrieved_at": "datetime",
    "raw_text": "string",
    "segments": [
      {
        "start_ms": "int|null",
        "end_ms": "int|null",
        "speaker": "string|null",
        "text": "string",
        "confidence": "float|null"
      }
    ]
  },
  "digestion": {
    "episode_id": "string (uuid)",
    "run_id": "string (uuid)",
    "summary": "string",
    "key_quotes": [{"quote": "string", "speaker": "string|null", "start_ms": "int|null"}],
    "topics": [{"label": "string", "score": "float"}],
    "entities": [{"name": "string", "type": "string", "salience": "float"}],
    "insights": [{"claim": "string", "evidence_spans": ["(start_ms,end_ms)"]}]
  }
}
```

### Option B: Relational schema (best for scale + audit trails)

This is the “grown-up” version when you care about lineage and reprocessing.

Core tables:

- `sources`
- `episodes`
- `assets` (audio files, episode HTML, etc.)
- `transcripts`
- `transcript_segments`
- `processing_runs`
- `digests`
- `embeddings` (optional)

If you’re storing embeddings in Postgres, **pgvector** is the obvious move. ([GitHub](https://github.com/pgvector/pgvector?utm_source=chatgpt.com))

------

## 3) Transcript acquisition “ladder” (the strategy that survives the real world)

### Tier 1: Pull transcripts directly from RSS (best case)

Many modern podcast feeds can include a transcript link using the Podcasting 2.0 namespace:

- The `<podcast:transcript>` tag can point to HTML, plain text, VTT, SRT, JSON, etc. ([Podcasting 2.0](https://podcasting2.org/podcast-namespace/tags/transcript?utm_source=chatgpt.com)) ([Podcasting 2.0](https://podcasting2.org/docs/podcast-namespace/1.0?utm_source=chatgpt.com))
- Some platforms (and tooling ecosystems) are explicitly building around this. ([Podcasting 2.0](https://podcasting2.org/docs/podcast-namespace?utm_source=chatgpt.com))

**Implementation notes**

- Parse RSS → inspect each `<item>` for `<podcast:transcript>` entries → download transcript file.
- Use a feed parser (classic: `feedparser`) ([PyPI](https://pypi.org/project/feedparser/5.2.0/?utm_source=chatgpt.com)) or a faster alternative like FastFeedParser ([GitHub](https://github.com/kagisearch/fastfeedparser?utm_source=chatgpt.com)).

### Tier 2: Scrape the episode page for “Transcript” sections (common case)

Many podcasts publish transcripts as part of show notes pages.

**Tools**

- HTTP fetching: `httpx` ([GitHub](https://github.com/encode/httpx?utm_source=chatgpt.com))
- HTML extraction: `trafilatura` (good at grabbing main content + metadata and supports crawling/feeds) ([GitHub](https://github.com/adbar/trafilatura?utm_source=chatgpt.com))
- If pages are JS-heavy or behind dynamic rendering: `playwright` ([GitHub](https://github.com/microsoft/playwright-python?utm_source=chatgpt.com))

**Coding strategy**

- Build a “TranscriptLocator” that tries patterns in order:
  1. `<a>` with text matching `Transcript|Full transcript|Read transcript`
  2. `<details>` / `<summary>` blocks
  3. Embedded JSON-LD or script tags containing transcript text
  4. If nothing found, fall through.

### Tier 3: Pull captions/transcripts from YouTube (frequent fallback)

If an episode is mirrored to YouTube, you can often pull captions/subtitles.

- `yt-dlp` supports downloading audio/video across many sites and is widely used for this kind of extraction work. ([GitHub](https://github.com/yt-dlp/yt-dlp?utm_source=chatgpt.com))

### Tier 4: Generate your own transcript (always works if you have audio)

This is your “guarantee” layer.

**ASR options**

- **OpenAI Whisper** for robust speech recognition. ([GitHub](https://github.com/openai/whisper?utm_source=chatgpt.com))
- **faster-whisper** for a faster Whisper implementation using CTranslate2; often less memory and faster in practice. ([GitHub](https://github.com/SYSTRAN/faster-whisper?utm_source=chatgpt.com))
- **WhisperX** when you want *word-level timestamps* + diarization integration (very useful for quotable clips and citations). ([GitHub](https://github.com/m-bain/whisperX?utm_source=chatgpt.com))
- **pyannote.audio** if you want strong speaker diarization (who spoke when). ([GitHub](https://github.com/pyannote/pyannote-audio?utm_source=chatgpt.com))

**Practical tip:** store both:

- a clean text transcript for summarization
- a segmented transcript with timestamps + speakers for “quote provenance” and clip generation

### Tier 5: Third-party transcript vendors (optional accelerator)

Useful if you don’t want to run ASR infrastructure.

- Example: Podscribe markets AI podcast transcription and repurposing workflows. ([Podscribe](https://www.podscribeaudio.com/?utm_source=chatgpt.com))
- Listen Notes is explicit that **most episodes don’t include transcripts** and suggests using audio URLs + third-party speech-to-text. ([Listen Notes Help Center](https://www.listennotes.help/article/35-how-to-get-transcripts-of-any-podcast-episodes-using-podcast-api?utm_source=chatgpt.com))

------

## 4) Framework + architecture recommendations (so this becomes a “machine”)

### Orchestration

Pick one:

- **Prefect** (Python-first, resilient retries/caching; nice developer UX). ([GitHub](https://github.com/PrefectHQ/prefect?utm_source=chatgpt.com))
- **Dagster** (asset-centric pipelines, lineage/observability built-in). ([GitHub](https://github.com/dagster-io/dagster?utm_source=chatgpt.com))
- **Airflow** if you already live in that ecosystem / need classic scheduling at scale. ([GitHub](https://github.com/apache/airflow?utm_source=chatgpt.com))

### Storage

A clean default stack:

- Postgres for metadata + transcripts
- `pgvector` for embeddings + similarity search across episodes/quotes/claims ([GitHub](https://github.com/pgvector/pgvector?utm_source=chatgpt.com))
- Object storage (S3/GCS/R2) for audio + raw HTML snapshots (keeps things reproducible)

### LLM digestion layer (optional but powerful)

- **LlamaIndex** (data framework over your corpus; lots of connectors) ([GitHub](https://github.com/run-llama/llama_index?utm_source=chatgpt.com))
- **LangChain** if you want a broad agent/tooling ecosystem ([GitHub](https://github.com/langchain-ai/langchain?utm_source=chatgpt.com))

------

## 5) Coding strategies that make this reliable (and not a weekly fire drill)

### A. Treat each podcast as a “connector”

A connector is just a config + a couple of override hooks:

- `discover_episodes()` (RSS by default)
- `get_transcript(episode)` (tries Tier 1→4 ladder)
- `normalize(transcript)` (cleaning + segmentation)

This keeps your engine extensible when you add 20 more podcasts next month.

### B. Make ingestion idempotent

Everything should be re-runnable without duplicating:

- episode uniqueness: `(source_id, guid)` or `(source_id, audio_url)`
- transcript uniqueness: `(episode_id, provider, version_hash)`

### C. Keep “raw” artifacts

Store:

- raw RSS item JSON
- raw episode HTML
- raw transcript payload (HTML/VTT/JSON)
- raw audio hash

When extraction breaks (and it will), you can reprocess without refetching.

### D. Normalize to a single internal transcript format

Even if inputs are HTML/VTT/SRT:

- convert to: `{segments:[{start_ms,end_ms,speaker,text}], raw_text}`
- keep the original for audit

### E. Quality controls

- language detection
- profanity/PII filters (optional)
- “hallucination checks” for ASR (e.g., sudden non sequiturs, repeated phrases)
- segment length constraints (for downstream LLM cost + retrieval precision)

------

## 6) If you want one “default implementation path” (battle-tested)

If your goal is: **100% coverage, minimal human babysitting**, I’d build the pipeline like this:

1. **RSS poll** (feedparser / fastfeedparser) ([PyPI](https://pypi.org/project/feedparser/5.2.0/?utm_source=chatgpt.com))
2. Check `<podcast:transcript>` tag first ([Podcasting 2.0](https://podcasting2.org/podcast-namespace/tags/transcript?utm_source=chatgpt.com))
3. If missing, **scrape episode page** (httpx + trafilatura; playwright fallback) ([GitHub](https://github.com/encode/httpx?utm_source=chatgpt.com))
4. If still missing, **download audio** (RSS enclosure URL; yt-dlp when needed) ([GitHub](https://github.com/yt-dlp/yt-dlp?utm_source=chatgpt.com))
5. **Transcribe** with faster-whisper → WhisperX if you need timestamps/speakers ([GitHub](https://github.com/SYSTRAN/faster-whisper?utm_source=chatgpt.com))
6. **Store + embed + digest** (Postgres + pgvector + your LLM layer) ([GitHub](https://github.com/pgvector/pgvector?utm_source=chatgpt.com))

------

