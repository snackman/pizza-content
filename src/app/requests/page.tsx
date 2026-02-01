'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRequests } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { RequestCard, RequestFilters, RequestFiltersState } from '@/components/requests'

export default function RequestsPage() {
  const { isAuthenticated } = useAuth()
  const [filters, setFilters] = useState<RequestFiltersState>({
    status: 'all',
    type: 'all',
    minBounty: 0,
    maxBounty: null,
    sortBy: 'newest',
  })

  const { requests, isLoading, error } = useRequests({
    status: filters.status,
    type: filters.type,
    minBounty: filters.minBounty,
    maxBounty: filters.maxBounty,
    sortBy: filters.sortBy,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">Content Requests</h1>
              <p className="text-orange-100 mt-2">
                Find pizza content bounties or post your own request
              </p>
            </div>
            {isAuthenticated ? (
              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Request
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-lg"
              >
                Sign In to Create Request
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RequestFilters filters={filters} onChange={setFilters} />

        <p className="mt-4 text-sm text-gray-500">
          {requests.length} request{requests.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading requests...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">Failed to load requests</p>
            <p className="text-gray-500 text-sm mt-1">{error.message}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg">No requests found</p>
            <p className="text-gray-500 mt-1">
              {filters.status !== 'all' || filters.type !== 'all'
                ? 'Try adjusting your filters'
                : 'Be the first to post a content request!'}
            </p>
            {isAuthenticated && (
              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create First Request
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
