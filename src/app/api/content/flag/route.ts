import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { contentId, reason } = await request.json()

    if (!contentId || !reason) {
      return NextResponse.json(
        { error: 'Missing contentId or reason' },
        { status: 400 }
      )
    }

    if (!['not_pizza', 'broken'].includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason. Must be "not_pizza" or "broken"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const status = reason === 'not_pizza' ? 'flagged_not_pizza' : 'flagged_broken'

    const { error } = await supabase
      .from('content')
      .update({ status })
      .eq('id', contentId)

    if (error) {
      console.error('Error flagging content:', error)
      return NextResponse.json(
        { error: 'Failed to flag content' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Error in flag API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
