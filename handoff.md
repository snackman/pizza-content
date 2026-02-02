# Pizza Content Platform - Handoff Document

## Project Overview
Pizza content repository platform with GIFs, memes, videos, music, photos, and user submissions.

- **Live Site:** https://pizza-content.vercel.app
- **GitHub:** https://github.com/snackman/pizza-content
- **Supabase Project:** hecsxlqeviirichoohkl
- **Task Sheet:** https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE

---

## Current Status

### All Features Deployed

| Feature | URL | Status |
|---------|-----|--------|
| Pizza Music | /music | 244 tracks from Google Drive |
| Pizza Radio | /radio | Streaming player |
| Live Stream | /live | Visual content + music playback |
| Submit | /submit | User submissions |
| Requests | /requests | Bounty system |
| Account | /account | Dashboard with favorites |
| Admin Imports | /admin/imports | Viral content import |

---

## Database Content Summary

| Type | Count | Source |
|------|-------|--------|
| Music | 244 | Google Drive sync |
| GIFs | 63 | GIPHY (35) + Original uploads (28) |
| Memes | 12 | Reddit r/pizza |
| Videos | 19 | YouTube imports |
| Photos | 30 | Pexels (15) + Pixabay (15) |
| **Total** | **368** | |

---

## Recent Session Changes (2026-02-01)

### Features Added

1. **LiveStreamMusic Component** (`src/components/live/LiveStreamMusic.tsx`)
   - New component for playing music on the livestream page
   - Fetches music tracks from Supabase, shuffles, auto-plays
   - Handles track skipping on errors
   - Volume control support

2. **Photo Content Type**
   - Added 'photo' to content_type enum in database
   - Updated all TypeScript types and Record<ContentType, ...> objects
   - Imported 30 stock photos from Pexels and Pixabay

3. **YouTube Iframe Support** (`src/components/live/ContentDisplay.tsx`)
   - Detects YouTube URLs and renders iframe instead of video element
   - Enables proper playback of YouTube embeds

4. **Import Scripts Created**
   - `scripts/import-reddit.mjs` - Reddit JSON API
   - `scripts/import-youtube.mjs` - YouTube Data API
   - `scripts/import-pexels.mjs` - Pexels API
   - `scripts/import-pixabay.mjs` - Pixabay API
   - `scripts/import-9gag.mjs` - 9GAG scraper
   - `scripts/import-knowyourmeme.mjs` - KYM scraper

5. **Build Fixes**
   - Added `dynamic = 'force-dynamic'` to root layout
   - Created server/client split for dashboard layout
   - Removed incompatible Edge Function (supabase/functions/scheduled-import)
   - Fixed all Record<ContentType, ...> objects for 'photo' type

### Files Modified

- `src/app/layout.tsx` - Added dynamic export
- `src/app/(dashboard)/layout.tsx` - Server component wrapper
- `src/app/(dashboard)/DashboardClient.tsx` - Client component extracted
- `src/app/admin/layout.tsx` - Added dynamic export
- `src/components/live/ContentDisplay.tsx` - YouTube iframe + object-contain
- `src/components/live/LiveStreamPlayer.tsx` - Integrated LiveStreamMusic
- `src/components/live/LiveStreamMusic.tsx` - NEW
- `src/components/content/ContentCard.tsx` - Added 'photo' to typeColors
- `src/components/submit/ContentPreview.tsx` - Added 'photo' to typeColors
- `src/lib/upload.ts` - Added 'photo' type configs
- `src/types/database.ts` - Added 'photo' to content_type enum

---

## Google Drive Music Integration

### Setup Complete
- **Folder:** https://drive.google.com/drive/folders/1owejIWtX7obut3cX6tOo7EEdVssp6AcE
- **Service Account:** pizza-content@pizza-content.iam.gserviceaccount.com
- **Tracks Synced:** 244

