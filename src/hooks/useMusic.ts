'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Content } from '@/types/database'

export interface MusicState {
  currentTrack: Content | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  queue: Content[]
  queueIndex: number
}

export interface MusicActions {
  play: () => void
  pause: () => void
  toggle: () => void
  skip: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  playTrack: (track: Content) => void
  addToQueue: (track: Content) => void
  clearQueue: () => void
  setQueue: (tracks: Content[], startIndex?: number) => void
}

export function useMusic(): MusicState & MusicActions {
  const [currentTrack, setCurrentTrack] = useState<Content | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueueState] = useState<Content[]>([])
  const [queueIndex, setQueueIndex] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume

      // Load saved volume from localStorage
      const savedVolume = localStorage.getItem('pizza-music-volume')
      if (savedVolume) {
        const vol = parseFloat(savedVolume)
        setVolumeState(vol)
        audioRef.current.volume = vol
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => {
      // Auto-advance to next track
      if (queueIndex < queue.length - 1) {
        setQueueIndex((prev) => prev + 1)
      } else {
        setIsPlaying(false)
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [queue.length, queueIndex])

  // Load track when queue index changes
  useEffect(() => {
    if (queue.length > 0 && queueIndex < queue.length) {
      const track = queue[queueIndex]
      setCurrentTrack(track)

      if (audioRef.current) {
        audioRef.current.src = track.url
        audioRef.current.load()
        if (isPlaying) {
          audioRef.current.play().catch(console.error)
        }
      }
    }
  }, [queueIndex, queue])

  const play = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().catch(console.error)
    }
  }, [currentTrack])

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
    if (queueIndex < queue.length - 1) {
      setQueueIndex((prev) => prev + 1)
    }
  }, [queueIndex, queue.length])

  const previous = useCallback(() => {
    if (audioRef.current && currentTime > 3) {
      // If more than 3 seconds in, restart current track
      audioRef.current.currentTime = 0
    } else if (queueIndex > 0) {
      setQueueIndex((prev) => prev - 1)
    }
  }, [queueIndex, currentTime])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(1, vol))
    setVolumeState(clampedVol)
    if (audioRef.current) {
      audioRef.current.volume = clampedVol
    }
    localStorage.setItem('pizza-music-volume', clampedVol.toString())
  }, [])

  const playTrack = useCallback((track: Content) => {
    setQueueState([track])
    setQueueIndex(0)
    setCurrentTrack(track)

    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.load()
      audioRef.current.play().catch(console.error)
    }
  }, [])

  const addToQueue = useCallback((track: Content) => {
    setQueueState((prev) => [...prev, track])
  }, [])

  const clearQueue = useCallback(() => {
    setQueueState([])
    setQueueIndex(0)
    setCurrentTrack(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [])

  const setQueue = useCallback((tracks: Content[], startIndex = 0) => {
    setQueueState(tracks)
    setQueueIndex(startIndex)
    if (tracks.length > 0) {
      const track = tracks[startIndex]
      setCurrentTrack(track)

      if (audioRef.current) {
        audioRef.current.src = track.url
        audioRef.current.load()
        audioRef.current.play().catch(console.error)
      }
    }
  }, [])

  return {
    // State
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    // Actions
    play,
    pause,
    toggle,
    skip,
    previous,
    seek,
    setVolume,
    playTrack,
    addToQueue,
    clearQueue,
    setQueue,
  }
}

// Hook to fetch music tracks from the database
export function useMusicLibrary() {
  const [tracks, setTracks] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchTracks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'music')
      .in('status', ['approved', 'featured'])
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      console.error('Error fetching music:', fetchError)
    } else {
      setTracks(data || [])
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  return {
    tracks,
    isLoading,
    error,
    refetch: fetchTracks,
  }
}
