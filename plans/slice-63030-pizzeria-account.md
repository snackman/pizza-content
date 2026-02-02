# Implementation Plan: slice-63030 + spinach-76443 - Account & Dashboard

## Task IDs
- **slice-63030** - Pizzeria Account with History and Favorites
- **spinach-76443** - Profile Dashboard (merged)

## Description
Complete user account system with:
- Profile editing (regular users + pizzeria-specific fields)
- Dashboard with sidebar navigation
- Favorites management
- View history tracking
- Submitted content management
- Account settings

---

## Database Migration: `004_pizzeria_profile_fields.sql`

```sql
-- Add pizzeria-specific fields to profiles
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

-- Index for verified pizzerias
CREATE INDEX IF NOT EXISTS idx_profiles_verified_pizzerias
  ON profiles(is_pizzeria, is_verified)
  WHERE is_pizzeria = TRUE;
```

---

## Files to Create

### Route Structure
```
src/app/(dashboard)/
  layout.tsx                    # Dashboard layout with sidebar
  account/
    page.tsx                    # Profile overview + stats
    edit/page.tsx               # Edit profile form
    content/page.tsx            # My submitted content
    favorites/page.tsx          # Favorited content
    history/page.tsx            # View history
    settings/page.tsx           # Account settings
```

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useFavorites.ts` | Add, remove, toggle, check favorites |
| `src/hooks/useViewHistory.ts` | Track and retrieve view history |

### Components
| File | Purpose |
|------|---------|
| `src/components/dashboard/Sidebar.tsx` | Dashboard navigation |
| `src/components/dashboard/ProfileEditor.tsx` | Edit profile form |
| `src/components/dashboard/StatsCard.tsx` | Stats display cards |
| `src/components/dashboard/StatusBadge.tsx` | Content status badge |
| `src/components/ui/FavoriteButton.tsx` | Heart toggle button |
| `src/components/ui/PizzeriaBadge.tsx` | Verified pizzeria badge |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/database.ts` | Add pizzeria fields to Profile type |
| `src/components/content/ContentCard.tsx` | Add FavoriteButton |
| `src/components/layout/Header.tsx` | Add user dropdown with dashboard links, pizzeria badge |

---

## Page Designs

### Account Overview (`/account`)
- Profile card with avatar, display name
- Quick edit button
- Stats: submissions count, favorites count, total views
- Recent activity feed
- Pizzeria badge if verified

### Edit Profile (`/account/edit`)
- Avatar upload
- Display name, username, bio
- "I am a Pizzeria" toggle
- Conditional pizzeria fields (business name, address, phone, website)
- Verification status display (if pizzeria)

### My Content (`/account/content`)
- Grid of user's submitted content
- Filter by type (gif, meme, video)
- Status badges on each card
- Empty state: "You haven't submitted any content yet"

### Favorites (`/account/favorites`)
- Grid of favorited content
- Filter by content type
- Remove from favorites on hover
- Empty state: "No favorites yet"

### History (`/account/history`)
- Content grouped by date (Today, Yesterday, This Week, Earlier)
- Clear history button
- Limit to last 100 items
- Empty state: "No viewing history"

### Settings (`/account/settings`)
- Email display (read-only)
- Change password
- Delete account (with confirmation modal)

---

## Hook Specifications

### useFavorites
```typescript
interface UseFavoritesReturn {
  favorites: Content[]
  isLoading: boolean
  isFavorite: (contentId: string) => boolean
  addFavorite: (contentId: string) => Promise<void>
  removeFavorite: (contentId: string) => Promise<void>
  toggleFavorite: (contentId: string) => Promise<void>
}
```

### useViewHistory
```typescript
interface UseViewHistoryReturn {
  history: ViewHistoryItem[]
  isLoading: boolean
  trackView: (contentId: string) => Promise<void>
  clearHistory: () => Promise<void>
}
```

---

## Implementation Phases

### Phase 1: Database & Types
1. Create and apply migration
2. Update Profile type in database.ts

### Phase 2: Hooks
1. Create useFavorites hook
2. Create useViewHistory hook
3. Test hooks independently

### Phase 3: UI Components
1. Create FavoriteButton component
2. Create PizzeriaBadge component
3. Add FavoriteButton to ContentCard
4. Create dashboard components (Sidebar, StatsCard, StatusBadge, ProfileEditor)

### Phase 4: Dashboard Layout
1. Create (dashboard) route group
2. Create dashboard layout with Sidebar
3. Update middleware for protected routes

### Phase 5: Dashboard Pages
1. Account overview page
2. Edit profile page
3. My Content page
4. Favorites page
5. History page
6. Settings page

### Phase 6: Header Integration
1. Add user dropdown menu
2. Add pizzeria badge display
3. Link to dashboard pages

---

## Data Queries

```typescript
// User submissions
supabase.from('content').select('*').eq('submitted_by', user.id)

// Favorites with content details
supabase.from('favorites').select('*, content(*)').eq('user_id', user.id)

// View history with content details
supabase.from('view_history')
  .select('*, content(*)')
  .eq('user_id', user.id)
  .order('viewed_at', { ascending: false })
  .limit(100)

// Check if favorited
supabase.from('favorites')
  .select('id')
  .eq('user_id', user.id)
  .eq('content_id', contentId)
  .single()
```

---

## Verification Steps

1. Migration applies without errors
2. Profile editing saves all fields including pizzeria fields
3. Pizzeria toggle shows/hides business fields
4. FavoriteButton toggles correctly on ContentCard
5. Favorites page shows all favorited content
6. History tracks views automatically
7. History groups by date correctly
8. My Content shows user's submissions
9. Settings password change works
10. Dashboard responsive on mobile
11. PizzeriaBadge shows for verified accounts
12. Protected routes redirect to login
