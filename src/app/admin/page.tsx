'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlatformStats {
  platform: string
  count: number
  flagged_broken: number
  flagged_not_pizza: number
}

interface ContentTypeStats {
  type: string
  count: number
}

interface ApiConfig {
  name: string
  platform: string
  envVar: string
  docsUrl: string
  status: 'configured' | 'missing' | 'unknown'
}

const API_CONFIGS: Omit<ApiConfig, 'status'>[] = [
  { name: 'Giphy', platform: 'giphy', envVar: 'GIPHY_API_KEY', docsUrl: 'https://developers.giphy.com/' },
  { name: 'Pexels', platform: 'pexels', envVar: 'PEXELS_API_KEY', docsUrl: 'https://www.pexels.com/api/' },
  { name: 'Pixabay', platform: 'pixabay', envVar: 'PIXABAY_API_KEY', docsUrl: 'https://pixabay.com/api/docs/' },
  { name: 'Unsplash', platform: 'unsplash', envVar: 'UNSPLASH_ACCESS_KEY', docsUrl: 'https://unsplash.com/developers' },
  { name: 'YouTube', platform: 'youtube', envVar: 'YOUTUBE_API_KEY', docsUrl: 'https://developers.google.com/youtube/v3' },
  { name: 'DeviantArt', platform: 'deviantart', envVar: 'DEVIANTART_CLIENT_ID', docsUrl: 'https://www.deviantart.com/developers/' },
  { name: 'Tumblr', platform: 'tumblr', envVar: 'TUMBLR_API_KEY', docsUrl: 'https://www.tumblr.com/docs/en/api/v2' },
  { name: 'TikTok (RapidAPI)', platform: 'tiktok', envVar: 'RAPIDAPI_KEY', docsUrl: 'https://rapidapi.com/' },
  { name: 'Reddit', platform: 'reddit', envVar: 'REDDIT_CLIENT_ID', docsUrl: 'https://www.reddit.com/dev/api/' },
  { name: 'Imgur', platform: 'imgur', envVar: 'IMGUR_CLIENT_ID', docsUrl: 'https://apidocs.imgur.com/' },
  { name: 'Google Drive (Music)', platform: 'google-drive', envVar: 'GOOGLE_SERVICE_ACCOUNT_JSON', docsUrl: 'https://developers.google.com/drive' },
]

