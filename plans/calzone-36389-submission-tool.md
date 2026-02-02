# Implementation Plan: calzone-36389 - Submission Tool

## Task ID
**calzone-36389**

## Description
Create a content submission tool allowing users to upload files or submit external URLs for pizza GIFs, memes, and videos.

---

## Database Changes
**None required** - Existing `content` table supports all fields:
- `url` - Storage path or external URL
- `thumbnail_url` - Preview image
- `source_url` - Original source
- `source_platform` - Platform identifier
- `submitted_by` - User reference
- `status` - Set to 'approved' immediately (no moderation queue for now)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/submit/page.tsx` | Submission form page |
| `src/components/submit/SubmissionForm.tsx` | Main form component |
| `src/components/submit/FileUploader.tsx` | Drag-drop file upload |
| `src/components/submit/UrlInput.tsx` | External URL input with preview |
| `src/components/submit/ContentPreview.tsx` | Preview before submitting |
| `src/components/submit/TagInput.tsx` | Tag selection/creation |
| `src/lib/upload.ts` | Supabase Storage upload utilities |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Header.tsx` | Ensure Submit link is prominent |
| `src/types/database.ts` | Add SubmissionFormData type |

---

## Implementation Steps

### Phase 1: Upload Infrastructure
1. Create `src/lib/upload.ts` with functions:
   - `uploadToStorage(file, type)` - Upload to Supabase Storage
   - `generateThumbnail(url)` - Create thumbnail for videos
   - `validateUrl(url)` - Validate external URLs

### Phase 2: Form Components
1. Create `FileUploader` with drag-drop support
2. Create `UrlInput` with URL validation and preview fetch
3. Create `TagInput` with autocomplete from existing tags
4. Create `ContentPreview` showing final result

### Phase 3: Submission Page
1. Build `SubmissionForm` combining all components
2. Create `/submit` page with auth protection
3. Handle form submission to `content` table

### Phase 4: Success Flow
1. Show success message with content preview
2. Link to user's submissions in dashboard
3. Explain moderation process

---

## Supported Sources

### File Upload
- **GIFs**: .gif files up to 10MB
- **Images/Memes**: .jpg, .png, .webp up to 5MB
- **Videos**: .mp4, .webm up to 50MB

### External URLs
- **YouTube**: youtube.com, youtu.be
- **TikTok**: tiktok.com
- **Instagram**: instagram.com/reel/
- **Twitter/X**: twitter.com, x.com
- **Direct URLs**: Any direct media URL

---

## Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | Select | Yes | gif, meme, video |
| `title` | Text | Yes | Max 100 chars |
| `description` | Textarea | No | Max 500 chars |
| `file` | File | Either | If no URL provided |
| `url` | URL | Either | If no file provided |
| `source_url` | URL | No | Original source credit |
| `tags` | Multi-select | No | From existing + custom |

---

## Storage Structure
```
content/
├── gifs/
│   └── {uuid}.gif
├── memes/
│   └── {uuid}.{ext}
├── videos/
│   └── {uuid}.mp4
└── thumbnails/
    └── {uuid}.jpg
```

---

## Verification Steps

1. File upload works for all supported types
2. External URL validation catches invalid URLs
3. Preview renders correctly before submit
4. Content saves with status 'approved' (visible immediately)
5. User redirected to success page
6. Auth required (redirect to login if not authenticated)
7. File size limits enforced

---

## Future Enhancement
- **Moderation queue** - See task for content moderation system
