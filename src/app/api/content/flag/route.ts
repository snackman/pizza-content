import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json()

    if (!contentId) {
      return NextResponse.json(
        { error: 'Missing contentId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use flag_content RPC function to bypass RLS
    const { error } = await supabase
      .rpc('flag_content', {
        p_content_id: contentId,
      })

    if (error) {
      console.error('Error flagging content:', error)
      return NextResponse.json(
        { error: 'Failed to flag content' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Flagged for review' })
  } catch (error) {
    console.error('Error in flag API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
