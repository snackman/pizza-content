'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Content } from '@/types/database'
import { ContentCard } from '@/components/content/ContentCard'

type ContentType = 'all' | 'gif' | 'meme' | 'video' | 'music' | 'photo' | 'art' | 'game'

const ITEMS_PER_PAGE = 24

export default function BrowsePage() {
  const [content, setContent] = useState<Content[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<ContentType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const sentinelRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchContent = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    const from = pageNum * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = supabase
      .from('content')
      .select('*')
      .in('status', ['approved', 'featured'])
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter !== 'all') {
      query = query.eq('type', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching content:', error)
    } else {
      const newItems = data || []
      if (reset) {
        setContent(newItems)
      } else {
        setContent(prev => [...prev, ...newItems])
      }
      setHasMore(newItems.length === ITEMS_PER_PAGE)
    }

    setIsLoading(false)
    setIsLoadingMore(false)
  }, [filter, supabase])

  // Fetch total count
  const fetchTotalCount = useCallback(async () => {
    let query = supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'featured'])

    if (filter !== 'all') {
      query = query.eq('type', filter)
    }

    const { count } = await query
    setTotalCount(count || 0)
  }, [filter, supabase])

  // Initial load and filter changes
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchContent(0, true)
    fetchTotalCount()
  }, [filter, fetchContent, fetchTotalCount])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setPage(prev => {
            const nextPage = prev + 1
            fetchContent(nextPage, false)
            return nextPage
          })
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, fetchContent])

  const filteredContent = content.filter((item) => {
    if (!searchQuery) return true
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Browse All Content</h1>
          <p className="text-purple-100 mt-2">
            Discover pizza GIFs, memes, videos, and music
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'gif', 'meme', 'video', 'music', 'photo', 'art', 'game'] as ContentType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {type === 'all' ? 'All' : type === 'music' || type === 'art' ? type.charAt(0).toUpperCase() + type.slice(1) : type === 'game' ? 'Games' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <p className="mt-4 text-gray-500">
          {totalCount.toLocaleString()} items
        </p>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading content...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No content found</p>
            <Link
              href="/submit"
              className="mt-4 inline-block text-purple-600 hover:text-purple-700 font-medium"
            >
              Submit some content!
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredContent.map((item) => (
                <ContentCard key={item.id} item={item} showType />
              ))}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-10 mt-8">
              {isLoadingMore && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-purple-500 border-t-transparent"></div>
                  <p className="mt-2 text-gray-500 text-sm">Loading more...</p>
                </div>
              )}
              {!hasMore && content.length > 0 && (
                <p className="text-center text-gray-400 text-sm">
                  You've seen it all!
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
