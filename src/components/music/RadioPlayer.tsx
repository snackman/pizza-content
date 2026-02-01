'use client'

import { useRadio } from '@/hooks/useRadio'
import { MusicCardCompact } from './MusicCard'

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface RadioPlayerProps {
  embed?: boolean
}

export function RadioPlayer({ embed = false }: RadioPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    history,
    isLoading,
    error,
    play,
    pause,
    toggle,
    skip,
    setVolume,
  } = useRadio()

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-500">Loading Pizza Radio...</p>
      </div>
    )
  }

  // Compact embed mode
  if (embed) {
    return (
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-4 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Album art */}
          <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 uppercase tracking-wider">Pizza Radio</p>
            <p className="font-semibold truncate">{currentTrack?.title || 'No track'}</p>
            {currentTrack?.artist && (
              <p className="text-sm text-white/80 truncate">{currentTrack.artist}</p>
            )}
          </div>

          {/* Play/Pause */}
          <button
            onClick={toggle}
            className="p-3 bg-white text-green-600 rounded-full hover:bg-white/90 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    )
  }

  // Full player mode
  return (
    <div className="max-w-4xl mx-auto">
      {/* Main player card */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Album art */}
          <div className="w-64 h-64 flex-shrink-0 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden shadow-lg">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }}>
                <svg className="w-32 h-32 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Track info and controls */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-white/70 uppercase tracking-wider mb-2">Now Playing</p>
            <h2 className="text-3xl font-bold mb-2">{currentTrack?.title || 'No track loaded'}</h2>
            {currentTrack?.artist && (
              <p className="text-xl text-white/80 mb-1">{currentTrack.artist}</p>
            )}
            {currentTrack?.album && (
              <p className="text-white/60">{currentTrack.album}</p>
            )}

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-white/70 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
              {/* Skip back (not implemented for radio) */}
              <button
                className="p-3 text-white/50 cursor-not-allowed"
                disabled
                title="Previous track not available in radio mode"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={toggle}
                className="p-4 bg-white text-green-600 rounded-full hover:bg-white/90 transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip */}
              <button
                onClick={skip}
                className="p-3 text-white hover:text-white/80 transition-colors"
                title="Skip to next track"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
              <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-32 h-2 accent-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Up next */}
      {queue.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Up Next</h3>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {queue.slice(0, 5).map((track, index) => (
              <MusicCardCompact
                key={`${track.id}-${index}`}
                track={track}
                onPlay={() => {}} // Can't select in radio mode
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recently Played</h3>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {history.slice(0, 5).map((track, index) => (
              <MusicCardCompact
                key={`${track.id}-history-${index}`}
                track={track}
                onPlay={() => {}} // Can't replay in radio mode
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
