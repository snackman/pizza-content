'use client'

import { useAuth } from '@/hooks/useAuth'
import { SubmissionForm } from '@/components/submit/SubmissionForm'

export default function SubmitPage() {
  const { isLoading, isAuthenticated } = useAuth()

  // The middleware already handles redirect for unauthenticated users
  // But we show a loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold">Submit Content</h1>
            <p className="text-orange-100 mt-2">
              Share your favorite pizza GIFs, memes, and videos
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  // This shouldn't happen due to middleware, but just in case
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold">Submit Content</h1>
            <p className="text-orange-100 mt-2">
              Share your favorite pizza GIFs, memes, and videos
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <p className="text-gray-600">Please sign in to submit content.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Submit Content</h1>
          <p className="text-orange-100 mt-2">
            Share your favorite pizza GIFs, memes, and videos with the community
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SubmissionForm />
      </div>
    </div>
  )
}
