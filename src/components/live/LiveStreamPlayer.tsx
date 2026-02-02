'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveStream, LiveStreamSettings } from '@/hooks/useLiveStream'
import { ContentDisplay } from './ContentDisplay'
import { LiveStreamControls } from './LiveStreamControls'
import { LiveStreamMusic } from './LiveStreamMusic'

interface LiveStreamPlayerProps {
  initialSettings?: Partial<LiveStreamSettings>
}

export function LiveStreamPlayer({ initialSettings }: LiveStreamPlayerProps) {
  const [controlsVisible, setControlsVisible] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const {
    settings,
    currentContent,
    currentIndex,
    totalCount,
    isPlaying,
    isLoading,
    isFullscreen,
    next,
    previous,
    togglePlay,
    toggleFullscreen,
    toggleContentType,
    toggleShuffle,
    toggleMusic,
    setVolume,
    setIntervalSeconds,
    toggleInfo,
  } = useLiveStream({ initialSettings })

  // Auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true)

    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }

    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false)
      }
    }, 3000)
  }, [isPlaying])

  // Show controls on mouse move
  const handleMouseMove = useCallback(() => {
    showControls()
  }, [showControls])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      setControlsVisible(false)
    }
  }, [isPlaying])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          showControls()
          break
        case 'ArrowRight':
          e.preventDefault()
          next()
          showControls()
          break
        case 'ArrowLeft':
          e.preventDefault()
          previous()
          showControls()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMusic()
          showControls()
          break
        case 'i':
        case 'I':
          e.preventDefault()
          toggleInfo()
          showControls()
          break
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, next, previous, toggleFullscreen, toggleMusic, toggleInfo, isFullscreen, showControls])

  // Touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Minimum swipe distance
    const minSwipeDistance = 50

    // Horizontal swipe (skip content)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        previous()
      } else {
        next()
      }
      showControls()
    }
    // Tap (toggle play/pause)
    else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Check if tap is on controls area
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const tapY = e.changedTouches[0].clientY - rect.top
        const tapX = e.changedTouches[0].clientX - rect.left

        // Tap on edges shows controls
        if (tapX < 50 || tapX > rect.width - 50) {
          showControls()
        }
        // Tap in center toggles play
        else if (tapY > rect.height * 0.2 && tapY < rect.height * 0.8) {
          togglePlay()
          showControls()
        }
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }, [next, previous, togglePlay, showControls])

  // Show controls when paused
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true)
    }
  }, [isPlaying])

  // Handle audio prompt
  const handleEnableAudio = useCallback(() => {
    setAudioEnabled(true)
    // Audio will be handled by the music integration later
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">&#127829;</div>
          <p className="text-white text-xl">Loading pizza content...</p>
        </div>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">&#127829;</div>
          <p className="text-white text-xl">No content available</p>
          <p className="text-white/70 mt-2">Try adjusting your content filters</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content Display */}
      <ContentDisplay
        content={currentContent}
        showInfo={settings.showInfo}
        isPlaying={isPlaying}
      />

      {/* Music Player */}
      <LiveStreamMusic
        enabled={audioEnabled && settings.musicEnabled}
        volume={settings.musicVolume}
      />

      {/* Audio Enable Prompt (shown initially) */}
      {!audioEnabled && settings.musicEnabled && (
        <button
          onClick={handleEnableAudio}
          className="absolute top-4 right-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors z-20 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          Enable Audio
        </button>
      )}

      {/* Playing indicator (when controls hidden) */}
      {!controlsVisible && isPlaying && (
        <div className="absolute top-4 left-4 flex items-center gap-2 text-white/50 z-10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">Playing</span>
        </div>
      )}

      {/* Controls */}
      <LiveStreamControls
        settings={settings}
        isPlaying={isPlaying}
        isFullscreen={isFullscreen}
        currentIndex={currentIndex}
        totalCount={totalCount}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrevious={previous}
        onToggleFullscreen={toggleFullscreen}
        onToggleContentType={toggleContentType}
        onToggleShuffle={toggleShuffle}
        onToggleMusic={toggleMusic}
        onVolumeChange={setVolume}
        onIntervalChange={setIntervalSeconds}
        onToggleInfo={toggleInfo}
        isVisible={controlsVisible}
      />

      {/* Keyboard shortcuts hint (only shown when paused) */}
      {!isPlaying && controlsVisible && (
        <div className="absolute top-4 left-4 bg-black/60 rounded-lg p-3 text-white/70 text-sm z-10">
          <p className="font-medium text-white mb-2">Keyboard Shortcuts</p>
          <ul className="space-y-1">
            <li>
              <span className="text-white/50">Space</span> - Play/Pause
            </li>
            <li>
              <span className="text-white/50">Arrows</span> - Navigate
            </li>
            <li>
              <span className="text-white/50">F</span> - Fullscreen
            </li>
            <li>
              <span className="text-white/50">M</span> - Mute
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
