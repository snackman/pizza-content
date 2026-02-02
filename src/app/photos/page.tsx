import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ContentCard } from '@/components/content/ContentCard'
import { Content } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function PhotosPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'photo')
    .in('status', ['approved', 'featured'])
    .order('created_at', { ascending: false })

  const photos = (data || []) as Content[]

  if (error) {
    console.error('Error fetching photos:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="text-5xl">📸</span>
            <div>
              <h1 className="text-4xl font-bold">Pizza Photos</h1>
              <p className="text-blue-100 mt-1">
                {photos?.length || 0} beautiful pizza shots
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!photos || photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No photos found yet</p>
            <Link
              href="/submit"
              className="mt-4 inline-block text-orange-600 hover:text-orange-700 font-medium"
            >
              Be the first to submit one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <ContentCard key={photo.id} item={photo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
