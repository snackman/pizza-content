# Plan: Fix Imports + Add Art Content Type

**Task ID**: imports-fix-art-type

## Summary

1. Add 'art' to content_type enum in database
2. Fix Pexels/Pixabay importers to use 'photo' instead of 'meme'
3. Update all TypeScript types and UI components

## Database Migration

```sql
-- File: supabase/migrations/006_add_art_type.sql
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'art';
```

## File Changes

### 1. TypeScript Types (`src/types/database.ts`)

**Line 443** - Update enum:
```typescript
content_type: "gif" | "meme" | "video" | "music" | "photo" | "art"
```

**Lines 572-574** - Update Constants:
```typescript
content_type: ["gif", "meme", "video", "music", "photo", "art"],
```

### 2. Import Scripts

**`scripts/import-pexels.mjs` (Line 177)**:
```javascript
// FROM: type: 'meme',
// TO:
type: 'photo',
```

**`scripts/import-pixabay.mjs` (Line 192)**:
```javascript
// FROM: type: 'meme',
// TO:
type: 'photo',
```

### 3. Upload Utilities (`src/lib/upload.ts`)

Add 'art' to all Record<ContentType, ...> objects:

```typescript
// FILE_SIZE_LIMITS (line ~11)
art: 10 * 1024 * 1024,

// ALLOWED_EXTENSIONS (line ~20)
art: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],

// ALLOWED_MIME_TYPES (line ~29)
art: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
```

**Line 108** - Update folder logic:
```typescript
const folder = contentType === 'meme' ? 'memes' : contentType === 'art' ? 'art' : `${contentType}s`
```

### 4. UI Components

**`src/components/content/ContentCard.tsx` (lines 13-19)**:
```typescript
const typeColors: Record<string, string> = {
  gif: 'bg-orange-500',
  meme: 'bg-yellow-500',
  video: 'bg-red-500',
  music: 'bg-green-500',
  photo: 'bg-blue-500',
  art: 'bg-pink-500',
}
```

**`src/components/submit/ContentPreview.tsx` (lines 129-135)**:
```typescript
const typeColors: Record<ContentType, string> = {
  gif: 'bg-orange-500',
  meme: 'bg-yellow-500',
  video: 'bg-red-500',
  music: 'bg-purple-500',
  photo: 'bg-blue-500',
  art: 'bg-pink-500',
}
```

### 5. Browse Page (`src/app/browse/page.tsx`)

**Line 9**:
```typescript
type ContentType = 'all' | 'gif' | 'meme' | 'video' | 'music' | 'photo' | 'art'
```

**Line 70**:
```typescript
{(['all', 'gif', 'meme', 'video', 'music', 'photo', 'art'] as ContentType[]).map((type) => (
```

### 6. Request Components

**`src/components/requests/RequestFilters.tsx` (lines 26-32)** - Add photo and art:
```typescript
const typeOptions: { value: ContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'gif', label: 'GIFs' },
  { value: 'meme', label: 'Memes' },
  { value: 'video', label: 'Videos' },
  { value: 'music', label: 'Music' },
  { value: 'photo', label: 'Photos' },
  { value: 'art', label: 'Art' },
]
```

**`src/components/requests/RequestForm.tsx` (lines 21-26)** - Add photo and art:
```typescript
const contentTypes: { value: ContentType; label: string }[] = [
  { value: 'gif', label: 'GIF' },
  { value: 'meme', label: 'Meme' },
  { value: 'video', label: 'Video' },
  { value: 'music', label: 'Music' },
  { value: 'photo', label: 'Photo' },
  { value: 'art', label: 'Art' },
]
```

### 7. Submission Form (`src/components/submit/SubmissionForm.tsx`)

**Line 197** - Add photo and art to type selector:
```typescript
{(['gif', 'meme', 'video', 'music', 'photo', 'art'] as ContentType[]).map((type) => (
```

## Verification

1. Run migration via Supabase MCP
2. `npm run build` compiles without errors
3. Run import-pexels - verify photos save with `type: 'photo'`
4. Run import-pixabay - verify photos save with `type: 'photo'`
5. Browse page shows 'Art' filter
6. Submission form allows 'art' type
