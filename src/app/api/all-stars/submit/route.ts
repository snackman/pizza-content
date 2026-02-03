import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, instagramUrl, youtubeUrl, tiktokUrl, websiteUrl } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user (optional - submissions can be anonymous)
    const { data: { user } } = await supabase.auth.getUser()

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    const insertData = {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      instagram_url: instagramUrl?.trim() || null,
      youtube_url: youtubeUrl?.trim() || null,
      tiktok_url: tiktokUrl?.trim() || null,
      website_url: websiteUrl?.trim() || null,
      status: 'pending',
      submitted_by: user?.id || null,
      upvotes: 0,
      downvotes: 0,
    }

    // Cast to any since TypeScript types may not include this table yet
    const { data, error } = await supabase
      .from('pizza_all_stars' as any)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error submitting all star:', error)

      // Check for duplicate slug
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An all star with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to submit all star' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All star submitted for review',
      data,
    })
  } catch (error) {
    console.error('Submit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
