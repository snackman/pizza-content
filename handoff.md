# Pizza Sauce - Session Handoff

## Session Summary (Feb 3, 2026)

### Completed This Session

1. **Domain pizzasauce.xyz** - Live and working
   - Added to Vercel project (pizza-dao team)
   - Configured Namecheap DNS (A record → 76.76.21.21, CNAME www → cname.vercel-dns.com)
   - Script: `namecheap/setup_pizzasauce_dns.py`

2. **Fixed Voting Bug** - Votes now persist on /live page
   - Root cause: RLS policies blocked anonymous updates
   - Fix: Created `vote_content(p_content_id, p_vote_type)` database function with SECURITY DEFINER
   - Updated API at `src/app/api/content/vote/route.ts` to use `supabase.rpc()`
   - Migration applied: `add_vote_function`

3. **Rebranded to "Pizza Sauce"**
   - Updated all user-facing text from "Pizza Content" to "Pizza Sauce"
   - Files: Header, layout, home page, login/register pages

4. **Content Cleanup**
   - Deleted 114 broken Pixabay items (expired signed URLs)
   - Deleted 6 non-pizza items (chicken sandwich, fruit salad, burger, etc.)

5. **Games Import System** - PR #7 merged
   - Created 3 import scripts:
     - `scripts/import-games-rawg.mjs` - RAWG.io API (needs RAWG_API_KEY)
     - `scripts/import-games-youtube.mjs` - YouTube gaming videos (needs YOUTUBE_API_KEY)
     - `scripts/import-games-manual.mjs` - Curated list (no API key needed)
   - Imported 8 curated pizza games via MCP

6. **Content Import via MCP**
   - Imported 10 photos/memes from Reddit (r/pizza, r/pizzacrimes)
   - Imported 9 GIFs from Tenor
   - No API keys needed - used MCP's service-level access

### Content Database Status (911 items)

| Type | Count |
|------|-------|
| GIFs | 353 |
| Music | 244 |
| Photos | 132 |
| Videos | 100 |
| Memes | 51 |
| Art | 23 |
| Games | 8 |

### Content by Source

| Source | Count |
|--------|-------|
| Giphy | 296 |
| Google Drive | 244 |
| YouTube | 100 |
| Pexels | 73 |
| Unsplash | 52 |
| Reddit | 44 |
| Tumblr | 27 |
| DeviantArt | 20 |
| 9gag | 10 |
| Tenor | 9 |
| Steam | 8 |

### API Status

| API | Status | Notes |
|-----|--------|-------|
| Giphy | Working | GIPHY_API_KEY needed for script |
| Pexels | Working | PEXELS_API_KEY needed for script |
| Unsplash | Working | UNSPLASH_ACCESS_KEY needed for script |
| YouTube | Working | YOUTUBE_API_KEY needed for script |
| DeviantArt | Working | DEVIANTART_CLIENT_ID/SECRET needed |
| Tumblr | Working | TUMBLR_API_KEY needed |
| Reddit | Working | No API key needed (public JSON) |
| Tenor | Working | Public API with default key |
| RAWG.io | Working | RAWG_API_KEY needed (free) |
| TikTok | Down | RapidAPI returning 503 errors |
| Imgur | Broken | Registration closed |
| Pixabay | Broken | URLs expire - do not use |

### Import Without API Keys

You can import content directly via MCP without configuring .env.local:

```bash
# Reddit (public JSON)
curl -s "https://www.reddit.com/r/pizza/hot.json?limit=25" -H "User-Agent: PizzaSauce/1.0"

# Tenor (public API)
curl -s "https://g.tenor.com/v1/search?q=pizza&key=LIVDSRZULELA&limit=20"
```

Then insert via `mcp__supabase-pizzacontent__execute_sql`.

### Environment Variables

**.env.local** (for running import scripts locally):
```
NEXT_PUBLIC_SUPABASE_URL=https://hecsxlqeviirichoohkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=<from Supabase dashboard - Settings → API → service_role>

# Optional - for import scripts
GIPHY_API_KEY=<from developers.giphy.com>
RAWG_API_KEY=<from rawg.io/apidocs>
YOUTUBE_API_KEY=<from Google Cloud Console>
```

### Database

- **Project ID**: hecsxlqeviirichoohkl
- **MCP**: supabase-pizzacontent
- **Content status enum**: pending, approved, rejected, featured, flagged_not_pizza, flagged_broken
- **Content type enum**: gif, meme, video, music, photo, art, game
- **Vote function**: `vote_content(p_content_id UUID, p_vote_type TEXT)` - safely increments upvotes/downvotes

### Key URLs

| URL | Description |
|-----|-------------|
| https://pizzasauce.xyz | Production site |
| https://pizzasauce.xyz/live | Livestream with voting |
| https://pizzasauce.xyz/games | Games category (8 items) |
| https://pizzasauce.xyz/browse | Content browser with infinite scroll |
| https://pizzasauce.xyz/admin | Admin dashboard |

### Key Files

| File | Description |
|------|-------------|
| `src/app/api/content/vote/route.ts` | Voting API (uses RPC) |
| `src/components/live/ContentDisplay.tsx` | Livestream display with vote buttons |
| `scripts/import-games-*.mjs` | Games import scripts |
| `scripts/import-*.mjs` | All content import scripts (17 total) |
| `scripts/check-broken-links.mjs` | Broken link checker |
| `plans/games-import-sources.md` | Games import research/plan |

### Git Status

- **Branch**: main
- **Latest commit**: feat: Add pizza games import scripts (PR #7)
- **Open PRs**: None
- **Active worktrees**: None

### Next Steps

1. **Import more content** - Can use MCP directly or add API keys to .env.local
2. **Add more games** - Run RAWG.io import with API key for more games
3. **YouTube gaming content** - Import Pizza Tower gameplay/speedruns
4. **Consider**: Auto-import scheduled via Edge Function
