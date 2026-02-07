'use client'

import { useEffect, useState, useCallback } from 'react'
import { PizzaAllStar } from '@/types/all-stars'
import { AllStarCard } from '@/components/all-stars/AllStarCard'
import { SubmitAllStarForm } from '@/components/all-stars/SubmitAllStarForm'
import { useAllStarVotes } from '@/hooks/useVotes'
import { useAuth } from '@/hooks/useAuth'

type SortOption = 'upvotes' | 'alphabetical'

export default function AllStarsPage() {
  const [allStars, setAllStars] = useState<PizzaAllStar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('upvotes')
  const [showSubmitForm, setShowSubmitForm] = useState(false)

  const { getUserVote, fetchVotesForIds } = useAllStarVotes()
  const { isAuthenticated } = useAuth()

  const fetchAllStars = async () => {
    try {
      const response = await fetch('/api/all-stars')
      if (!response.ok) {
        throw new Error('Failed to fetch all stars')
      }
      const data = await response.json()
      setAllStars(data)
      return data as PizzaAllStar[]
    } catch (err) {
      console.error('Error fetching all stars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load all stars')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllStars().then((data) => {
      if (isAuthenticated && data.length > 0) {
        fetchVotesForIds(data.map((s: PizzaAllStar) => s.id))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch votes when auth state changes
  useEffect(() => {
    if (isAuthenticated && allStars.length > 0) {
      fetchVotesForIds(allStars.map((s) => s.id))
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = useCallback(async (allStarId: string, voteType: 'up' | 'down') => {
    const response = await fetch('/api/all-stars/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allStarId, vote: voteType }),
    })
    if (response.ok) {
      const data = await response.json()
      // Update local state with new counts
      setAllStars((prev) =>
        prev.map((s) =>
          s.id === allStarId ? { ...s, upvotes: data.upvotes, downvotes: data.downvotes } : s
        )
      )
      // Re-fetch votes to update the user's vote state
      if (isAuthenticated) {
        fetchVotesForIds(allStars.map((s) => s.id))
      }
      return { upvotes: data.upvotes, downvotes: data.downvotes }
    }
    return null
  }, [allStars, isAuthenticated, fetchVotesForIds])

  const sortedAllStars = [...allStars].sort((a, b) => {
    if (sortBy === 'upvotes') {
      return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
    }
    return a.name.localeCompare(b.name)
  })

  const handleSubmitSuccess = () => {
    // Show a success message - the new entry won't appear until approved
    alert('Thanks for your submission! It will appear after review.')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">⭐</span>
              <div>
                <h1 className="text-4xl font-bold">Pizza All Stars</h1>
                <p className="text-yellow-100 mt-1">
                  {allStars.length} legendary pizza personalities
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              + Submit New
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Vote for your favorite pizza legends!
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-600">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="upvotes">Most Popular</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setIsLoading(true)
                fetchAllStars()
              }}
              className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : sortedAllStars.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">⭐</span>
            <p className="text-gray-500 text-lg">No all stars yet</p>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
            >
              Be the first to submit one!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedAllStars.map((allStar) => (
              <AllStarCard
                key={allStar.id}
                allStar={allStar}
                userVote={getUserVote(allStar.id)}
                onVote={(voteType) => handleVote(allStar.id, voteType)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit Form Modal */}
      <SubmitAllStarForm
        isOpen={showSubmitForm}
        onClose={() => setShowSubmitForm(false)}
        onSuccess={handleSubmitSuccess}
      />
    </div>
  )
}
