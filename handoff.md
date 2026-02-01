# Pizza Content Platform - Handoff Document

## Project Overview
Pizza content repository platform with GIFs, memes, videos, music, and user submissions.

- **Live Site:** https://pizza-content.vercel.app
- **GitHub:** https://github.com/snackman/pizza-content
- **Supabase Project:** hecsxlqeviirichoohkl
- **Task Sheet:** https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE

---

## Current Status

### All Features Deployed ✅

| Feature | URL | Status |
|---------|-----|--------|
| Pizza Music | /music | ✅ 244 tracks from Google Drive |
| Pizza Radio | /radio | ✅ Streaming player |
| Live Stream | /live | ✅ Visual content display |
| Submit | /submit | ✅ User submissions |
| Requests | /requests | ✅ Bounty system |
| Account | /account | ✅ Dashboard with favorites |
| Admin Imports | /admin/imports | ✅ Viral content import |

---

## Google Drive Music Integration ✅

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
| content | GIFs, memes, videos, music (244 tracks) |
| content_requests | Bounty requests |
| request_claims | Users claiming requests |
| favorites | User favorites |
| view_history | User view history |
| import_sources | Viral content import sources |
| import_logs | Import history |

All migrations applied ✅

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
| API Music | https://pizza-content.vercel.app/api/music |
| GitHub | https://github.com/snackman/pizza-content |
| Supabase | https://supabase.com/dashboard/project/hecsxlqeviirichoohkl |
| Vercel | https://vercel.com/pizza-dao/pizza-content |
| Task Sheet | https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE |
| Google Drive Music | https://drive.google.com/drive/folders/1owejIWtX7obut3cX6tOo7EEdVssp6AcE |

---

## Tech Stack
- Next.js 14 (App Router)
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
```

---

## Session Summary (2026-02-01)

1. ✅ Applied 4 database migrations
2. ✅ Fixed TypeScript type errors
3. ✅ Implemented Google Drive music integration
4. ✅ Synced 244 pizza music tracks
5. ✅ Marked 7 completed tasks as done
6. ✅ Added Playwright test infrastructure
7. ✅ All features live and working
