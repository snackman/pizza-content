import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { allStarId, vote } = await request.json()

    if (!allStarId || !vote || !['up', 'down'].includes(vote)) {
      return NextResponse.json(
        { error: 'Invalid request. allStarId and vote (up/down) required.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use the vote_all_star RPC function
    const { data, error } = await supabase
      .rpc('vote_all_star', {
        p_all_star_id: allStarId,
        p_vote_type: vote,
      })
      .single()

    if (error) {
      console.error('Error recording vote:', error)
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      upvotes: data?.upvotes ?? 0,
      downvotes: data?.downvotes ?? 0,
    })
  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
