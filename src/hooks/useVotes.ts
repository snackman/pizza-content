'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

type VoteType = 'up' | 'down' | null

export function useContentVotes() {
  return useVotesInternal('content')
}

export function useAllStarVotes() {
  return useVotesInternal('all-star')
}

function useVotesInternal(type: 'content' | 'all-star') {
  const [votes, setVotes] = useState<Map<string, VoteType>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const supabase = createClient()

  const rpcGetVotes = type === 'content' ? 'get_user_content_votes' : 'get_user_all_star_votes'
  const idsParam = type === 'content' ? 'p_content_ids' : 'p_all_star_ids'
  const idField = type === 'content' ? 'content_id' : 'all_star_id'

  const fetchVotesForIds = useCallback(async (ids: string[]) => {
    if (!isAuthenticated || ids.length === 0) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase.rpc(rpcGetVotes as any, { [idsParam]: ids })
      if (!error && data) {
        const newVotes = new Map<string, VoteType>()
        const rows = data as unknown as Array<{ [key: string]: string }>
        rows.forEach((row) => {
          newVotes.set(row[idField], row.vote_type as VoteType)
        })
        setVotes(newVotes)
      }
    } catch (err) {
      console.error('Error fetching votes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, supabase, rpcGetVotes, idsParam, idField])

  const getUserVote = useCallback((id: string): VoteType => {
    return votes.get(id) ?? null
  }, [votes])

  return { votes, isLoading, getUserVote, fetchVotesForIds }
}
