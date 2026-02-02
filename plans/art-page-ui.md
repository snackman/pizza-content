# Plan: Create /art Page and UI Updates

**Task ID**: art-page-ui

## Summary

Create a dedicated /art page following the pattern of existing content pages, and add navigation.

## File Changes

### 1. Create Art Page (`src/app/art/page.tsx`)

Follow the pattern from `/photos/page.tsx`:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import ContentCard from '@/components/content/ContentCard'

export const dynamic = 'force-dynamic'

export default async function ArtPage() {
  const supabase = await createServerClient()

  const { data: artworks } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'art')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">🎨 Pizza Art</h1>
        <p className="text-gray-400 mb-8">
          Creative pizza-themed artwork and illustrations
        </p>

        {artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((art) => (
              <ContentCard key={art.id} content={art} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No art yet. Be the first to submit!</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. Header Navigation (`src/components/layout/Header.tsx`)

Add Art link after Photos in the navigation array:

```typescript
// Find the nav links array and add:
{ href: '/art', label: 'Art' },
```

### 3. Live Stream Content Display (if needed)

**`src/components/live/ContentDisplay.tsx`** - Ensure 'art' type renders correctly (should work with existing image handling).

## Implementation Order

1. Create `src/app/art/page.tsx`
2. Update Header navigation
3. Verify art displays correctly in browse page and live stream

## Verification

1. Navigate to /art - page loads
2. Header shows Art link
3. Art content (once imported) displays in grid
4. /browse shows art when filter selected
