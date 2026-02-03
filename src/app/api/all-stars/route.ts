import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Cast to any since TypeScript types may not include this table yet
    const { data, error } = await supabase
      .from('pizza_all_stars' as any)
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
