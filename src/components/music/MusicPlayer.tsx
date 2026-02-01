'use client'

import { useEffect, useState, useRef } from 'react'
import { Content } from '@/types/database'

interface MusicPlayerProps {
  // These props allow the player to be controlled externally
  // or it can work standalone with its own state
  currentTrack?: Content | null
  isPlaying?: boolean
  onPlayPause?: () => void
  onSkip?: () => void
  onPrevious?: () => void
  volume?: number
  onVolumeChange?: (volume: number) => void
  currentTime?: number
  duration?: number
  onSeek?: (time: number) => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function MusicPlayer({
  currentTrack,
  isPlaying = false,
  onPlayPause,
  onSkip,
  onPrevious,
  volume = 0.8,
  onVolumeChange,
  currentTime = 0,
  duration = 0,
  onSeek,
}: MusicPlayerProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  // Don't render if no track
  if (!currentTrack) {
    return null
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !onSeek || !duration) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    onSeek(newTime)
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="h-1 bg-gray-200 cursor-pointer -mt-0.5"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center h-16 gap-4">
          {/* Track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 rounded bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
              {currentTrack.thumbnail_url ? (
                <img
                  src={currentTrack.thumbnail_url}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate text-sm">
                {currentTrack.title}
              </p>
              {currentTrack.artist && (
                <p className="text-gray-500 text-xs truncate">{currentTrack.artist}</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Previous */}
            <button
              onClick={onPrevious}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Previous"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={onSkip}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Next"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Time */}
          <div className="text-xs text-gray-500 tabular-nums hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Volume"
            >
              {volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {showVolumeSlider && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                  className="w-24 h-2 accent-green-600"
                  style={{ writingMode: 'horizontal-tb' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
