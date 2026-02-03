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
  const [upvotes, setUpvotes] = useState(0)
  const [downvotes, setDownvotes] = useState(0)
  const [isVoting, setIsVoting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle content transitions
  useEffect(() => {
    if (content?.id !== displayedContent?.id) {
      setIsTransitioning(true)
      setImageLoaded(false)

      const timeout = setTimeout(() => {
        setDisplayedContent(content)
        // Initialize vote counts from content
        setUpvotes(content?.upvotes ?? 0)
        setDownvotes(content?.downvotes ?? 0)
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

  const handleVote = async (vote: 'up' | 'down') => {
    if (!displayedContent || isVoting) return

    setIsVoting(true)

    // Optimistic update
    if (vote === 'up') {
      setUpvotes(prev => prev + 1)
    } else {
      setDownvotes(prev => prev + 1)
    }

    try {
      const response = await fetch('/api/content/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: displayedContent.id, vote }),
      })

      if (response.ok) {
        const data = await response.json()
        setUpvotes(data.upvotes)
        setDownvotes(data.downvotes)
      } else {
        // Revert optimistic update on error
        if (vote === 'up') {
          setUpvotes(prev => prev - 1)
        } else {
          setDownvotes(prev => prev - 1)
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      if (vote === 'up') {
        setUpvotes(prev => prev - 1)
      } else {
        setDownvotes(prev => prev - 1)
      }
      console.error('Vote error:', error)
    } finally {
      setIsVoting(false)
    }
  }

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

  // Convert YouTube watch URLs to embed URLs
  const getYouTubeEmbedUrl = (url: string) => {
    // Already an embed URL
    if (url.includes('/embed/')) return url

    // Extract video ID from various YouTube URL formats
    let videoId = ''
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] || ''
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split(/[&#]/)[0] || ''
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center bg-black transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {isVideo && isYouTube ? (
        <iframe
          src={`${getYouTubeEmbedUrl(displayedContent.url)}?autoplay=1&mute=1`}
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

      {/* Flag, Vote Buttons and Link Button - always visible in corner */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {/* Flag Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Implement flag functionality
            console.log('Flag content:', displayedContent.id)
          }}
          className="p-2 bg-black/50 hover:bg-yellow-600/70 rounded-full text-white transition-colors"
          title="Flag content"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        </button>

        {/* Upvote Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleVote('up')
          }}
          disabled={isVoting}
          className="flex items-center gap-1 p-2 bg-black/50 hover:bg-green-600/70 rounded-full text-white transition-colors disabled:opacity-50"
          title="Upvote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-sm font-medium min-w-[1.5rem] text-center">{upvotes}</span>
        </button>

        {/* Downvote Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleVote('down')
          }}
          disabled={isVoting}
          className="flex items-center gap-1 p-2 bg-black/50 hover:bg-red-600/70 rounded-full text-white transition-colors disabled:opacity-50"
          title="Downvote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          <span className="text-sm font-medium min-w-[1.5rem] text-center">{downvotes}</span>
        </button>

        {/* Link Button */}
        {(displayedContent.source_url || displayedContent.url) && (
          <a
            href={displayedContent.source_url || displayedContent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title={`View on ${displayedContent.source_platform || 'source'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Content Info Overlay */}
      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <h3 className="text-white text-xl font-bold">{displayedContent.title}</h3>
          {displayedContent.description && (
            <p className="text-white/80 mt-1">{displayedContent.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-white/20 rounded text-white text-sm uppercase">
              {displayedContent.type}
            </span>
            {displayedContent.source_platform && (
              <span className="px-2 py-1 bg-white/10 rounded text-white/70 text-sm">
                {displayedContent.source_platform}
              </span>
            )}
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
