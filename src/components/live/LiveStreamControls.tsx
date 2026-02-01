'use client'

import { useState, useCallback, useEffect } from 'react'
import { ContentType } from '@/types/database'
import { LiveStreamSettings } from '@/hooks/useLiveStream'

interface LiveStreamControlsProps {
  settings: LiveStreamSettings
  isPlaying: boolean
  isFullscreen: boolean
  currentIndex: number
  totalCount: number
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
  onToggleFullscreen: () => void
  onToggleContentType: (type: ContentType) => void
  onToggleShuffle: () => void
  onToggleMusic: () => void
  onVolumeChange: (volume: number) => void
  onIntervalChange: (seconds: number) => void
  onToggleInfo: () => void
  isVisible?: boolean
  onVisibilityChange?: (visible: boolean) => void
}

export function LiveStreamControls({
  settings,
  isPlaying,
  isFullscreen,
  currentIndex,
  totalCount,
  onTogglePlay,
  onNext,
  onPrevious,
  onToggleFullscreen,
  onToggleContentType,
  onToggleShuffle,
  onToggleMusic,
  onVolumeChange,
  onIntervalChange,
  onToggleInfo,
  isVisible = true,
  onVisibilityChange,
}: LiveStreamControlsProps) {
  const [showSettings, setShowSettings] = useState(false)

  const contentTypes: ContentType[] = ['gif', 'meme', 'video']

  // Close settings panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showSettings && !target.closest('[data-settings-panel]')) {
        setShowSettings(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showSettings])

  return (
    <div
      className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
      }`}
    >
      {/* Gradient background */}
      <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-4 px-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-white/70 text-sm">
            {currentIndex + 1} / {totalCount}
          </span>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Previous */}
          <button
            onClick={onPrevious}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Previous (Left Arrow)"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Next (Right Arrow)"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Left side - Music/Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMusic}
              className={`p-2 rounded-lg transition-colors ${
                settings.musicEnabled
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title="Toggle Music (M)"
            >
              {settings.musicEnabled ? (
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
              ) : (
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
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              )}
            </button>

            {settings.musicEnabled && (
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            )}
          </div>

          {/* Center - Settings button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSettings(!showSettings)
            }}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-orange-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            data-settings-panel
            title="Settings"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Right side - Info & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleInfo}
              className={`p-2 rounded-lg transition-colors ${
                settings.showInfo
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title="Toggle Info"
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? (
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
                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                  />
                </svg>
              ) : (
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
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900/95 rounded-xl p-4 min-w-[280px] shadow-xl"
          data-settings-panel
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-bold mb-4">Settings</h3>

          {/* Interval */}
          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-2">
              Interval: {settings.intervalSeconds}s
            </label>
            <input
              type="range"
              min="5"
              max="60"
              value={settings.intervalSeconds}
              onChange={(e) => onIntervalChange(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-white/50 text-xs mt-1">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Content Types */}
          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-2">Content Types</label>
            <div className="flex gap-2">
              {contentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onToggleContentType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    settings.contentTypes.includes(type)
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Shuffle</span>
            <button
              onClick={onToggleShuffle}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.shuffleEnabled ? 'bg-orange-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.shuffleEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Show Info */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">Show Info</span>
            <button
              onClick={onToggleInfo}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.showInfo ? 'bg-orange-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.showInfo ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
