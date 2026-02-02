# Plan: Add "Games" Content Category

## Summary

Add "game" as a new content type for pizza-themed games and gaming content.

## Files to Modify

| File | Change |
|------|--------|
| Database | Add 'game' to content_type enum |
| `src/types/database.ts` | Add 'game' to TypeScript enum |
| `src/app/games/page.tsx` | Create new page (like /art) |
| `src/components/layout/Header.tsx` | Add Games nav link |
| `src/app/page.tsx` | Add Games category card |
| `src/app/browse/page.tsx` | Add 'game' to filters |
| `src/components/submit/SubmissionForm.tsx` | Add game type option |
| `src/components/requests/RequestFilters.tsx` | Add Games filter |
| `src/app/(dashboard)/account/content/page.tsx` | Add game filter/count |
| `src/components/content/ContentCard.tsx` | Add game type color |

## Implementation Steps

### 1. Database Migration
```sql
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'game';
```

### 2. TypeScript Types (`src/types/database.ts`)

Line 443:
```typescript
content_type: "gif" | "meme" | "video" | "music" | "photo" | "art" | "game"
```

Line 573:
```typescript
content_type: ["gif", "meme", "video", "music", "photo", "art", "game"],
```

### 3. Create Games Page (`src/app/games/page.tsx`)

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ContentCard } from '@/components/content/ContentCard'
import { Content } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'game')
    .in('status', ['approved', 'featured'])
    .order('created_at', { ascending: false })

  const games = (data || []) as Content[]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🎮</span>
            <div>
              <h1 className="text-4xl font-bold">Pizza Games</h1>
              <p className="text-indigo-100 mt-1">
                {games?.length || 0} pizza-themed games and gaming content
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {games.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No games found yet</p>
            <Link href="/submit" className="mt-4 inline-block text-orange-600 hover:text-orange-700 font-medium">
              Be the first to submit one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {games.map((game) => (
              <ContentCard key={game.id} item={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 4. Header Navigation (`src/components/layout/Header.tsx`)

Add after Art link:
```tsx
<Link href="/games" className="text-gray-600 hover:text-indigo-600 font-medium">
  Games
</Link>
```

### 5. Home Page Category (`src/app/page.tsx`)

Add to categories array:
```typescript
{
  title: 'Games',
  description: 'Pizza-themed games and gaming content',
  href: '/games',
  emoji: '🎮',
  color: 'from-indigo-400 to-purple-600',
},
```

### 6. Browse Page Filters (`src/app/browse/page.tsx`)

Update type and array:
```typescript
type ContentType = 'all' | 'gif' | 'meme' | 'video' | 'music' | 'photo' | 'art' | 'game'

// In filter buttons:
(['all', 'gif', 'meme', 'video', 'music', 'photo', 'art', 'game'] as ContentType[])
```

### 7. Content Card Color (`src/components/content/ContentCard.tsx`)

Add to typeColors:
```typescript
game: 'bg-indigo-500',
```

### 8. Submission Form (`src/components/submit/SubmissionForm.tsx`)

Add 'game' to content types array with 🎮 emoji.

## Import Sources for Pizza Games

| Source | Type of Content |
|--------|-----------------|
| itch.io | Indie pizza games |
| YouTube | Pizza Tower gameplay, tutorials |
| Twitch clips | Gaming streams |
| TikTok | Gaming clips |

**Notable pizza games:**
- Pizza Tower (popular indie)
- Papa's Pizzeria series
- Pizza Tycoon games
- Mobile pizza cooking games

## Verification

1. ✅ /games page loads
2. ✅ Header shows Games link
3. ✅ Home page shows Games card
4. ✅ /browse shows "Games" filter
5. ✅ /submit shows game type
6. ✅ Game content displays with indigo badge