export default function AdminPage() {
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([])
  const [typeStats, setTypeStats] = useState<ContentTypeStats[]>([])
  const [totalContent, setTotalContent] = useState(0)
  const [totalFlagged, setTotalFlagged] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [recentImports, setRecentImports] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)

      // Fetch platform stats
      const { data } = await supabase
        .from('content')
        .select('source_platform, status')

      if (data) {
        const stats: Record<string, PlatformStats> = {}
        data.forEach(item => {
          const platform = item.source_platform || 'unknown'
          if (!stats[platform]) {
            stats[platform] = { platform, count: 0, flagged_broken: 0, flagged_not_pizza: 0 }
          }
          stats[platform].count++
          if (item.status === 'flagged_broken') stats[platform].flagged_broken++
          if (item.status === 'flagged_not_pizza') stats[platform].flagged_not_pizza++
        })
        setPlatformStats(Object.values(stats).sort((a, b) => b.count - a.count))
      }

      // Fetch type stats
      const { data: typeData } = await supabase
        .from('content')
        .select('type')

      if (typeData) {
        const stats: Record<string, number> = {}
        typeData.forEach(item => {
          stats[item.type] = (stats[item.type] || 0) + 1
        })
        setTypeStats(
          Object.entries(stats)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
        )
        setTotalContent(typeData.length)
      }

      // Fetch flagged count
      const { count: flaggedCount } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .in('status', ['flagged_broken', 'flagged_not_pizza'])

      setTotalFlagged(flaggedCount || 0)

      // Fetch recent imports
      const { data: imports } = await supabase
        .from('import_logs')
        .select('*, import_sources(platform, display_name)')
        .order('started_at', { ascending: false })
        .limit(10)

      setRecentImports(imports || [])

      setIsLoading(false)
    }

    fetchStats()
  }, [supabase])

  const getApiStatus = (platform: string): 'active' | 'inactive' | 'error' => {
    const stats = platformStats.find(s => s.platform === platform)
    if (!stats || stats.count === 0) return 'inactive'
    if (stats.flagged_broken > stats.count * 0.5) return 'error'
    return 'active'
  }

  const typeEmoji: Record<string, string> = {
    gif: '🎞️',
    photo: '📷',
    music: '🎵',
    video: '🎬',
    meme: '😂',
    art: '🎨',
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading admin stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-300 mt-1">Content sources and API status</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{totalContent}</div>
            <div className="text-gray-500 text-sm">Total Content</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-green-600">{totalContent - totalFlagged}</div>
            <div className="text-gray-500 text-sm">Visible Content</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-red-600">{totalFlagged}</div>
            <div className="text-gray-500 text-sm">Flagged Content</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{platformStats.length}</div>
            <div className="text-gray-500 text-sm">Active Sources</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Status */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">API Status</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {API_CONFIGS.map((api) => {
                const stats = platformStats.find(s => s.platform === api.platform)
                const status = getApiStatus(api.platform)
                return (
                  <div key={api.platform} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{api.name}</div>
                      <div className="text-sm text-gray-500">
                        {stats ? `${stats.count} items` : 'No content yet'}
                        {stats && stats.flagged_broken > 0 && (
                          <span className="text-red-500 ml-2">({stats.flagged_broken} broken)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={api.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Docs
                      </a>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'active' ? 'bg-green-100 text-green-700' :
                        status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {status === 'active' ? 'Active' : status === 'error' ? 'Issues' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Content by Type */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Content by Type</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {typeStats.map((stat) => (
                  <div key={stat.type} className="flex items-center gap-4">
                    <span className="text-2xl">{typeEmoji[stat.type] || '📄'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium capitalize">{stat.type}</span>
                        <span className="text-gray-500">{stat.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(stat.count / totalContent) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content by Platform */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Content by Platform</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {platformStats.map((stat) => (
                <div key={stat.platform} className="px-6 py-3 flex items-center justify-between">
                  <span className="font-medium">{stat.platform || 'unknown'}</span>
                  <div className="flex items-center gap-4">
                    {stat.flagged_broken > 0 && (
                      <span className="text-xs text-red-500">{stat.flagged_broken} broken</span>
                    )}
                    {stat.flagged_not_pizza > 0 && (
                      <span className="text-xs text-orange-500">{stat.flagged_not_pizza} not pizza</span>
                    )}
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-medium">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Imports */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Recent Imports</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {recentImports.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No import logs yet
                </div>
              ) : (
                recentImports.map((log) => (
                  <div key={log.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {log.import_sources?.display_name || log.import_sources?.platform || 'Unknown'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.status === 'completed' ? 'bg-green-100 text-green-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {log.items_imported || 0} imported, {log.items_skipped || 0} skipped
                      {log.started_at && (
                        <span className="ml-2">
                          {new Date(log.started_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Import Commands Reference */}
        <div className="mt-8 bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Import Commands</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 mb-4">Run these commands to import content from each source:</p>
            <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-100 overflow-x-auto">
              <div className="space-y-2">
                <div><span className="text-green-400"># GIFs</span></div>
                <div>npm run import-giphy</div>
                <div className="mt-3"><span className="text-green-400"># Photos</span></div>
                <div>npm run import-pexels</div>
                <div>npm run import-pixabay</div>
                <div>npm run import-unsplash</div>
                <div className="mt-3"><span className="text-green-400"># Videos</span></div>
                <div>npm run import-youtube</div>
                <div>npm run import-tiktok</div>
                <div className="mt-3"><span className="text-green-400"># Art & Memes</span></div>
                <div>npm run import-deviantart</div>
                <div>npm run import-tumblr</div>
                <div className="mt-3"><span className="text-green-400"># Music</span></div>
                <div>npm run sync-music</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
