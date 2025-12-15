# Disruption Radar

**AI-Powered Trend Intelligence by Deven Spear**

A content intelligence platform for monitoring, transcribing, and analyzing video and podcast content from thought leaders in tech, AI, and venture capital.

**Live**: [https://disrad.deven.network](https://disrad.deven.network)

> **Note**: This is proprietary software. Unauthorized use, distribution, or modification is prohibited.

## Features

### Content Sources
- **YouTube Channels** - Monitor channels for new videos, auto-fetch transcripts
- **Podcasts** - RSS feed monitoring with multi-tier transcript acquisition
- **Twitter/X Accounts** - Monitor influential accounts for tweets, threads, and Twitter Articles (long-form posts)
- **Substack** - Newsletter monitoring and content extraction

### Transcript Acquisition
Multi-strategy approach for maximum transcript coverage:
1. **YouTube Auto** - Native YouTube captions
2. **RSS Transcript** - Podcasting 2.0 `<podcast:transcript>` tags
3. **Page Scraping** - Extract transcripts from episode show notes
4. **YouTube Fallback** - For podcasts with YouTube mirrors

### AI Analysis
Dual-provider AI analysis with automatic fallback:
- **Primary**: Claude Sonnet 4.5 (Anthropic)
- **Fallback**: GPT-4o (OpenAI) - activated on timeout or error
- Key insights extraction
- Quotable lines identification
- Relevance scoring (0-100%)
- Disruption signals detection
- Customizable analysis prompts

### Executive Briefing
- AI-generated summary of recent analyses
- Configurable time period (7, 14, 30, 60, 90 days)
- Key themes and trends identification
- Notable quotes and disruption signals
- Token usage tracking
- Persisted in database (accessible across browsers)

### Content Library
- Full-featured table with resizable columns
- Column types: Type, Title, Source, Status, Words, Score, Published
- Checkbox selection for batch operations
- Batch actions: Process, Analyze, Archive, Delete
- Sortable columns with asc/desc ordering
- Content type icons (Video/Podcast/Article/Tweet)
- Transcript source badges (YouTube, RSS, Scraped, etc.)
- Filtering by status, source type, and search
- Infinite scroll pagination

### Dashboard
- Real-time stats: Total Content, Analyzed, Processing, Pending
- Average relevance score display
- Recent content and analyses overview
- Quick action buttons
- Source management (add/pause/delete sources)

### Content Detail View
- 1/3 transcript + 2/3 analysis layout
- Collapsible analysis sections with icons
- AI model attribution (shows which model was used)
- Transcript viewer with word count and source info
- Direct link to original content

### Settings & Data Management
- **API Usage Dashboard** - Track token usage and costs by month/model
- **Database Overview** - Live view of all database tables and record counts
- **Data Management** - Configure retention period (7-90 days)
- **Purge Controls** - Preview and execute purge of old transcripts/logs
- **Analysis Prompts** - Customize AI analysis instructions
- **System Logs** - View application activity and errors

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **Background Jobs**: Inngest
- **AI**: Anthropic Claude Sonnet 4.5 / OpenAI GPT-4o
- **Transcript Service**: Railway (YouTube transcript extraction)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)
- Anthropic API key (and/or OpenAI API key)

### Installation

```bash
# Clone the repository
git clone https://github.com/devenspear/disruption-intel.git
cd disruption-intel

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

Create a `.env.local` file with:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AI Providers
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# Inngest (for background jobs)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Transcript Service (Railway deployment)
TRANSCRIPT_SERVICE_URL="https://transcript-service-production.up.railway.app"

# Twitter/X API (TwitterAPI.io)
TWITTER_API_KEY="your-twitter-api-key"
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio
npx prisma studio
```

### Seed Podcast Data

Import the curated list of 13 tech/AI podcasts:

```bash
npx tsx scripts/seed-podcasts.ts
```

This imports:
- 20 VC
- BG2 Pod
- Big Technology Podcast
- Dwarkesh Podcast
- Google DeepMind: The Podcast
- Hard Fork
- Lenny's Podcast
- Lex Fridman Podcast
- No Priors
- The a16z Show
- The Cognitive Revolution
- The MAD Podcast
- Y Combinator Startup Podcast

### Running the App

