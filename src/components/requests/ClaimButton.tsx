'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentRequest, RequestClaim } from '@/types/database'

interface ClaimButtonProps {
  request: ContentRequest
  userId: string | null
  existingClaim: RequestClaim | null
  onClaimSuccess?: () => void
  onAbandonSuccess?: () => void
}

export function ClaimButton({
  request,
  userId,
  existingClaim,
  onClaimSuccess,
  onAbandonSuccess,
}: ClaimButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Check if user is the requester (can't claim own request)
  const isOwnRequest = userId === request.requested_by

  // Check if request is claimable
  const isClaimable =
    request.status === 'open' &&
    !isOwnRequest &&
    userId !== null

  // Check if user has an active claim
  const hasActiveClaim = existingClaim?.status === 'active'

  // Check if claim is expired
  const isClaimExpired =
    existingClaim && new Date(existingClaim.expires_at) < new Date()

  const handleClaim = async () => {
    if (!userId) {
      setError('Please sign in to claim this request')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create claim
      const { error: claimError } = await supabase.from('request_claims').insert({
        request_id: request.id,
        user_id: userId,
      })

      if (claimError) {
        if (claimError.code === '23505') {
          setError('You have already claimed this request')
        } else {
          setError(claimError.message)
        }
        return
      }

      // Update request status to in_progress
      const { error: updateError } = await supabase
        .from('content_requests')
        .update({
          status: 'in_progress',
          claimed_by: userId,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      onClaimSuccess?.()
    } catch (err) {
      setError('Failed to claim request')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAbandon = async () => {
    if (!existingClaim) return

    setIsLoading(true)
    setError(null)

    try {
      // Update claim status
      const { error: claimError } = await supabase
        .from('request_claims')
        .update({ status: 'abandoned' })
        .eq('id', existingClaim.id)

      if (claimError) {
        setError(claimError.message)
        return
      }

      // Check if there are other active claims
      const { data: otherClaims } = await supabase
        .from('request_claims')
        .select('id')
        .eq('request_id', request.id)
        .eq('status', 'active')
        .neq('id', existingClaim.id)

      // If no other claims, set request back to open
      if (!otherClaims || otherClaims.length === 0) {
        await supabase
          .from('content_requests')
          .update({
            status: 'open',
            claimed_by: null,
            claimed_at: null,
          })
          .eq('id', request.id)
      }

      onAbandonSuccess?.()
    } catch (err) {
      setError('Failed to abandon claim')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Not signed in
  if (!userId) {
    return (
      <a
        href="/login"
        className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
      >
        Sign in to Claim
      </a>
    )
  }

  // Own request
  if (isOwnRequest) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed"
      >
        Your Request
      </button>
    )
  }

  // Already fulfilled or closed
  if (request.status === 'fulfilled' || request.status === 'closed') {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed"
      >
        {request.status === 'fulfilled' ? 'Fulfilled' : 'Closed'}
      </button>
    )
  }

  // User has active claim
  if (hasActiveClaim && !isClaimExpired) {
    const expiresAt = new Date(existingClaim!.expires_at)
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            You claimed this! {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expires today'}
          </span>
        </div>
        <button
          onClick={handleAbandon}
          disabled={isLoading}
          className="inline-flex items-center justify-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors text-sm w-full"
        >
          {isLoading ? 'Abandoning...' : 'Abandon Claim'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Claim expired
  if (hasActiveClaim && isClaimExpired) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Your claim has expired</span>
        </div>
        <button
          onClick={handleClaim}
          disabled={isLoading}
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors w-full"
        >
          {isLoading ? 'Claiming...' : 'Claim Again'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Can claim
  if (isClaimable) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleClaim}
          disabled={isLoading}
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors w-full"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Claiming...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Claim This Request
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 text-center">
          You&apos;ll have 7 days to complete this request
        </p>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  // Request in progress (someone else claimed)
  return (
    <button
      disabled
      className="inline-flex items-center justify-center px-6 py-3 bg-yellow-100 text-yellow-700 font-medium rounded-lg cursor-not-allowed"
    >
      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
      Being Worked On
    </button>
  )
}
