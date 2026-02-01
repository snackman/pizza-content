'use client'

import { useState } from 'react'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'

interface FavoriteButtonProps {
  contentId: string
  className?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function FavoriteButton({
  contentId,
  className = '',
  size = 'md',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isAuthenticated } = useAuth()
  const [isAnimating, setIsAnimating] = useState(false)

  const favorited = isFavorite(contentId)

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      // Redirect to login or show a toast
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
      return
    }

    setIsAnimating(true)
    await toggleFavorite(contentId)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        rounded-full
        transition-all
        duration-200
        ${favorited
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-black/50 text-white hover:bg-black/70'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
        ${className}
      `}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className={`${iconSizes[size]} ${isAnimating ? 'animate-pulse' : ''}`}
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
