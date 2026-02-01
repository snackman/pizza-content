import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const supabase = await createClient()

  const { data: videos, error } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'video')
    .in('status', ['approved', 'featured'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching videos:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="text-5xl">📱</span>
            <div>
              <h1 className="text-4xl font-bold">Viral Pizza Videos</h1>
              <p className="text-red-100 mt-1">
                {videos?.length || 0} trending pizza videos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!videos || videos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No videos found yet</p>
            <Link
              href="/submit"
              className="mt-4 inline-block text-orange-600 hover:text-orange-700 font-medium"
            >
              Be the first to submit one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: { id: string; title: string; url: string; thumbnail_url: string | null; source_platform: string | null; tags: string[] } }) {
  const isEmbedded = video.url.includes('youtube.com') || video.url.includes('youtu.be') || video.url.includes('tiktok.com')

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-video relative bg-gray-900 flex items-center justify-center">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-6xl">🎬</div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <span className="text-2xl ml-1">▶</span>
            </div>
          </div>
        </div>
      </a>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2" title={video.title}>
          {video.title}
        </h3>
        {video.source_platform && (
          <p className="text-sm text-gray-500 mt-1">
            From {video.source_platform}
          </p>
        )}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
