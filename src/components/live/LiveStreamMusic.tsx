'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Content } from '@/types/database'

interface LiveStreamMusicProps {
  enabled: boolean
  volume: number // 0-100
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function LiveStreamMusic({ enabled, volume }: LiveStreamMusicProps) {
  const [tracks, setTracks] = useState<Content[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  // Fetch music tracks
  useEffect(() => {
    async function fetchTracks() {
      setIsLoading(true)
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'music')
        .in('status', ['approved', 'featured'])
        .limit(100)

      if (data && data.length > 0) {
        setTracks(shuffleArray(data))
      }
      setIsLoading(false)
    }
    fetchTracks()
  }, [supabase])

  const currentTrack = tracks[currentIndex]

  // Handle play/pause based on enabled prop
  useEffect(() => {
    if (!audioRef.current || tracks.length === 0) return

    if (enabled) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked - user interaction required
      })
    } else {
      audioRef.current.pause()
    }
  }, [enabled, tracks.length, currentIndex])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Handle track end - play next
  const handleEnded = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length)
  }, [tracks.length])

  // Handle error - skip to next
  const handleError = useCallback(() => {
    if (tracks.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % tracks.length)
    }
  }, [tracks.length])

  // Skip to next track
  const skipNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length)
  }, [tracks.length])

  if (!enabled || tracks.length === 0 || isLoading) return null

  return (
    <div className="absolute bottom-4 left-4 z-30">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={handleEnded}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        autoPlay
      />

      {/* Minimal music indicator */}
      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
        {/* Playing indicator */}
        <div className="flex items-center gap-1">
          {isPlaying ? (
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-green-500 animate-pulse" />
              <div className="w-1 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '75ms' }} />
              <div className="w-1 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '150ms' }} />
            </div>
          ) : (
            <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
        </div>

        {/* Track info */}
        <div className="max-w-48 overflow-hidden">
          <p className="text-white text-sm truncate">
            {currentTrack?.title || 'Loading...'}
          </p>
          {currentTrack?.artist && (
            <p className="text-white/60 text-xs truncate">{currentTrack.artist}</p>
          )}
        </div>

        {/* Skip button */}
        <button
          onClick={skipNext}
          className="p-1 text-white/70 hover:text-white transition-colors"
          title="Next track"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
