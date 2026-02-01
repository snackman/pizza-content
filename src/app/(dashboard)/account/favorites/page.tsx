'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFavorites } from '@/hooks/useFavorites'
import { ContentCard } from '@/components/content/ContentCard'
import { ContentType } from '@/types/database'

export default function FavoritesPage() {
  const { favorites, isLoading } = useFavorites()
  const [filter, setFilter] = useState<ContentType | 'all'>('all')

  const filteredFavorites = filter === 'all'
    ? favorites
    : favorites.filter(item => item.type === filter)

  if (isLoading) {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        <p className="text-gray-500 mt-1">Your saved pizza content</p>
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

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">💔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No favorites yet
          </h3>
          <p className="text-gray-500 mb-6">
            Start exploring and save your favorite pizza content!
          </p>
          <Link
            href="/browse"
            className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Browse Content
          </Link>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {filter}s in your favorites
          </h3>
          <p className="text-gray-500">
            Try selecting a different filter or browse more content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((item) => (
            <ContentCard key={item.id} item={item} showType />
          ))}
        </div>
      )}

      {/* Summary */}
      {favorites.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredFavorites.length} of {favorites.length} favorites
            </span>
            <div className="flex gap-4">
              <span>GIFs: {favorites.filter(c => c.type === 'gif').length}</span>
              <span>Memes: {favorites.filter(c => c.type === 'meme').length}</span>
              <span>Videos: {favorites.filter(c => c.type === 'video').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
