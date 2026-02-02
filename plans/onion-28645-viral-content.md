# Implementation Plan: onion-28645 - Viral Pizza Content Import System

## Task ID
**onion-28645**

## Description
Automated/semi-automated system to discover, import, and store viral pizza content from multiple platforms.

---

## Platform Analysis

### Tier 1: Easy Access (No/Free Auth)
| Platform | Content Type | API | Notes |
|----------|--------------|-----|-------|
| **Reddit** | Mixed | Free JSON | r/pizza (2.1M), r/pizzacrimes, r/FoodPorn |
| **GIPHY** | GIFs | Free | Pizza search, trending |
| **Tenor** | GIFs | Free | Google-owned, huge GIF library |
| **Imgur** | Images/GIFs | Free | Reddit crosspost source |
| **YouTube** | Videos | Free | Search + filter by view count |
| **Unsplash** | Photos | Free | High-quality, royalty-free |
| **Pexels** | Photos/Videos | Free | Stock content, royalty-free |
| **Pixabay** | Photos/Videos | Free | Stock content, royalty-free |
| **Flickr** | Photos | Free | Creative Commons pizza photos |

### Tier 2: Medium Effort (API Application)
| Platform | Content Type | API | Notes |
|----------|--------------|-----|-------|
| **TikTok** | Videos | Apply | Developer approval needed |
| **Pinterest** | Images | Apply | Business account required |
| **Tumblr** | Mixed | Free | Pizza tag, easy API |

### Tier 3: Creative Sources (Scraping)
| Platform | Content Type | Method | Notes |
|----------|--------------|--------|-------|
| **Know Your Meme** | Memes | Scrape | Pizza-related meme pages |
| **9GAG** | Memes | Scrape | No official API |

---

## Database Migration: `004_import_sources.sql`

```sql
-- Track import sources
CREATE TABLE import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_identifier TEXT NOT NULL,
  display_name TEXT,
  last_fetched_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, source_identifier)
);

-- Track import jobs
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES import_sources(id),
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  items_found INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_import_sources_platform ON import_sources(platform);
CREATE INDEX idx_import_sources_active ON import_sources(is_active);
CREATE INDEX idx_import_logs_source ON import_logs(source_id);
CREATE INDEX idx_import_logs_status ON import_logs(status);

-- Prevent duplicate imports via source_url
CREATE UNIQUE INDEX idx_content_source_url ON content(source_url) WHERE source_url IS NOT NULL;
```

---

## Files to Create

### Import Scripts
| File | Platform | Priority |
|------|----------|----------|
| `scripts/import-reddit.mjs` | Reddit | P1 |
| `scripts/import-giphy.mjs` | GIPHY | P1 |
| `scripts/import-tenor.mjs` | Tenor | P1 |
| `scripts/import-youtube.mjs` | YouTube | P1 |
| `scripts/import-imgur.mjs` | Imgur | P2 |
| `scripts/import-unsplash.mjs` | Unsplash | P2 |
| `scripts/import-pexels.mjs` | Pexels | P2 |
| `scripts/import-pixabay.mjs` | Pixabay | P2 |
| `scripts/import-flickr.mjs` | Flickr | P3 |
| `scripts/import-tumblr.mjs` | Tumblr | P3 |
| `scripts/import-knowyourmeme.mjs` | Know Your Meme | P3 |
| `scripts/import-9gag.mjs` | 9GAG | P3 |

### Shared Libraries
| File | Purpose |
|------|---------|
| `scripts/lib/content-importer.mjs` | Shared import utilities |
| `scripts/lib/rate-limiter.mjs` | Rate limiting with backoff |
| `scripts/lib/deduplicator.mjs` | Check source_url before import |
| `scripts/lib/auto-tagger.mjs` | Extract tags from titles |

### Admin UI
| File | Purpose |
|------|---------|
| `src/app/admin/imports/page.tsx` | Import dashboard |
| `src/components/admin/ImportSourceCard.tsx` | Source status card |
| `src/components/admin/ImportLogTable.tsx` | Recent import logs |

