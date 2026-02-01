'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Content } from '@/types/database'
import { MusicCard } from '@/components/music/MusicCard'
import { MusicPlayer } from '@/components/music/MusicPlayer'
import { useMusic } from '@/hooks/useMusic'

export default function MusicPage() {
  const [tracks, setTracks] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    playTrack,
    toggle,
    skip,
    previous,
    seek,
    setVolume,
    setQueue,
  } = useMusic()

  useEffect(() => {
    async function fetchMusic() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/music?limit=100')
        if (!response.ok) {
          throw new Error('Failed to fetch music')
        }
        const data = await response.json()
        setTracks(data.tracks || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load music')
        console.error('Error fetching music:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMusic()
  }, [])

  const handlePlayTrack = (track: Content) => {
    // Find the track index and set queue from that point
    const trackIndex = tracks.findIndex((t) => t.id === track.id)
    if (trackIndex !== -1) {
      setQueue(tracks, trackIndex)
    } else {
      playTrack(track)
    }
  }

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0)
    }
  }

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      setQueue(shuffled, 0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </span>
              <div>
                <h1 className="text-4xl font-bold">Pizza Music</h1>
                <p className="text-green-100 mt-1">
                  {tracks.length} tracks in the library
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePlayAll}
                disabled={tracks.length === 0}
                className="px-6 py-2 bg-white text-green-700 font-medium rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play All
              </button>
              <button
                onClick={handleShuffle}
                disabled={tracks.length === 0}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
                Shuffle
              </button>
              <Link
                href="/radio"
                className="px-6 py-2 bg-green-800 text-white font-medium rounded-lg hover:bg-green-900 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 6H8.3l8.26-3.34L15.88 1 3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2zm-8 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                </svg>
                Pizza Radio
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading music...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No music found</p>
            <p className="text-gray-400 mt-2">
              Music tracks will appear here once they are imported.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tracks.map((track) => (
              <MusicCard
                key={track.id}
                track={track}
                onPlay={handlePlayTrack}
                isPlaying={isPlaying}
                isCurrent={currentTrack?.id === track.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Persistent music player */}
      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={toggle}
        onSkip={skip}
        onPrevious={previous}
        volume={volume}
        onVolumeChange={setVolume}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />
    </div>
  )
}
