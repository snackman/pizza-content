# Pizza Content Platform - Handoff Document

## Project Overview
Pizza content repository platform with GIFs, memes, videos, music, and user submissions.

- **Live Site:** https://pizza-content.vercel.app
- **GitHub:** https://github.com/snackman/pizza-content
- **Supabase Project:** hecsxlqeviirichoohkl
- **Task Sheet:** https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE

---

## Current Status

### Features Completed & Deployed

| Task ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| stromboli-53165 | Live Stream Player | ✅ Deployed | /live - fullscreen content cycling |
| calzone-36389 | Submission Tool | ✅ Deployed | /submit - file upload + URL submission |
| mozzarella-96056 | Content Requests | ✅ Deployed | /requests - USDC bounties, claims |
| slice-63030 | Account Dashboard | ✅ Deployed | /account - favorites, history, settings |
| onion-28645 | Viral Content Import | ✅ Deployed | /admin/imports + 8 import scripts |

### Feature Still Building

| Task ID | Feature | Status |
|---------|---------|--------|
| bellpepper-35605 | Pizza Music + Radio | 🔄 Agent still running |

### Testing Agents Running
- Live Stream Player - Playwright tests
- Submission Tool - Playwright tests

---

## CRITICAL: Migrations Needed

Run these in Supabase SQL Editor: https://supabase.com/dashboard/project/hecsxlqeviirichoohkl/sql

### 1. Content Requests (mozzarella-96056)
```sql
ALTER TABLE content_requests
  ADD COLUMN IF NOT EXISTS bounty_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounty_currency TEXT DEFAULT 'USDC',
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS fulfills_request_id UUID REFERENCES content_requests(id);

CREATE TABLE IF NOT EXISTS request_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES content_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT DEFAULT 'active' NOT NULL,
  UNIQUE(request_id, user_id)
);

ALTER TABLE request_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Claims are viewable by everyone" ON request_claims FOR SELECT USING (true);
CREATE POLICY "Users can create own claims" ON request_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own claims" ON request_claims FOR UPDATE USING (auth.uid() = user_id);
```

### 2. Pizzeria Profile Fields (slice-63030)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
```

### 3. Import Sources (onion-28645)
```sql
CREATE TABLE IF NOT EXISTS import_sources (
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

CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES import_sources(id),
  status TEXT NOT NULL,
  items_found INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_source_url ON content(source_url) WHERE source_url IS NOT NULL;
```

### 4. Music Type (bellpepper-35605) - When agent completes
```sql
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'music';

ALTER TABLE content ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS album TEXT;
```

---

## Plans Location
All implementation plans are in: `plans/`

- bellpepper-35605-pizza-music.md
- calzone-36389-submission-tool.md
- mozzarella-96056-content-requests.md
- onion-28645-viral-content.md
- slice-63030-pizzeria-account.md (merged with spinach-76443)
- stromboli-53165-pizza-live-stream.md

---

## Sheet Tasks Created This Session

| Task ID | Description | Priority |
|---------|-------------|----------|
| woodfired-83060 | Content Moderation Queue | Medium |
| funghi-66576 | Pepperoni Integration (token system) | Low |

---

## What to Do Next

1. **Apply migrations** - Run all SQL above in Supabase
2. **Check if Pizza Music agent completed** - If so, commit and push the changes
3. **Review Playwright test results** - Fix any bugs found
4. **Mark completed tasks as "Done"** in the sheet
5. **Download music files** from Google Drive for import: https://drive.google.com/drive/folders/1owejIWtX7obut3cX6tOo7EEdVssp6AcE

---

## Key URLs

| Resource | URL |
|----------|-----|
| Live Site | https://pizza-content.vercel.app |
| Live Stream | https://pizza-content.vercel.app/live |
| Submit | https://pizza-content.vercel.app/submit |
| Requests | https://pizza-content.vercel.app/requests |
| Account | https://pizza-content.vercel.app/account |
| Admin Imports | https://pizza-content.vercel.app/admin/imports |
| GitHub | https://github.com/snackman/pizza-content |
| Supabase | https://supabase.com/dashboard/project/hecsxlqeviirichoohkl |
| Task Sheet | https://docs.google.com/spreadsheets/d/13WBouU-AFOVad2oJFd7jIhePhTSMo_i04tlzUu_gRHE |

---

## Tech Stack
- Next.js 14 (App Router)
- Supabase (Postgres, Auth, Storage)
- Tailwind CSS
- Vercel (deployment)
- sheets-claude MCP (task management)
