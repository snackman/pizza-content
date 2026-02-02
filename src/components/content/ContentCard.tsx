'use client'

import Image from 'next/image'
import { Content } from '@/types/database'
import { FavoriteButton } from '@/components/ui/FavoriteButton'

interface ContentCardProps {
  item: Content
  showType?: boolean
  showFavorite?: boolean
}

const typeColors: Record<string, string> = {
  gif: 'bg-orange-500',
  meme: 'bg-yellow-500',
  video: 'bg-red-500',
  music: 'bg-green-500',
  photo: 'bg-blue-500',
  art: 'bg-pink-500',
}

export function ContentCard({ item, showType = false, showFavorite = true }: ContentCardProps) {
  const isVideo = item.type === 'video'
  const isMusic = item.type === 'music'

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isVideo && !item.url.includes('supabase')) {
      // External video - open in new tab
      window.open(item.url, '_blank')
      return
    }

    try {
      const response = await fetch(item.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${item.type === 'gif' ? 'gif' : item.type === 'meme' ? 'png' : item.type === 'music' ? 'mp3' : 'mp4'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab
      window.open(item.url, '_blank')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group relative">
      <div className="aspect-square relative bg-gray-100">
        {isMusic ? (
          <a href="/music" className="block w-full h-full">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </a>
        ) : isVideo ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-6xl">
                🎬
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <span className="text-xl ml-1">▶</span>
              </div>
            </div>
          </a>
        ) : (
          <Image
            src={item.url}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
        )}

        {/* Type badge */}
        {showType && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-white text-xs font-medium ${typeColors[item.type]}`}>
            {item.type.toUpperCase()}
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Favorite button */}
          {showFavorite && (
            <FavoriteButton contentId={item.id} size="sm" />
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            title="Download"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate" title={item.title}>
          {item.title}
        </h3>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag) => (
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
  )
}
