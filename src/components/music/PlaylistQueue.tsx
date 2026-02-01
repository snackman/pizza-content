'use client'

import { Content } from '@/types/database'
import { MusicCardCompact } from './MusicCard'

interface PlaylistQueueProps {
  tracks: Content[]
  currentTrackId?: string
  isPlaying?: boolean
  onTrackSelect?: (track: Content, index: number) => void
  title?: string
  emptyMessage?: string
  maxVisible?: number
}

export function PlaylistQueue({
  tracks,
  currentTrackId,
  isPlaying = false,
  onTrackSelect,
  title = 'Queue',
  emptyMessage = 'No tracks in queue',
  maxVisible = 10,
}: PlaylistQueueProps) {
  const visibleTracks = tracks.slice(0, maxVisible)
  const remainingCount = tracks.length - maxVisible

  if (tracks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {visibleTracks.map((track, index) => (
          <MusicCardCompact
            key={`${track.id}-${index}`}
            track={track}
            isCurrent={track.id === currentTrackId}
            isPlaying={track.id === currentTrackId && isPlaying}
            onPlay={() => onTrackSelect?.(track, index)}
          />
        ))}
      </div>
      {remainingCount > 0 && (
        <div className="px-4 py-3 bg-gray-50 text-center">
          <span className="text-sm text-gray-500">
            + {remainingCount} more track{remainingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
