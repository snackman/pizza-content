import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to vote.' }, { status: 401 })
    }

    const { contentId, vote } = await request.json()

    if (!contentId || !vote || !['up', 'down'].includes(vote)) {
      return NextResponse.json(
        { error: 'Invalid request. contentId and vote (up/down) required.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .rpc('vote_content' as any, {
        p_content_id: contentId,
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

    const result = data as { upvotes: number; downvotes: number; user_vote: string | null } | null
    return NextResponse.json({
      upvotes: result?.upvotes ?? 0,
      downvotes: result?.downvotes ?? 0,
      userVote: result?.user_vote ?? null,
    })
  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
