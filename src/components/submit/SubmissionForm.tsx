'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ContentType } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { uploadToStorage, validateUrl, getYouTubeThumbnail } from '@/lib/upload'
import { FileUploader } from './FileUploader'
import { UrlInput } from './UrlInput'
import { TagInput } from './TagInput'
import { ContentPreview } from './ContentPreview'

type SourceType = 'file' | 'url'

export function SubmissionForm() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // Form state
  const [sourceType, setSourceType] = useState<SourceType>('file')
  const [contentType, setContentType] = useState<ContentType>('gif')
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [urlPlatform, setUrlPlatform] = useState<string | undefined>()
  const [isUrlValid, setIsUrlValid] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type)
    // Clear the other source when switching
    if (type === 'file') {
      setUrl('')
      setUrlPlatform(undefined)
      setIsUrlValid(false)
    } else {
      setFile(null)
    }
    setError(null)
  }

  const handleUrlValidation = useCallback((valid: boolean, platform?: string) => {
    setIsUrlValid(valid)
    setUrlPlatform(platform)
  }, [])

  const canSubmit = () => {
    if (!title.trim()) return false
    if (sourceType === 'file' && !file) return false
    if (sourceType === 'url' && !isUrlValid) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('You must be logged in to submit content')
      return
    }

    if (!canSubmit()) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let finalUrl: string
      let thumbnailUrl: string | null = null
      let sourcePlatform: string | null = null

      if (sourceType === 'file' && file) {
        // Upload file to Supabase Storage
        const uploadResult = await uploadToStorage(file, contentType)
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Upload failed')
        }
        finalUrl = uploadResult.url
      } else {
        // Use external URL
        finalUrl = url
        sourcePlatform = urlPlatform || null

        // Generate thumbnail for YouTube videos
        if (urlPlatform === 'youtube') {
          thumbnailUrl = getYouTubeThumbnail(url)
        }
      }

      // Insert into database with status 'approved' (no moderation queue)
      const insertData = {
        type: contentType,
        title: title.trim(),
        creator: creator.trim() || null,
        description: description.trim() || null,
        url: finalUrl,
        thumbnail_url: thumbnailUrl,
        source_url: sourceUrl.trim() || null,
        source_platform: sourcePlatform,
        tags: tags.length > 0 ? tags : [],
        status: 'approved' as const,
        submitted_by: user.id,
      }

      const { error: insertError } = await supabase
        .from('content')
        .insert(insertData as never)

      if (insertError) {
        throw insertError
      }

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/browse')
      }, 2000)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit content. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Submission Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your content has been added to the library and is now visible to everyone.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setSuccess(false)
                setTitle('')
                setCreator('')
                setDescription('')
                setFile(null)
                setUrl('')
                setSourceUrl('')
                setTags([])
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Submit Another
            </button>
            <button
              onClick={() => router.push('/browse')}
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              View Content
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Submit Content
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Content Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <div className="flex gap-3 flex-wrap">
              {(['gif', 'meme', 'video', 'music', 'photo', 'art', 'game'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type)}
                  disabled={isSubmitting}
                  className={`
                    flex-1 min-w-[80px] py-3 px-4 rounded-lg font-medium transition-colors
                    ${contentType === type
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span className="block text-lg mb-1">
                    {type === 'gif' ? '🎞' : type === 'meme' ? '🖼' : type === 'video' ? '🎬' : type === 'music' ? '🎵' : type === 'photo' ? '📸' : '🎨'}
                  </span>
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="Give your content a catchy title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
              required
            />
            <p className="mt-1 text-sm text-gray-500">{title.length}/100 characters</p>
          </div>

          {/* Creator */}
          <div className="mb-6">
            <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
              Creator <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="creator"
              type="text"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="Who created this content?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
              placeholder="Add a description..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50"
            />
            <p className="mt-1 text-sm text-gray-500">{description.length}/500 characters</p>
          </div>

          {/* Source Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Source <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleSourceTypeChange('file')}
                disabled={isSubmitting}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors
                  ${sourceType === 'file'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }
                `}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => handleSourceTypeChange('url')}
                disabled={isSubmitting}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors
                  ${sourceType === 'url'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }
                `}
              >
                External URL
              </button>
            </div>

            {/* File Uploader */}
            {sourceType === 'file' && (
              <FileUploader
                contentType={contentType}
                onFileSelect={setFile}
                onFileRemove={() => setFile(null)}
                selectedFile={file}
                disabled={isSubmitting}
              />
            )}

            {/* URL Input */}
            {sourceType === 'url' && (
              <UrlInput
                value={url}
                onChange={setUrl}
                onValidation={handleUrlValidation}
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* Source URL (credit) */}
          <div className="mb-6">
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Original Source URL <span className="text-gray-400">(optional - for attribution)</span>
            </label>
            <input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isSubmitting}
              placeholder="https://... (original creator's link)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div className="mb-8">
            <TagInput
              value={tags}
              onChange={setTags}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit()}
            className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </span>
            ) : (
              'Submit Content'
            )}
          </button>
        </form>
      </div>

      {/* Preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <ContentPreview
            contentType={contentType}
            title={title}
            description={description}
            tags={tags}
            file={file}
            url={sourceType === 'url' ? url : undefined}
            platform={urlPlatform}
          />
        </div>
      </div>
    </div>
  )
}
