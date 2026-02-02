# Implementation Plan: bellpepper-35605 - Pizza Music

## Task ID
**bellpepper-35605**

## Description
Add music content type to Pizza Content with:
- Music library page with playback
- **Pizza Radio** - continuous random music stream
- **Public API** for external apps to access pizza music
- **Integration hooks** for the Live Stream feature (stromboli-53165)

**Google Drive Source**: https://drive.google.com/drive/folders/1owejIWtX7obut3cX6tOo7EEdVssp6AcE

---

## Database Migration

### Migration: `004_add_music_type.sql`

```sql
-- Add 'music' to content_type enum
ALTER TYPE content_type ADD VALUE 'music';

-- Add music-specific fields to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS album TEXT;
```

---

## Files to Create

### Pages
| File | Purpose |
|------|---------|
| `src/app/music/page.tsx` | Music library with grid and player |
| `src/app/radio/page.tsx` | Pizza Radio - continuous playback UI |

### Components
| File | Purpose |
|------|---------|
| `src/components/music/MusicCard.tsx` | Music item card with play button |
| `src/components/music/MusicPlayer.tsx` | Persistent audio player (bottom bar) |
| `src/components/music/RadioPlayer.tsx` | Auto-advancement radio player |
| `src/components/music/PlaylistQueue.tsx` | Current queue display |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/music/route.ts` | GET all music, with filters |
| `src/app/api/music/random/route.ts` | GET random track(s) |
| `src/app/api/music/stream/route.ts` | GET playlist for continuous playback |
| `src/app/api/radio/route.ts` | Server-sent events for radio sync |

### Scripts
| File | Purpose |
|------|---------|
| `scripts/import-music.mjs` | Import from Google Drive to Supabase |

### Hooks (for Live Stream integration)
| File | Purpose |
|------|---------|
| `src/hooks/useMusic.ts` | Fetch music, manage playback state |
| `src/hooks/useRadio.ts` | Radio mode with auto-advancement |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/database.ts` | Add `'music'` to ContentType, add music fields |
| `src/components/content/ContentCard.tsx` | Add music handling with audio element |
| `src/components/layout/Header.tsx` | Add Music + Radio nav links |
| `src/app/page.tsx` | Add Music category card |
| `src/app/browse/page.tsx` | Add music to filter buttons |
| `src/app/layout.tsx` | Add persistent MusicPlayer at bottom |

---

## API Endpoints

### `GET /api/music`
Returns all music tracks with optional filters.
```typescript
// Query params
?limit=20&offset=0&shuffle=false

// Response
{
  tracks: Content[],
  total: number
}
```

### `GET /api/music/random`
Returns random track(s) for radio/livestream.
```typescript
// Query params
?count=1  // Number of tracks to return

// Response
{
  tracks: Content[]
}
```

### `GET /api/music/stream`
Returns a shuffled playlist for continuous playback.
```typescript
// Query params
?duration=3600  // Target duration in seconds (default 1 hour)

// Response
{
  playlist: Content[],
  totalDuration: number
}
```

### `GET /api/radio` (Server-Sent Events)
Real-time sync for shared radio experience.
```typescript
// SSE events
event: now_playing
data: { track: Content, startedAt: timestamp, position: seconds }

event: next_track
data: { track: Content, startsAt: timestamp }
```

---

## Pizza Radio Feature

### UI (`/radio`)
- Large album art / waveform visualization
- Current track info (title, artist)
- Play/pause, skip, volume controls
- "What's playing" history
- Share current track button
- Embeddable widget mode (`/radio?embed=true`)

### Behavior
- Auto-advances to next random track
- Seamless crossfade between tracks (optional)
- Remembers volume preference
- Works in background (service worker)

---

## Live Stream Integration

The `useRadio` hook exposes:
```typescript
interface RadioState {
  currentTrack: Content | null
  isPlaying: boolean
  volume: number
  queue: Content[]
}

interface RadioActions {
  play: () => void
  pause: () => void
  skip: () => void
  setVolume: (v: number) => void
  getNextTrack: () => Content
}
```

The Live Stream (stromboli-53165) can import and use:
```typescript
import { useRadio } from '@/hooks/useRadio'

// In LiveStreamPlayer
const { currentTrack, isPlaying, play, skip } = useRadio()
```

---

## Implementation Phases

### Phase 1: Database & Types
1. Create migration `004_add_music_type.sql`
2. Apply migration
3. Update TypeScript types

### Phase 2: Import Script
1. Download music from Google Drive
2. Create `scripts/import-music.mjs`
3. Run import to populate database

### Phase 3: Basic UI
1. Create MusicCard component
2. Create `/music` library page
3. Add to navigation

### Phase 4: Music Player
1. Create MusicPlayer component (persistent bottom bar)
2. Create useMusic hook
3. Add to layout

### Phase 5: API Endpoints
1. Create `/api/music` endpoint
2. Create `/api/music/random` endpoint
3. Create `/api/music/stream` endpoint

### Phase 6: Pizza Radio
1. Create RadioPlayer component
2. Create useRadio hook
3. Create `/radio` page
4. Create `/api/radio` SSE endpoint (optional)

### Phase 7: Integration
1. Export hooks for Live Stream use
2. Test with stromboli-53165 integration
3. Add embed mode for external use

---

## Audio Format
- **Format**: MP3 for max browser compatibility
- **Storage**: `content` bucket, path: `music/{filename}.mp3`
- **Metadata**: Extract duration, artist, album from ID3 tags if available

---

## External Usage Examples

### Embed Pizza Radio
```html
<iframe src="https://pizza-content.vercel.app/radio?embed=true" />
```

### Fetch Random Track (API)
```javascript
const response = await fetch('https://pizza-content.vercel.app/api/music/random')
const { tracks } = await response.json()
const audioUrl = tracks[0].url
```

### Get 1-Hour Playlist
```javascript
const response = await fetch('https://pizza-content.vercel.app/api/music/stream?duration=3600')
const { playlist } = await response.json()
```

---

## Verification Steps

1. Database enum includes 'music'
2. Music records exist in content table
3. `/music` page loads with playable audio
4. MusicPlayer persists across page navigation
5. `/radio` auto-advances through tracks
6. `/api/music/random` returns valid track
7. `/api/music/stream` returns shuffled playlist
8. useRadio hook works in isolation
9. Browse page filter includes music
10. Homepage shows Music category
