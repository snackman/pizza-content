'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { PizzeriaBadge } from '@/components/ui/PizzeriaBadge'
import { Content } from '@/types/database'

export default function AccountPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { favorites } = useFavorites()
  const [submissions, setSubmissions] = useState<Content[]>([])
  const [totalViews, setTotalViews] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        // Fetch user's submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('content')
          .select('*')
          .eq('submitted_by', user.id)
          .order('created_at', { ascending: false })

        if (submissionsError) {
          console.error('Error fetching submissions:', submissionsError)
        } else {
          const contentData = (submissionsData || []) as Content[]
          setSubmissions(contentData)
          // Calculate total views
          const views = contentData.reduce((acc, item) => acc + (item.view_count || 0), 0)
          setTotalViews(views)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchStats()
    }
  }, [user, authLoading, supabase])

  if (authLoading || isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-3xl">
              {profile?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.display_name || 'Welcome!'}
              </h1>
              {profile?.username && (
                <p className="text-gray-500">@{profile.username}</p>
              )}
              {profile?.is_pizzeria && (
                <div className="mt-2">
                  <PizzeriaBadge isVerified={profile.is_verified} />
                </div>
              )}
              {profile?.bio && (
                <p className="text-gray-600 mt-2 max-w-md">{profile.bio}</p>
              )}
            </div>
          </div>
          <Link
            href="/account/edit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {/* Pizzeria Info */}
        {profile?.is_pizzeria && profile?.business_name && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-2">{profile.business_name}</h3>
            <div className="text-sm text-gray-500 space-y-1">
              {profile.business_address && (
                <p>{profile.business_address}</p>
              )}
              {(profile.city || profile.state) && (
                <p>
                  {[profile.city, profile.state, profile.postal_code].filter(Boolean).join(', ')}
                </p>
              )}
              {profile.phone && <p>{profile.phone}</p>}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline"
                >
                  {profile.website_url}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Submissions"
          value={submissions.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        />
        <StatsCard
          title="Favorites"
          value={favorites.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Views"
          value={totalViews.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
          <Link
            href="/account/content"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            View all
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-500">You haven&apos;t submitted any content yet.</p>
            <Link
              href="/submit"
              className="mt-4 inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Submit Content
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {item.type === 'gif' && '🎞️'}
                      {item.type === 'meme' && '🖼️'}
                      {item.type === 'video' && '🎬'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${item.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                  ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${item.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                  ${item.status === 'featured' ? 'bg-purple-100 text-purple-800' : ''}
                `}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/account/favorites"
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-2xl mb-2">❤️</div>
          <p className="font-medium text-gray-900">Favorites</p>
        </Link>
        <Link
          href="/account/history"
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-2xl mb-2">🕐</div>
          <p className="font-medium text-gray-900">History</p>
        </Link>
        <Link
          href="/submit"
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-2xl mb-2">➕</div>
          <p className="font-medium text-gray-900">Submit</p>
        </Link>
        <Link
          href="/account/settings"
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <p className="font-medium text-gray-900">Settings</p>
        </Link>
      </div>
    </div>
  )
}