```bash
# Development server
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Running Inngest Dev Server

For background job processing (transcript fetching, analysis):

```bash
npx inngest-cli@latest dev
```

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Main dashboard pages
│   │   ├── page.tsx       # Dashboard with stats
│   │   ├── content/       # Content library & detail views
│   │   ├── sources/       # Source management
│   │   ├── search/        # Content search
│   │   └── settings/      # App settings, prompts, logs
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── content/          # Content table, filters
│   ├── analysis/         # Analysis display with sections
│   └── sources/          # Source cards, forms
├── lib/                   # Utilities and services
│   ├── ai/               # AI provider integrations (Claude/OpenAI)
│   ├── ingestion/        # Content ingestion modules
│   │   ├── podcast.ts    # RSS feed parsing
│   │   ├── youtube.ts    # YouTube API integration
│   │   ├── twitter.ts    # Twitter/X API + Article parsing
│   │   └── transcript-strategies/  # Multi-tier transcript acquisition
│   ├── logger.ts         # Structured logging system
│   └── db.ts             # Prisma client
├── inngest/              # Background job functions
│   ├── client.ts         # Inngest client
│   └── functions/        # Job definitions (analyze, transcribe)
└── prisma/
    └── schema.prisma     # Database schema
```

## Content Types

| Type | Source | Transcript Strategy |
|------|--------|---------------------|
| `VIDEO` | YouTube Channel | YouTube Auto Captions |
| `PODCAST_EPISODE` | RSS Feed | RSS → Page Scrape → YouTube Fallback |
| `SOCIAL_POST` | Twitter/X | Tweet text + Twitter Article content |
| `ARTICLE` | Substack/RSS | Article body extraction |

### Twitter/X Content Handling

Twitter/X sources support multiple content types:
- **Regular Tweets** - Direct text content with quoted tweets included
- **Twitter Articles** - Long-form posts (daily newsletters, etc.) with:
  - Article title extraction
  - Preview text (~200 chars from API)
  - Cover image as thumbnail
  - Article URL for reference
- **Threads** - Multi-tweet threads as single content items

Content with less than 10 words (link-only tweets) is automatically skipped for AI analysis.

## AI Analysis Flow

```
Content →
  Try Claude Sonnet 4.5 (90s timeout) →
    Success → Save with model="claude-sonnet-4-5-20250929"
    Timeout/Error → Fallback to GPT-4o →
      Success → Save with model="gpt-4o"
      Error → Mark as FAILED
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Deploy to Vercel (auto-increments version) |
| `npm run version:patch` | Bump patch version |
| `npm run version:minor` | Bump minor version |
| `npx tsx scripts/seed-podcasts.ts` | Import podcast sources |
| `npx tsx scripts/discover-podcast-feeds.ts` | Discover RSS feeds from URLs |

## API Endpoints

### Content
- `GET /api/content` - List content with filtering (Type, Title, Source, Status, Words, Score, Published)
- `GET /api/content/[id]` - Get content details with transcript and analysis
- `POST /api/content/[id]/analyze` - Trigger AI analysis
- `GET /api/content/[id]/transcript` - Get transcript details

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Sources
- `GET /api/sources` - List all sources
- `POST /api/sources` - Add new source
- `POST /api/sources/[id]/check` - Check for new content
- `POST /api/sources/[id]/process` - Process pending content

### Search
- `GET /api/search` - Full-text search across content

### Settings
- `GET /api/prompts` - List analysis prompts
- `GET /api/logs` - View application logs
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update a system setting

### Executive Briefing
- `GET /api/briefings` - Get latest executive briefing
- `POST /api/briefings` - Save new briefing
- `POST /api/analysis/summary` - Generate AI summary of recent analyses

### Data Management
- `GET /api/purge?days=30` - Preview what would be purged
- `POST /api/purge` - Execute purge of old transcripts/logs

### Statistics
- `GET /api/stats/usage` - API usage and cost statistics
- `GET /api/stats/database` - Database overview and record counts

## Deployment

### Vercel (Frontend)

```bash
npm run deploy
```

The deploy command auto-increments the version number before deploying.

Ensure environment variables are configured in Vercel dashboard.

### Railway (Transcript Service)

The YouTube transcript service is deployed on Railway:
- URL: `https://transcript-service-production.up.railway.app`
- Endpoint: `GET /transcript/:videoId`

### Required Services
- PostgreSQL database (Neon recommended)
- Inngest account for background jobs
- Anthropic API access (Claude)
- OpenAI API access (fallback)
- Railway (for transcript service)
- TwitterAPI.io account (for Twitter/X monitoring)

## Version

See `package.json` for current version. Version is displayed in the app footer with a link to the GitHub repository.

## License

Private - All rights reserved.
