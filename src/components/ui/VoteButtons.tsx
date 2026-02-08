'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type VoteType = 'up' | 'down' | null

interface VoteButtonsProps {
  upvotes: number
  downvotes: number
  userVote: VoteType
  onVote: (voteType: 'up' | 'down') => Promise<{ upvotes: number; downvotes: number } | null>
  size?: 'sm' | 'md'
  showNet?: boolean
}

export function VoteButtons({
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote,
  onVote,
  size = 'md',
  showNet = true,
}: VoteButtonsProps) {
  const { isAuthenticated } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting) return
    if (!isAuthenticated) {
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
      return
    }

    setIsVoting(true)
    try {
      const result = await onVote(voteType)
      if (result) {
        setUpvotes(result.upvotes)
        setDownvotes(result.downvotes)
      }
    } finally {
      setIsVoting(false)
    }
  }

  const net = upvotes - downvotes

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting}
        className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
          userVote === 'up' ? 'text-green-600 font-semibold' : 'text-gray-600 hover:text-green-600'
        }`}
        title={userVote === 'up' ? 'Remove upvote' : 'Upvote'}
      >
        <svg className={iconSize} fill={userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span className="font-medium">{upvotes}</span>
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={isVoting}
        className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
          userVote === 'down' ? 'text-red-600 font-semibold' : 'text-gray-600 hover:text-red-600'
        }`}
        title={userVote === 'down' ? 'Remove downvote' : 'Downvote'}
      >
        <svg className={iconSize} fill={userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="font-medium">{downvotes}</span>
      </button>
      {showNet && (
        <span className="text-sm text-gray-400 ml-auto">
          {net > 0 ? '+' : ''}{net} net
        </span>
      )}
    </div>
  )
}
