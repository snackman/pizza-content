'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentRequest, RequestClaim, Profile, RequestStatus, ContentType } from '@/types/database'

export interface RequestWithProfile extends ContentRequest {
  requester?: Profile | null
  claims?: RequestClaim[]
}

export interface UseRequestsOptions {
  status?: RequestStatus | 'all'
  type?: ContentType | 'all'
  minBounty?: number
  maxBounty?: number | null
  sortBy?: 'newest' | 'bounty' | 'deadline'
  userId?: string
  limit?: number
}

export function useRequests(options: UseRequestsOptions = {}) {
  const {
    status = 'all',
    type = 'all',
    minBounty = 0,
    maxBounty = null,
    sortBy = 'newest',
    userId,
    limit = 50,
  } = options

  const [requests, setRequests] = useState<RequestWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('content_requests')
        .select(`
          *,
          requester:profiles!content_requests_requested_by_fkey(*)
        `)
        .limit(limit)

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status)
      }

      // Apply type filter
      if (type !== 'all') {
        query = query.eq('type', type)
      }

      // Apply bounty filter
      if (minBounty > 0) {
        query = query.gte('bounty_amount', minBounty)
      }
      if (maxBounty !== null) {
        query = query.lte('bounty_amount', maxBounty)
      }

      // Apply user filter
      if (userId) {
        query = query.eq('requested_by', userId)
      }

      // Apply sorting
      switch (sortBy) {
        case 'bounty':
          query = query.order('bounty_amount', { ascending: false })
          break
        case 'deadline':
          query = query.order('deadline', { ascending: true, nullsFirst: false })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch requests'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, status, type, minBounty, maxBounty, sortBy, userId, limit])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return {
    requests,
    isLoading,
    error,
    refetch: fetchRequests,
  }
}

export function useRequest(requestId: string) {
  const [request, setRequest] = useState<RequestWithProfile | null>(null)
  const [claims, setClaims] = useState<(RequestClaim & { user?: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchRequest = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch request with requester profile
      const { data: requestData, error: requestError } = await supabase
        .from('content_requests')
        .select(`
          *,
          requester:profiles!content_requests_requested_by_fkey(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError) {
        throw requestError
      }

      setRequest(requestData)

      // Fetch claims for this request
      const { data: claimsData, error: claimsError } = await supabase
        .from('request_claims')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('request_id', requestId)
        .order('claimed_at', { ascending: false })

      if (claimsError) {
        console.error('Error fetching claims:', claimsError)
      } else {
        setClaims(claimsData || [])
      }
    } catch (err) {
      console.error('Error fetching request:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch request'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, requestId])

  useEffect(() => {
    if (requestId) {
      fetchRequest()
    }
  }, [requestId, fetchRequest])

  return {
    request,
    claims,
    isLoading,
    error,
    refetch: fetchRequest,
  }
}

export function useUserClaim(requestId: string, userId: string | null) {
  const [claim, setClaim] = useState<RequestClaim | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!userId || !requestId) {
      setClaim(null)
      return
    }

    const fetchClaim = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('request_claims')
          .select('*')
          .eq('request_id', requestId)
          .eq('user_id', userId)
          .order('claimed_at', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching claim:', error)
        }
        setClaim(data || null)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClaim()
  }, [supabase, requestId, userId])

  return { claim, isLoading }
}
