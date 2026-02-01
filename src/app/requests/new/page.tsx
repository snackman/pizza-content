'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { RequestForm } from '@/components/requests'
import Link from 'next/link'

export default function NewRequestPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/requests/new')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-3xl font-bold">Create Content Request</h1>
          <p className="text-orange-100 mt-2">
            Describe the pizza content you need and set a bounty
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <RequestForm userId={user.id} />
        </div>

        {/* Tips */}
        <div className="mt-8 bg-orange-50 border border-orange-100 rounded-xl p-6">
          <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Tips for a Great Request
          </h3>
          <ul className="space-y-2 text-sm text-orange-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">1.</span>
              <span>Be specific about what you need - style, format, dimensions, etc.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">2.</span>
              <span>Set a fair bounty to attract quality creators</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">3.</span>
              <span>Add relevant tags to help creators find your request</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">4.</span>
              <span>Set a reasonable deadline to give creators enough time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
