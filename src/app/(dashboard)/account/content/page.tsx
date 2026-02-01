'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { ContentCard } from '@/components/content/ContentCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Content, ContentType } from '@/types/database'

export default function MyContentPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [content, setContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<ContentType | 'all'>('all')

  const supabase = createClient()

  useEffect(() => {
    async function fetchContent() {
      if (!user) return

      try {
        let query = supabase
          .from('content')
          .select('*')
          .eq('submitted_by', user.id)
          .order('created_at', { ascending: false })

        if (filter !== 'all') {
          query = query.eq('type', filter)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching content:', error)
        } else {
          setContent(data || [])
        }
      } catch (error) {
        console.error('Error fetching content:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchContent()
    }
  }, [user, authLoading, filter, supabase])

  const filteredContent = filter === 'all'
    ? content
    : content.filter(item => item.type === filter)

  if (authLoading || isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Content</h1>
          <p className="text-gray-500 mt-1">Manage your submitted content</p>
        </div>
        <Link
          href="/submit"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
        >
          Submit New
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'gif', 'meme', 'video'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${filter === type
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }
            `}
          >
            {type === 'all' ? 'All' : type.toUpperCase() + 's'}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all'
              ? "You haven't submitted any content yet"
              : `You haven't submitted any ${filter}s yet`}
          </h3>
          <p className="text-gray-500 mb-6">
            Share your favorite pizza content with the community!
          </p>
          <Link
            href="/submit"
            className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Submit Your First Content
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContent.map((item) => (
            <div key={item.id} className="relative">
              <ContentCard item={item} showType />
              <div className="absolute top-12 left-2">
                <StatusBadge status={item.status || 'pending'} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {content.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredContent.length} of {content.length} items
            </span>
            <div className="flex gap-4">
              <span>GIFs: {content.filter(c => c.type === 'gif').length}</span>
              <span>Memes: {content.filter(c => c.type === 'meme').length}</span>
              <span>Videos: {content.filter(c => c.type === 'video').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
