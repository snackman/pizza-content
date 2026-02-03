import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { contentId, vote } = await request.json()

    if (!contentId || !vote || !['up', 'down'].includes(vote)) {
      return NextResponse.json(
        { error: 'Invalid request. contentId and vote (up/down) required.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current counts
    const { data: content, error: fetchError } = await supabase
      .from('content')
      .select('upvotes, downvotes')
      .eq('id', contentId)
      .single()

    if (fetchError || !content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Increment the appropriate column
    const currentUpvotes = content.upvotes ?? 0
    const currentDownvotes = content.downvotes ?? 0

    const updateData = vote === 'up'
      ? { upvotes: currentUpvotes + 1 }
      : { downvotes: currentDownvotes + 1 }

    const { data: updated, error: updateError } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', contentId)
      .select('upvotes, downvotes')
      .single()

    if (updateError) {
      console.error('Error updating vote:', updateError)
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      upvotes: updated.upvotes ?? 0,
      downvotes: updated.downvotes ?? 0,
    })
  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
