import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pizza_all_stars')
      .select('*')
      .eq('status', 'approved')
      .order('upvotes', { ascending: false })

    if (error) {
      console.error('Error fetching all stars:', error)
      return NextResponse.json(
        { error: 'Failed to fetch all stars' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('All Stars API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
