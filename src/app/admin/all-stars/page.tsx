'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

interface AllStar {
  id: string
  name: string
  slug: string
  description: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  website_url: string | null
  image_url: string | null
  status: string | null
  created_at: string | null
}

interface UploadState {
  [key: string]: {
    uploading: boolean
    error: string | null
    success: boolean
  }
}

export default function AdminAllStarsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [allStars, setAllStars] = useState<AllStar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const supabase = useMemo(() => createClient(), [])

  const fetchAllStars = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('pizza_all_stars' as any)
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setAllStars((data as unknown as AllStar[]) || [])
    } catch (err) {
      console.error('Error fetching all stars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load all stars')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchAllStars()
    }
  }, [authLoading, isAuthenticated, fetchAllStars])

  const handleFileSelect = async (allStarId: string, slug: string, file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setUploadState(prev => ({
        ...prev,
        [allStarId]: { uploading: false, error: 'Invalid file type. Use JPG, PNG, GIF, or WebP.', success: false }
      }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadState(prev => ({
        ...prev,
        [allStarId]: { uploading: false, error: 'File too large. Max 5MB.', success: false }
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      [allStarId]: { uploading: true, error: null, success: false }
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('allStarId', allStarId)
      formData.append('slug', slug)

      const response = await fetch('/api/all-stars/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update local state with new image URL
      setAllStars(prev =>
        prev.map(star =>
          star.id === allStarId
            ? { ...star, image_url: result.imageUrl }
            : star
        )
      )

      setUploadState(prev => ({
        ...prev,
        [allStarId]: { uploading: false, error: null, success: true }
      }))

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          [allStarId]: { ...prev[allStarId], success: false }
        }))
      }, 3000)
    } catch (err) {
      console.error('Upload error:', err)
      setUploadState(prev => ({
        ...prev,
        [allStarId]: {
          uploading: false,
          error: err instanceof Error ? err.message : 'Upload failed',
          success: false
        }
      }))
    }
  }

  const triggerFileInput = (allStarId: string) => {
    fileInputRefs.current[allStarId]?.click()
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You must be logged in to access the admin area.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading All Stars</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAllStars}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-white/80 hover:text-white transition-colors"
            >
              &larr; Back to Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-4">Pizza All Stars</h1>
          <p className="text-orange-100 mt-1">Manage profile photos for Pizza All Stars</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{allStars.length}</div>
            <div className="text-gray-500 text-sm">Total All Stars</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {allStars.filter(s => s.image_url).length}
            </div>
            <div className="text-gray-500 text-sm">With Photos</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {allStars.filter(s => !s.image_url).length}
            </div>
            <div className="text-gray-500 text-sm">Missing Photos</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {allStars.filter(s => s.status === 'approved').length}
            </div>
            <div className="text-gray-500 text-sm">Approved</div>
          </div>
        </div>

        {/* All Stars Grid */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-4"></div>
            <p>Loading All Stars...</p>
          </div>
        ) : allStars.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">No Pizza All Stars found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allStars.map((star) => {
              const state = uploadState[star.id] || { uploading: false, error: null, success: false }

              return (
                <div key={star.id} className="bg-white rounded-xl shadow overflow-hidden">
                  {/* Image Section */}
                  <div className="relative aspect-square bg-gray-100">
                    {star.image_url ? (
                      <Image
                        src={star.image_url}
                        alt={star.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <div className="text-center text-gray-400">
                          <svg
                            className="w-16 h-16 mx-auto mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <p className="text-sm">No photo</p>
                        </div>
                      </div>
                    )}

                    {/* Upload Overlay */}
                    {state.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mb-2"></div>
                          <p className="text-sm">Uploading...</p>
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        star.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : star.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {star.status || 'unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{star.name}</h3>
                    <p className="text-gray-500 text-sm mb-3">@{star.slug}</p>

                    {star.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {star.description}
                      </p>
                    )}

                    {/* Social Links */}
                    <div className="flex gap-2 mb-4">
                      {star.instagram_url && (
                        <a
                          href={star.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-500 hover:text-pink-600"
                          title="Instagram"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </a>
                      )}
                      {star.youtube_url && (
                        <a
                          href={star.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-600"
                          title="YouTube"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      )}
                      {star.tiktok_url && (
                        <a
                          href={star.tiktok_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 hover:text-gray-700"
                          title="TikTok"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                          </svg>
                        </a>
                      )}
                      {star.website_url && (
                        <a
                          href={star.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600"
                          title="Website"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                          </svg>
                        </a>
                      )}
                    </div>

                    {/* Upload Button */}
                    <div>
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[star.id] = el }}
                        className="hidden"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileSelect(star.id, star.slug, file)
                            e.target.value = '' // Reset input
                          }
                        }}
                      />
                      <button
                        onClick={() => triggerFileInput(star.id)}
                        disabled={state.uploading}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          state.uploading
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : star.image_url
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                        {state.uploading
                          ? 'Uploading...'
                          : star.image_url
                          ? 'Replace Photo'
                          : 'Upload Photo'
                        }
                      </button>

                      {/* Status Messages */}
                      {state.error && (
                        <p className="mt-2 text-sm text-red-600">{state.error}</p>
                      )}
                      {state.success && (
                        <p className="mt-2 text-sm text-green-600">Photo uploaded successfully!</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
