import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STORAGE_BUCKET = 'all-stars'
const PROJECT_ID = 'hecsxlqeviirichoohkl'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const allStarId = formData.get('allStarId') as string | null
    const slug = formData.get('slug') as string | null

    if (!file || !allStarId || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: file, allStarId, and slug are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Get file extension from MIME type
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    const ext = mimeToExt[file.type]
    const fileName = `${slug}.${ext}`

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if file already exists and delete it first
    const { data: existingFiles } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', {
        search: slug,
      })

    if (existingFiles && existingFiles.length > 0) {
      // Delete existing files for this slug (might have different extension)
      const filesToDelete = existingFiles
        .filter(f => f.name.startsWith(slug + '.'))
        .map(f => f.name)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filesToDelete)
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Construct the public URL
    const imageUrl = `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`

    // Update the pizza_all_stars record with the new image URL
    const { error: updateError } = await supabase
      .from('pizza_all_stars' as any)
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() } as any)
      .eq('id', allStarId)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Even if DB update fails, the file was uploaded successfully
      // Return partial success
      return NextResponse.json(
        {
          imageUrl,
          warning: 'File uploaded but database update failed. You may need to manually update the record.',
          dbError: updateError.message,
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
