import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Content } from '@/types/database'

/**
 * GET /api/music/stream
 * Returns a shuffled playlist for continuous playback
 *
 * Query params:
 * - duration: number (target duration in seconds, default: 3600 = 1 hour)
 *
 * Response:
 * {
 *   playlist: Content[],
 *   totalDuration: number
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetDuration = parseInt(
    searchParams.get('duration') || '3600',
    10
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
      return NextResponse.json({
        playlist: [],
        totalDuration: 0,
      })
    }

    // Cast to Content type
    const tracks = allTracks as Content[]

    // Build playlist to meet target duration
    const playlist: Content[] = []
    let totalDuration = 0
    let shuffled = shuffleArray(tracks)
    let shuffleIndex = 0

    // Keep adding tracks until we reach the target duration
    while (totalDuration < targetDuration) {
      // If we've used all tracks, reshuffle
      if (shuffleIndex >= shuffled.length) {
        shuffled = shuffleArray(tracks)
        shuffleIndex = 0
      }

      const track = shuffled[shuffleIndex]
      playlist.push(track)

      // Add track duration (default to 180 seconds / 3 min if unknown)
      totalDuration += track.duration_seconds || 180

      shuffleIndex++

      // Safety limit: max 500 tracks
      if (playlist.length >= 500) {
        break
      }
    }

    return NextResponse.json({
      playlist,
      totalDuration,
    })
  } catch (error) {
    console.error('Stream API error:', error)
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
