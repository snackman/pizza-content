'use client'

import { Content } from '@/types/database'

interface MusicCardProps {
  track: Content
  onPlay: (track: Content) => void
  isPlaying?: boolean
  isCurrent?: boolean
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function MusicCard({ track, onPlay, isPlaying = false, isCurrent = false }: MusicCardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all group cursor-pointer ${
        isCurrent ? 'ring-2 ring-green-500' : ''
      }`}
      onClick={() => onPlay(track)}
    >
      <div className="aspect-square relative bg-gradient-to-br from-green-400 to-green-600">
        {track.thumbnail_url ? (
          <img
            src={track.thumbnail_url}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">
              {isCurrent && isPlaying ? (
                <span className="animate-pulse">
                  <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                </span>
              ) : (
                <span>
                  <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </span>
              )}
            </span>
          </div>
        )}

        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium">
          {formatDuration(track.duration_seconds)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate" title={track.title}>
          {track.title}
        </h3>
        {track.artist && (
          <p className="text-gray-500 text-sm truncate" title={track.artist}>
            {track.artist}
          </p>
        )}
        {track.album && (
          <p className="text-gray-400 text-xs truncate mt-1" title={track.album}>
            {track.album}
          </p>
        )}
        {track.tags && track.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {track.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
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

// Compact version for lists/queues
export function MusicCardCompact({
  track,
  onPlay,
  isPlaying = false,
  isCurrent = false,
}: MusicCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${
        isCurrent ? 'bg-green-50' : ''
      }`}
      onClick={() => onPlay(track)}
    >
      {/* Album art / icon */}
      <div className="w-12 h-12 flex-shrink-0 rounded bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
        {track.thumbnail_url ? (
          <img
            src={track.thumbnail_url}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isCurrent ? 'text-green-700' : 'text-gray-900'}`}>
          {track.title}
        </p>
        {track.artist && (
          <p className="text-sm text-gray-500 truncate">{track.artist}</p>
        )}
      </div>

      {/* Duration */}
      <div className="text-sm text-gray-400 flex-shrink-0">
        {formatDuration(track.duration_seconds)}
      </div>

      {/* Playing indicator */}
      {isCurrent && isPlaying && (
        <div className="flex-shrink-0">
          <div className="flex items-end gap-0.5 h-4">
            <div className="w-1 bg-green-500 animate-pulse" style={{ height: '60%' }} />
            <div className="w-1 bg-green-500 animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
            <div className="w-1 bg-green-500 animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
          </div>
        </div>
      )}
    </div>
  )
}
