'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Content, ContentType } from '@/types/database'

export interface LiveStreamSettings {
  intervalSeconds: number
  shuffleEnabled: boolean
  contentTypes: ContentType[]
  musicEnabled: boolean
  musicVolume: number
  showInfo: boolean
}

interface UseLiveStreamOptions {
  initialSettings?: Partial<LiveStreamSettings>
}

const DEFAULT_SETTINGS: LiveStreamSettings = {
  intervalSeconds: 10,
  shuffleEnabled: true,
  contentTypes: ['gif', 'meme', 'video'],
  musicEnabled: true,
  musicVolume: 50,
  showInfo: false,
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useLiveStream(options: UseLiveStreamOptions = {}) {
  const [settings, setSettings] = useState<LiveStreamSettings>({
    ...DEFAULT_SETTINGS,
    ...options.initialSettings,
  })
  const [content, setContent] = useState<Content[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set())

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Fetch content from Supabase
  const fetchContent = useCallback(async () => {
    setIsLoading(true)

    let query = supabase
      .from('content')
      .select('*')
      .in('status', ['approved', 'featured'])
      .in('type', settings.contentTypes)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching content:', error)
      setIsLoading(false)
      return
    }

    let contentList = data || []

    if (settings.shuffleEnabled) {
      contentList = shuffleArray(contentList)
    }

    setContent(contentList)
    setCurrentIndex(0)
    setIsLoading(false)
  }, [supabase, settings.contentTypes, settings.shuffleEnabled])

  // Initial fetch
  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Current content item
  const currentContent = content[currentIndex] || null

  // Get next items for preloading
  const getNextItems = useCallback((count: number = 2): Content[] => {
    const items: Content[] = []
    for (let i = 1; i <= count; i++) {
      const nextIndex = (currentIndex + i) % content.length
      if (content[nextIndex]) {
        items.push(content[nextIndex])
      }
    }
    return items
  }, [content, currentIndex])

  // Preload next items
  const preloadNext = useCallback((count: number = 2) => {
    const nextItems = getNextItems(count)

    nextItems.forEach((item) => {
      if (preloadedUrls.has(item.url)) return

      if (item.type === 'video') {
        // Preload video
        const video = document.createElement('video')
        video.preload = 'auto'
        video.src = item.url
      } else {
        // Preload image/gif
        const img = new Image()
        img.src = item.url
      }

      setPreloadedUrls((prev) => new Set([...prev, item.url]))
    })
  }, [getNextItems, preloadedUrls])

  // Navigate to next content
  const next = useCallback(() => {
    if (content.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % content.length)
  }, [content.length])

  // Navigate to previous content
  const previous = useCallback(() => {
    if (content.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + content.length) % content.length)
  }, [content.length])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // Play
  const play = useCallback(() => {
    setIsPlaying(true)
  }, [])

  // Pause
  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error('Fullscreen error:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch((err) => {
        console.error('Exit fullscreen error:', err)
      })
    }
  }, [])

  // Update settings
  const updateSettings = useCallback((updates: Partial<LiveStreamSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  // Toggle content type
  const toggleContentType = useCallback((type: ContentType) => {
    setSettings((prev) => {
      const types = prev.contentTypes.includes(type)
        ? prev.contentTypes.filter((t) => t !== type)
        : [...prev.contentTypes, type]

      // Ensure at least one type is selected
      if (types.length === 0) return prev

      return { ...prev, contentTypes: types }
    })
  }, [])

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setSettings((prev) => ({ ...prev, shuffleEnabled: !prev.shuffleEnabled }))
  }, [])

  // Toggle music
  const toggleMusic = useCallback(() => {
    setSettings((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }))
  }, [])

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => ({ ...prev, musicVolume: Math.max(0, Math.min(100, volume)) }))
  }, [])

  // Toggle info display
  const toggleInfo = useCallback(() => {
    setSettings((prev) => ({ ...prev, showInfo: !prev.showInfo }))
  }, [])

  // Set interval
  const setIntervalSeconds = useCallback((seconds: number) => {
    setSettings((prev) => ({ ...prev, intervalSeconds: Math.max(5, Math.min(60, seconds)) }))
  }, [])

  // Auto-advance interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (isPlaying && content.length > 0) {
      intervalRef.current = setInterval(() => {
        next()
      }, settings.intervalSeconds * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, settings.intervalSeconds, content.length, next])

  // Preload next content when current changes
  useEffect(() => {
    if (currentContent) {
      // Preload less on mobile for performance
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      preloadNext(isMobile ? 1 : 2)
    }
  }, [currentIndex, currentContent, preloadNext])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Handle visibility change (pause when tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pause])

  return {
    // State
    settings,
    content,
    currentContent,
    currentIndex,
    totalCount: content.length,
    isPlaying,
    isLoading,
    isFullscreen,

    // Navigation
    next,
    previous,

    // Playback
    togglePlay,
    play,
    pause,

    // Fullscreen
    toggleFullscreen,

    // Settings
    updateSettings,
    toggleContentType,
    toggleShuffle,
    toggleMusic,
    setVolume,
    toggleInfo,
    setIntervalSeconds,

    // Data
    refetch: fetchContent,
    getNextItems,
  }
}
