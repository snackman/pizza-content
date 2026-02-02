# Implementation Plan: stromboli-53165 - Pizza Live Stream

## Task ID
**stromboli-53165**

## Description
A fullscreen visual display that cycles through pizza content (GIFs, memes, videos) with background music. Designed to be deployed in pizzerias or embedded in live streams.

---

## Database Changes

**No schema changes required** for the core feature. The existing `content` table supports all needed content types.

### Optional Future Enhancement

```sql
-- User-saved presets (optional)
CREATE TABLE livestream_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  content_types content_type[] DEFAULT '{gif, meme, video}',
  interval_seconds INTEGER DEFAULT 10,
  shuffle_enabled BOOLEAN DEFAULT true,
  music_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/live/page.tsx` | Main live stream page with URL param controls |
| `src/app/live/layout.tsx` | Minimal layout (no header) for fullscreen |
| `src/components/live/LiveStreamPlayer.tsx` | Core player with content cycling |
| `src/components/live/LiveStreamControls.tsx` | Settings panel (timing, shuffle, filters) |
| `src/components/live/ContentDisplay.tsx` | Renders individual content items |
| `src/components/live/MusicPlayer.tsx` | Background audio player |
| `src/hooks/useLiveStream.ts` | State management for player |
| `src/hooks/useMusicPlayer.ts` | Audio player hook |
| `src/lib/utils/preloadContent.ts` | Content preloading for smooth transitions |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Header.tsx` | Add "Live Stream" link |
| `src/app/page.tsx` | Add Live Stream card in Features |

---

## Component Architecture

```
LiveStreamPage
├── LiveStreamPlayer (main display)
│   ├── ContentDisplay (renders current content)
│   │   ├── GIF display (<img>)
│   │   ├── Meme display (<img>)
│   │   └── Video display (<video> autoplay)
│   ├── TransitionOverlay (fade transitions)
│   └── ContentInfo (optional title overlay)
├── LiveStreamControls (slide-out panel)
│   ├── TimingControls (interval slider)
│   ├── FilterControls (content type checkboxes)
│   ├── ShuffleToggle
│   ├── MusicVolumeSlider
│   └── FullscreenButton
└── MusicPlayer (audio + controls)
```

---

## Settings Interface

```typescript
interface LiveStreamSettings {
  intervalSeconds: number     // 5-60 seconds, default 10
  shuffleEnabled: boolean     // default true
  contentTypes: ContentType[] // default ['gif', 'meme', 'video']
  musicEnabled: boolean       // default true
  musicVolume: number         // 0-100, default 50
  showInfo: boolean           // Show content title, default false
}
```

---

## URL Parameters

Support URL params for embedding/sharing:

```
/live?types=gif,meme&interval=15&shuffle=true&music=true
```

---

## Key Features

### Keyboard Shortcuts
- **Space**: Pause/resume
- **Left/Right**: Skip content
- **F**: Toggle fullscreen
- **M**: Mute/unmute music

### Touch Gestures (Mobile)
- **Tap center**: Pause/resume
- **Swipe left/right**: Skip content
- **Tap edges**: Show controls

### Browser Autoplay Handling
- Videos start muted, music plays separately
- Show "Click to enable audio" prompt if blocked
- Handle visibility API for battery saving

### Content Preloading
- Preload next 2-3 items for smooth transitions
- Limit to 1 item on mobile for performance

---

## Implementation Phases

### Phase 1: Core Player (MVP)
1. Create `/live` route with minimal layout
2. Build LiveStreamPlayer with content cycling
3. Build ContentDisplay for gif/meme/video
4. Add timing controls and pause/play
5. Implement fullscreen support

### Phase 2: Enhanced Controls
6. Add content type filters
7. Add shuffle toggle
8. Add interval slider
9. Add URL parameter support

### Phase 3: Music Integration
10. Build MusicPlayer component
11. Add volume control
12. Handle autoplay policy
13. Connect to music content (after bellpepper-35605)

### Phase 4: Polish
14. Add keyboard shortcuts
15. Add touch gestures
16. Add content preloading
17. Add fade transitions
18. Add "info overlay" option

---

## Mobile Support

- Full viewport height, scaled content
- Touch controls for navigation
- Reduced preloading for performance
- Pause when tab hidden (battery saving)

---

## Verification Steps

| Test | Expected Result |
|------|-----------------|
| Navigate to `/live` | Content cycling loads |
| Wait 10 seconds | Content advances |
| Press Space | Pauses/resumes |
| Press F | Enters fullscreen |
| Uncheck "GIFs" filter | Only memes/videos shown |
| Enable shuffle | Random order |
| Open `/live?types=meme&interval=5` | Memes only, 5s interval |

---

## Dependencies

- **bellpepper-35605** (Pizza Music) - For music player integration
- Uses existing `content` table with gif/meme/video types

---

## Future Enhancements

- Saved presets for users
- Content voting during stream
- Theme customization
- Scheduled playlists
- Analytics tracking
- Picture-in-Picture mode