### Automation
| File | Purpose |
|------|---------|
| `supabase/functions/scheduled-import/index.ts` | Cron Edge Function |

---

## Environment Variables

```env
# Tier 1 - Free APIs
GIPHY_API_KEY=
TENOR_API_KEY=
YOUTUBE_API_KEY=
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
FLICKR_API_KEY=

# Reddit (optional - can use public JSON)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=pizza-content-bot/1.0

# Tier 2 - Requires Application
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
PINTEREST_ACCESS_TOKEN=
TUMBLR_API_KEY=
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Database migration
2. Shared libraries (importer, rate-limiter, deduplicator)
3. Admin dashboard skeleton

### Phase 2: Tier 1 Sources (High Priority)
1. Reddit importer (r/pizza, r/pizzacrimes)
2. GIPHY importer
3. Tenor importer
4. YouTube importer

### Phase 3: Tier 1 Sources (Stock Content)
5. Unsplash importer
6. Pexels importer
7. Pixabay importer
8. Imgur importer

### Phase 4: Tier 2 & 3 Sources
9. Tumblr importer
10. Flickr importer
11. Know Your Meme scraper
12. 9GAG scraper

### Phase 5: Automation
13. Scheduled Edge Function
14. Auto-tagging from titles
15. Admin notifications

### Phase 6: Future (After API Approval)
16. TikTok importer
17. Pinterest importer

---

## Import Script Pattern

```javascript
// scripts/import-{platform}.mjs
import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

const importer = new ContentImporter({
  platform: 'platform_name',
  sourceIdentifier: 'pizza',
  rateLimiter: new RateLimiter({ requestsPerMinute: 30 })
})

async function fetchContent() {
  // Platform-specific API call
}

async function transformToContent(item) {
  return {
    type: 'gif', // or 'meme', 'video'
    title: item.title,
    url: item.media_url,
    thumbnail_url: item.thumbnail,
    source_url: item.permalink,
    source_platform: 'platform_name',
    tags: extractTags(item.title),
    status: 'approved' // No moderation queue
  }
}

await importer.run(fetchContent, transformToContent)
```

---

## Content Type Mapping

| Platform | Default Type | Notes |
|----------|--------------|-------|
| Reddit | Mixed | Detect from URL extension |
| GIPHY | gif | Always GIFs |
| Tenor | gif | Always GIFs |
| YouTube | video | Always videos |
| Unsplash | meme | High-quality photos |
| Pexels | meme/video | Both available |
| Pixabay | meme/video | Both available |
| Imgur | gif/meme | Detect from extension |
| Flickr | meme | Photos |
| Tumblr | Mixed | Detect from post type |
| Know Your Meme | meme | Meme images |
| 9GAG | meme | Meme images |

---

## Admin Dashboard Features

- List all configured sources with status
- Toggle sources on/off
- Manual "Import Now" button per source
- View recent import logs
- Stats: total imported, by platform, by type
- Error alerts for failed imports

---

## Verification Steps

1. Each importer runs without errors
2. Deduplication prevents duplicate imports
3. Rate limiting respects API limits
4. Source attribution stored correctly
5. Admin dashboard shows all sources
6. Manual import trigger works
7. Scheduled function runs on cron
8. Auto-tagging extracts relevant tags

---

## API Documentation Links

- [Reddit JSON](https://www.reddit.com/dev/api/)
- [GIPHY API](https://developers.giphy.com/docs/api/)
- [Tenor API](https://tenor.com/gifapi/documentation)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Unsplash API](https://unsplash.com/documentation)
- [Pexels API](https://www.pexels.com/api/documentation/)
- [Pixabay API](https://pixabay.com/api/docs/)
- [Flickr API](https://www.flickr.com/services/api/)
- [Tumblr API](https://www.tumblr.com/docs/en/api/v2)
