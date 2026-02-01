import { NextRequest, NextResponse } from 'next/server'
import { getFileStream, getFileMetadata } from '@/lib/google-drive'
import { Readable } from 'stream'

/**
 * GET /api/music/gdrive/[fileId]
 *
 * Streams audio content from Google Drive
 * Acts as a proxy to serve Google Drive files with proper headers
 *
 * Supports:
 * - Full file streaming
 * - Proper MIME type detection
 * - Caching headers for performance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file metadata first
    const metadata = await getFileMetadata(fileId)

    // Get the file stream from Google Drive
    const nodeStream = await getFileStream(fileId)

    // Convert Node.js Readable stream to Web ReadableStream
    const webStream = nodeReadableToWebReadable(nodeStream as Readable)

    // Create response with appropriate headers
    const headers = new Headers({
      'Content-Type': metadata.mimeType,
      'Content-Length': metadata.size.toString(),
      'Accept-Ranges': 'bytes',
      // Cache for 1 day in browser, 1 week on CDN
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      // Allow CORS for audio element playback
      'Access-Control-Allow-Origin': '*',
      // Set filename for downloads
      'Content-Disposition': `inline; filename="${encodeURIComponent(metadata.name)}"`,
    })

    return new Response(webStream, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Google Drive stream error:', error)

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_SERVICE_ACCOUNT_JSON')) {
        return NextResponse.json(
          { error: 'Google Drive not configured' },
          { status: 503 }
        )
      }

      if (
        error.message.includes('not found') ||
        error.message.includes('404')
      ) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      if (
        error.message.includes('permission') ||
        error.message.includes('403')
      ) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to stream file' },
      { status: 500 }
    )
  }
}

/**
 * Convert a Node.js Readable stream to a Web ReadableStream
 */
function nodeReadableToWebReadable(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })

      nodeStream.on('end', () => {
        controller.close()
      })

      nodeStream.on('error', (err: Error) => {
        controller.error(err)
      })
    },

    cancel() {
      nodeStream.destroy()
    },
  })
}