### How It Works
1. Audio files live in Google Drive folder
2. `npm run sync-music` creates database records with proxy URLs
3. `/api/music/gdrive/[fileId]` streams audio from Google Drive
4. No files stored in Supabase - streamed directly

### To Add New Music
```bash
npm run sync-music
```

### Environment Variable (in Vercel)
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Full service account JSON

---

## MCP Connections

### Supabase
- **MCP:** `supabase-pizzacontent`
- **Tools:** `mcp__supabase-pizzacontent__execute_sql`, `apply_migration`, `list_tables`, etc.

### Sheets (Task Management)
- **MCP:** `sheets-claude`
- **Tools:** `mcp__sheets-claude__get_project_tasks`, `update_task_status`, etc.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| profiles | User accounts with pizzeria fields |
| content | GIFs, memes, videos, music, photos |
| content_requests | Bounty requests |
| request_claims | Users claiming requests |
| favorites | User favorites |
| view_history | User view history |
| import_sources | Viral content import sources |
| import_logs | Import history |

All migrations applied.

---

## Import Scripts

Available import scripts in `package.json`:

```bash
# Content imports (require API keys)
npm run import-giphy    # GIPHY_API_KEY
npm run import-reddit   # Public API (no key needed)
npm run import-tenor    # TENOR_API_KEY
npm run import-imgur    # IMGUR_CLIENT_ID
npm run import-youtube  # YOUTUBE_API_KEY
npm run import-pexels   # PEXELS_API_KEY
npm run import-pixabay  # PIXABAY_API_KEY
npm run import-9gag     # Web scraper (no key)
npm run import-kym      # Web scraper (no key)

# Music sync
npm run sync-music      # Google Drive sync
```

All scripts require `SUPABASE_SERVICE_KEY` environment variable.

---

## Remaining Tasks (from sheet)

| Task ID | Description | Priority |
|---------|-------------|----------|
| olive-77231 | No email auth needed | - |
| pineapple-62044 | Pizza Recipes repository | - |
| burrata-12271 | Rating/Scoring system | - |
| artichoke-74538 | Content metadata | - |
| woodfired-83060 | Content Moderation Queue | Mid |
| funghi-66576 | Pepperoni Integration (tokens) | Low |

---

## Key URLs

| Resource | URL |
|----------|-----|
| Live Site | https://pizza-content.vercel.app |
| Music | https://pizza-content.vercel.app/music |
| Radio | https://pizza-content.vercel.app/radio |
| Live Stream | https://pizza-content.vercel.app/live |
| GitHub | https://github.com/snackman/pizza-content |
| Supabase | https://supabase.com/dashboard/project/hecsxlqeviirichoohkl |
| Vercel | https://vercel.com/pizza-dao/pizza-content |
| Task Sheet | https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE |
| Google Drive Music | https://drive.google.com/drive/folders/1owejIWtX7obut3cX6tOo7EEdVssp6AcE |

---

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (Postgres, Auth, Storage)
- Google Drive API (music streaming)
- Tailwind CSS
- Vercel (deployment)
- Playwright (testing)

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Sync music from Google Drive
npm run sync-music

# Run tests
npm test

# Build
npm run build
```

---

## Known Issues / Notes

1. **Middleware deprecation warning** - Next.js 16 shows warning about middleware->proxy convention. Not blocking.

2. **Music playback on Live Stream** - Requires user interaction first (browser autoplay policy). The LiveStreamMusic component is integrated but users need to click/interact before audio plays.

3. **Reddit images** - All Reddit content now has real URLs from the Reddit JSON API.

4. **YouTube playback** - YouTube videos use iframes for proper embed support.

---

## Session Summary (2026-02-01)

1. Added photo content type (Pexels + Pixabay imports)
2. Created LiveStreamMusic component for live page
3. Fixed YouTube video playback with iframe support
4. Changed image display from object-cover to object-contain
5. Fixed build errors (dynamic rendering for Supabase client pages)
6. Deleted incompatible Edge Function
7. Build passes successfully
