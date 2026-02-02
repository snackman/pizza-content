'use client'

import { useState, useEffect, useRef } from 'react'
import { Content } from '@/types/database'

interface ContentDisplayProps {
  content: Content | null
  showInfo?: boolean
  onVideoEnd?: () => void
  isPlaying?: boolean
}

export function ContentDisplay({
  content,
  showInfo = false,
  onVideoEnd,
  isPlaying = true,
}: ContentDisplayProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayedContent, setDisplayedContent] = useState<Content | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle content transitions
  useEffect(() => {
    if (content?.id !== displayedContent?.id) {
      setIsTransitioning(true)
      setImageLoaded(false)

      const timeout = setTimeout(() => {
        setDisplayedContent(content)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [content, displayedContent?.id])

  // Handle video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay blocked - this is handled by the video muted attribute
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, displayedContent])

  if (!displayedContent) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">&#127829;</div>
          <p className="text-white text-xl">Loading content...</p>
        </div>
      </div>
    )
  }

  const isVideo = displayedContent.type === 'video'
  const isYouTube = displayedContent.url?.includes('youtube.com') || displayedContent.url?.includes('youtu.be')

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center bg-black transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {isVideo && isYouTube ? (
        <iframe
          src={`${displayedContent.url}?autoplay=1&mute=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={displayedContent.title}
        />
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={displayedContent.url}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop={!onVideoEnd}
          playsInline
          onEnded={onVideoEnd}
        />
      ) : (
        <>
          {/* Show loading placeholder until image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl animate-pulse">&#127829;</div>
            </div>
          )}
          <img
            src={displayedContent.url}
            alt={displayedContent.title}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </>
      )}

      {/* Content Info Overlay */}
      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <h3 className="text-white text-xl font-bold">{displayedContent.title}</h3>
          {displayedContent.description && (
            <p className="text-white/80 mt-1">{displayedContent.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-1 bg-white/20 rounded text-white text-sm uppercase">
              {displayedContent.type}
            </span>
            {displayedContent.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-white/10 rounded text-white/70 text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
