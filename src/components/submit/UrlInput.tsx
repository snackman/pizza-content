'use client'

import { useState, useEffect, useCallback } from 'react'
import { validateUrl, getYouTubeThumbnail } from '@/lib/upload'

interface UrlInputProps {
  value: string
  onChange: (url: string) => void
  onValidation: (valid: boolean, platform?: string) => void
  disabled?: boolean
}

export function UrlInput({
  value,
  onChange,
  onValidation,
  disabled = false,
}: UrlInputProps) {
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const validateAndUpdate = useCallback(
    (url: string) => {
      if (!url) {
        setError(null)
        setPlatform(null)
        setPreview(null)
        onValidation(false)
        return
      }

      const result = validateUrl(url)
      if (result.valid) {
        setError(null)
        setPlatform(result.platform || null)
        onValidation(true, result.platform)

        // Generate preview for supported platforms
        if (result.platform === 'youtube') {
          const thumbnail = getYouTubeThumbnail(url)
          setPreview(thumbnail)
        } else if (result.platform === 'direct') {
          // For direct media URLs, use the URL itself as preview
          if (/\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(url)) {
            setPreview(url)
          } else {
            setPreview(null)
          }
        } else {
          setPreview(null)
        }
      } else {
        setError(result.error || 'Invalid URL')
        setPlatform(null)
        setPreview(null)
        onValidation(false)
      }
    },
    [onValidation]
  )

  // Debounce validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateAndUpdate(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, validateAndUpdate])

  const platformLabels: Record<string, { name: string; icon: string }> = {
    youtube: { name: 'YouTube', icon: '▶' },
    tiktok: { name: 'TikTok', icon: '♪' },
    instagram: { name: 'Instagram', icon: '📷' },
    twitter: { name: 'X/Twitter', icon: '𝕏' },
    direct: { name: 'Direct Media', icon: '🔗' },
    other: { name: 'External Link', icon: '🌐' },
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        External URL
      </label>

      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://youtube.com/watch?v=... or direct media URL"
          className={`
            w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent
            ${error ? 'border-red-300' : platform ? 'border-green-300' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
          `}
        />
        {platform && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              <span>{platformLabels[platform]?.icon}</span>
              <span>{platformLabels[platform]?.name}</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Supported platforms hint */}
      {!value && !disabled && (
        <p className="text-sm text-gray-500">
          Supports: YouTube, TikTok, Instagram, Twitter/X, and direct media URLs
        </p>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
          <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="URL preview"
              className="w-full h-full object-cover"
              onError={() => setPreview(null)}
            />
            {platform === 'youtube' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl ml-1">▶</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
