'use client'

import { ContentType } from '@/types/database'
import { getYouTubeThumbnail } from '@/lib/upload'
import { useEffect, useState } from 'react'

interface ContentPreviewProps {
  contentType: ContentType
  title: string
  description?: string
  tags: string[]
  file?: File | null
  url?: string
  platform?: string
}

export function ContentPreview({
  contentType,
  title,
  description,
  tags,
  file,
  url,
  platform,
}: ContentPreviewProps) {
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // Generate preview URL for uploaded file
  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setFilePreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setFilePreview(null)
    }
  }, [file])

  // Determine what to show in the preview
  const getPreviewMedia = () => {
    if (file && filePreview) {
      if (contentType === 'video') {
        return (
          <video
            src={filePreview}
            controls
            className="w-full h-full object-contain bg-black"
          />
        )
      }
      if (contentType === 'music') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="text-6xl mb-4">🎵</div>
            <audio src={filePreview} controls className="w-4/5" />
            <p className="text-white text-sm mt-2 opacity-75">{file.name}</p>
          </div>
        )
      }
      return (
        <img
          src={filePreview}
          alt="Preview"
          className="w-full h-full object-contain"
        />
      )
    }

    if (url) {
      if (platform === 'youtube') {
        const thumbnail = getYouTubeThumbnail(url)
        return (
          <div className="relative w-full h-full">
            {thumbnail && (
              <img
                src={thumbnail}
                alt="YouTube preview"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl ml-1">&#9654;</span>
              </div>
            </div>
          </div>
        )
      }

      if (platform === 'direct' && /\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(url)) {
        return (
          <img
            src={url}
            alt="Direct media preview"
            className="w-full h-full object-contain"
          />
        )
      }

      // For other platforms, show a placeholder
      const platformIcons: Record<string, string> = {
        tiktok: 'TikTok',
        instagram: 'Instagram',
        twitter: 'X/Twitter',
        other: 'External',
      }

      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-4xl mb-2">
            {contentType === 'video' ? '🎬' : contentType === 'gif' ? '🎞' : contentType === 'music' ? '🎵' : contentType === 'photo' ? '📸' : contentType === 'art' ? '🎨' : '🖼'}
          </div>
          <p className="text-sm">{platformIcons[platform || 'other']} Content</p>
          <p className="text-xs text-gray-400 mt-1">Preview available after submission</p>
        </div>
      )
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <div className="text-4xl mb-2">
          {contentType === 'video' ? '🎬' : contentType === 'gif' ? '🎞' : contentType === 'music' ? '🎵' : contentType === 'photo' ? '📸' : contentType === 'art' ? '🎨' : '🖼'}
        </div>
        <p className="text-sm">No content selected</p>
      </div>
    )
  }

  const typeColors: Record<ContentType, string> = {
    gif: 'bg-orange-500',
    meme: 'bg-yellow-500',
    video: 'bg-red-500',
    music: 'bg-purple-500',
    photo: 'bg-blue-500',
    art: 'bg-pink-500',
  }

  if (!title && !file && !url) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">Preview</h3>
        <p className="text-sm text-gray-500">How your submission will appear</p>
      </div>

      <div className="p-4">
        {/* Content preview card */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {/* Media */}
          <div className="aspect-square relative bg-gray-100">
            {getPreviewMedia()}

            {/* Type badge */}
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-white text-xs font-medium ${typeColors[contentType]}`}>
              {contentType.toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h4 className="font-medium text-gray-900 truncate">
              {title || 'Untitled'}
            </h4>
            {description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {description}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
