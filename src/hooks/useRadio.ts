'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Content } from '@/types/database'

/**
 * useRadio - A hook for continuous random music playback (Pizza Radio)
 *
 * This hook provides background music functionality for the live stream player
 * and the dedicated /radio page.
 *
 * Usage:
 * ```typescript
 * import { useRadio } from '@/hooks/useRadio'
 *
 * const { currentTrack, isPlaying, play, skip, isAvailable } = useRadio()
 * ```
 */

// Legacy interface for backwards compatibility
export interface RadioTrack {
  id: string
  title: string
  artist: string
  url: string
  duration: number
}

export interface RadioState {
  currentTrack: Content | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  queue: Content[]
  history: Content[]
  isLoading: boolean
  error: string | null
}

export interface RadioActions {
  play: () => void
  pause: () => void
  toggle: () => void
  togglePlay: () => void // Alias for toggle (backwards compat)
  skip: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  getNextTrack: () => Promise<Content | null>
}

// Full return type combining state and actions
export interface UseRadioReturn extends RadioState, RadioActions {
  // Legacy compatibility
  isMuted: boolean
  isAvailable: boolean
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useRadio(): UseRadioReturn {
  const [currentTrack, setCurrentTrack] = useState<Content | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<Content[]>([])
  const [history, setHistory] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const allTracksRef = useRef<Content[]>([])
  const previousVolume = useRef(0.8)

  // Initialize audio element and load tracks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize audio
      if (!audioRef.current) {
        audioRef.current = new Audio()

        // Load saved volume
        const savedVolume = localStorage.getItem('pizza-radio-volume')
        if (savedVolume) {
          const vol = parseFloat(savedVolume)
          setVolumeState(vol)
          audioRef.current.volume = vol
        } else {
          audioRef.current.volume = 0.8
        }

        // Load mute state
        const savedMuted = localStorage.getItem('pizza-radio-muted')
        if (savedMuted === 'true') {
          setIsMuted(true)
          audioRef.current.muted = true
        }
      }

      // Fetch all music tracks
      fetchAllTracks()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchAllTracks = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/music?limit=1000')
      if (!response.ok) {
        throw new Error('Failed to fetch music')
      }

      const data = await response.json()
      allTracksRef.current = data.tracks || []

      // Initialize queue with shuffled tracks
      if (allTracksRef.current.length > 0) {
        const shuffled = shuffleArray(allTracksRef.current)
        setQueue(shuffled)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load music')
      console.error('Error fetching radio tracks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      // Auto-advance to next track
      advanceToNextTrack()
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = (e: Event) => {
      console.error('Audio error:', e)
      // Try next track on error
      advanceToNextTrack()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  const advanceToNextTrack = useCallback(() => {
    if (queue.length === 0) {
      // Reshuffle all tracks
      if (allTracksRef.current.length > 0) {
        const shuffled = shuffleArray(allTracksRef.current)
        setQueue(shuffled)
      }
      return
    }

    // Move current track to history
    if (currentTrack) {
      setHistory((prev) => [currentTrack, ...prev].slice(0, 50)) // Keep last 50
    }

    // Get next track from queue
    const [nextTrack, ...remaining] = queue
    setQueue(remaining)
    setCurrentTrack(nextTrack)

    // If queue is getting low, refill it
    if (remaining.length < 5 && allTracksRef.current.length > 0) {
      const moreShuffled = shuffleArray(allTracksRef.current)
      setQueue((prev) => [...prev, ...moreShuffled])
    }

    // Play the track
    if (audioRef.current && nextTrack) {
      audioRef.current.src = nextTrack.url
      audioRef.current.load()
      audioRef.current.play().catch(console.error)
    }
  }, [queue, currentTrack])

  // Auto-start first track when queue is populated
  useEffect(() => {
    if (queue.length > 0 && !currentTrack && !isLoading) {
      const [firstTrack, ...remaining] = queue
      setQueue(remaining)
      setCurrentTrack(firstTrack)

      if (audioRef.current && firstTrack) {
        audioRef.current.src = firstTrack.url
        audioRef.current.load()
        // Don't auto-play, wait for user interaction
      }
    }
  }, [queue, currentTrack, isLoading])

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const skip = useCallback(() => {
    advanceToNextTrack()
  }, [advanceToNextTrack])

  const setVolume = useCallback((vol: number) => {
    // Handle both 0-1 and 0-100 scale for backwards compat
    const normalizedVol = vol > 1 ? vol / 100 : vol
    const clampedVol = Math.max(0, Math.min(1, normalizedVol))
    setVolumeState(clampedVol)
    previousVolume.current = clampedVol
    if (audioRef.current) {
      audioRef.current.volume = clampedVol
    }
    localStorage.setItem('pizza-radio-volume', clampedVol.toString())
    // Unmute if setting volume while muted
    if (isMuted && clampedVol > 0) {
      setIsMuted(false)
      if (audioRef.current) {
        audioRef.current.muted = false
      }
      localStorage.setItem('pizza-radio-muted', 'false')
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (audioRef.current) {
      audioRef.current.muted = newMuted
    }
    localStorage.setItem('pizza-radio-muted', newMuted.toString())
  }, [isMuted])

  const getNextTrack = useCallback(async (): Promise<Content | null> => {
    if (queue.length > 0) {
      return queue[0]
    }

    // Fetch a random track from API
    try {
      const response = await fetch('/api/music/random')
      if (response.ok) {
        const data = await response.json()
        return data.tracks?.[0] || null
      }
    } catch (err) {
      console.error('Error getting next track:', err)
    }

    return null
  }, [queue])

  // Check if radio is available (has tracks)
  const isAvailable = allTracksRef.current.length > 0 || !isLoading

  return {
    // State
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    history,
    isLoading,
    error,
    // Legacy compat
    isMuted,
    isAvailable,
    // Actions
    play,
    pause,
    toggle,
    togglePlay: toggle, // Alias for backwards compat
    skip,
    setVolume,
    toggleMute,
    getNextTrack,
  }
}
