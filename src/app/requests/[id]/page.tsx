'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRequest, useUserClaim } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { BountyBadge, StatusBadge, ClaimButton } from '@/components/requests'

interface RequestDetailPageProps {
  params: Promise<{ id: string }>
}

const typeLabels: Record<string, string> = {
  gif: 'GIF',
  meme: 'Meme',
  video: 'Video',
  music: 'Music',
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  const resolvedParams = use(params)
  const { user } = useAuth()
  const { request, claims, isLoading, error, refetch } = useRequest(resolvedParams.id)
  const { claim: userClaim } = useUserClaim(resolvedParams.id, user?.id || null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading request...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Request Not Found</h2>
          <p className="text-gray-500 mt-2">
            This request may have been deleted or doesn&apos;t exist.
          </p>
          <Link
            href="/requests"
            className="inline-block mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Browse Requests
          </Link>
        </div>
      </div>
    )
  }

  const deadline = request.deadline ? new Date(request.deadline) : null
  const isExpired = deadline && deadline < new Date()
  const daysUntilDeadline = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const activeClaims = claims.filter((c) => c.status === 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/requests"
            className="inline-flex items-center gap-1 text-orange-100 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Requests
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <StatusBadge status={request.status || 'open'} size="lg" />
            {request.type && (
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                {typeLabels[request.type] || request.type}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold">{request.title}</h1>

          {/* Requester */}
          {request.requester && (
            <div className="flex items-center gap-2 mt-4 text-orange-100">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                {request.requester.display_name?.[0]?.toUpperCase() || '?'}
              </span>
              <span>
                Requested by{' '}
                <span className="text-white font-medium">
                  {request.requester.display_name || 'Anonymous'}
                </span>
              </span>
              <span className="text-orange-200">
                on {request.created_at ? new Date(request.created_at).toLocaleDateString() : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>

              {/* Tags */}
              {request.tags && request.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100">
                  {request.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active Claims */}
            {activeClaims.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Claims ({activeClaims.length})
                </h2>
                <div className="space-y-3">
                  {activeClaims.map((claim) => {
                    const expiresAt = claim.expires_at ? new Date(claim.expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    const daysLeft = Math.ceil(
                      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                    const isClaimExpired = expiresAt < new Date()

                    return (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                            {claim.user?.display_name?.[0]?.toUpperCase() || '?'}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {claim.user?.display_name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Claimed {claim.claimed_at ? new Date(claim.claimed_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm ${
                            isClaimExpired
                              ? 'text-red-500'
                              : daysLeft <= 2
                              ? 'text-orange-500'
                              : 'text-gray-500'
                          }`}
                        >
                          {isClaimExpired
                            ? 'Expired'
                            : daysLeft === 0
                            ? 'Expires today'
                            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bounty Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">Bounty</p>
                <div className="flex justify-center">
                  <BountyBadge amount={request.bounty_amount || 0} size="lg" />
                </div>
              </div>

              {/* Deadline */}
              {deadline && (
                <div className="py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Deadline</p>
                  <p
                    className={`font-medium ${
                      isExpired
                        ? 'text-red-600'
                        : daysUntilDeadline !== null && daysUntilDeadline <= 3
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {deadline.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {!isExpired && daysUntilDeadline !== null && (
                    <p className="text-sm text-gray-500 mt-1">
                      {daysUntilDeadline === 0
                        ? 'Due today'
                        : daysUntilDeadline === 1
                        ? '1 day remaining'
                        : `${daysUntilDeadline} days remaining`}
                    </p>
                  )}
                  {isExpired && <p className="text-sm text-red-500 mt-1">Deadline passed</p>}
                </div>
              )}

              {/* Claim Button */}
              <div className="pt-4 border-t border-gray-100">
                <ClaimButton
                  request={request}
                  userId={user?.id || null}
                  existingClaim={userClaim}
                  onClaimSuccess={refetch}
                  onAbandonSuccess={refetch}
                />
              </div>
            </div>

            {/* Request Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Request Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <StatusBadge status={request.status || 'open'} size="sm" />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">
                    {request.created_at ? new Date(request.created_at).toLocaleDateString() : ''}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Active Claims</dt>
                  <dd className="text-gray-900">{activeClaims.length}</dd>
                </div>
                {request.type && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Content Type</dt>
                    <dd className="text-gray-900">{typeLabels[request.type] || request.type}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
