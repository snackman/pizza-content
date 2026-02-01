import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/music/random
 * Returns random track(s) for radio/livestream
 *
 * Query params:
 * - count: number (default: 1, max: 20)
 *
 * Response:
 * {
 *   tracks: Content[]
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const count = Math.min(
    parseInt(searchParams.get('count') || '1', 10),
    20
  )

  try {
    const supabase = await createClient()

    // Fetch all approved music tracks
    const { data: allTracks, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'music')
      .in('status', ['approved', 'featured'])

    if (fetchError) {
      console.error('Error fetching music:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch music' },
        { status: 500 }
      )
    }

    if (!allTracks || allTracks.length === 0) {
      return NextResponse.json({ tracks: [] })
    }

    // Shuffle and take requested count
    const shuffled = shuffleArray(allTracks)
    const randomTracks = shuffled.slice(0, count)

    return NextResponse.json({ tracks: randomTracks })
  } catch (error) {
    console.error('Random music API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
