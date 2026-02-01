import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/music
 * Returns all music tracks with optional filters
 *
 * Query params:
 * - limit: number (default: 50, max: 1000)
 * - offset: number (default: 0)
 * - shuffle: boolean (default: false)
 *
 * Response:
 * {
 *   tracks: Content[],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const limit = Math.min(
    parseInt(searchParams.get('limit') || '50', 10),
    1000
  )
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const shuffle = searchParams.get('shuffle') === 'true'

  try {
    const supabase = await createClient()

    // Get total count
    const { count, error: countError } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'music')
      .in('status', ['approved', 'featured'])

    if (countError) {
      console.error('Error counting music:', countError)
      return NextResponse.json(
        { error: 'Failed to fetch music count' },
        { status: 500 }
      )
    }

    // Fetch tracks
    let query = supabase
      .from('content')
      .select('*')
      .eq('type', 'music')
      .in('status', ['approved', 'featured'])

    if (shuffle) {
      // Random order using Supabase's random() function
      // This is a workaround since Supabase doesn't have native shuffle
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: tracks, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching music:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch music' },
        { status: 500 }
      )
    }

    // Shuffle in JS if requested
    let resultTracks = tracks || []
    if (shuffle && resultTracks.length > 0) {
      resultTracks = shuffleArray(resultTracks)
    }

    return NextResponse.json({
      tracks: resultTracks,
      total: count || 0,
    })
  } catch (error) {
    console.error('Music API error:', error)
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
