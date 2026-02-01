import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Content } from '@/types/database'

/**
 * GET /api/radio
 * Server-Sent Events for synchronized radio experience
 *
 * This endpoint provides real-time sync for shared radio listening.
 * Clients can connect to receive updates about current track and timing.
 *
 * SSE Events:
 * - now_playing: { track: Content, startedAt: timestamp, position: seconds }
 * - next_track: { track: Content, startsAt: timestamp }
 *
 * Note: For a true shared radio experience, you'd need a central server
 * maintaining state. This simplified version sends the client a random track
 * and lets them manage playback locally.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient()

        // Fetch a random track to start
        const { data: tracks, error } = await supabase
          .from('content')
          .select('*')
          .eq('type', 'music')
          .in('status', ['approved', 'featured'])

        if (error || !tracks || tracks.length === 0) {
          const errorEvent = `event: error\ndata: ${JSON.stringify({ message: 'No music available' })}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
          controller.close()
          return
        }

        // Cast to Content type and shuffle
        const musicTracks = tracks as Content[]
        const shuffled = shuffleArray(musicTracks)
        const currentTrack = shuffled[0]
        const nextTrack = shuffled[1] || shuffled[0]

        // Send now_playing event
        const nowPlayingEvent = `event: now_playing\ndata: ${JSON.stringify({
          track: currentTrack,
          startedAt: Date.now(),
          position: 0,
        })}\n\n`
        controller.enqueue(encoder.encode(nowPlayingEvent))

        // Send next_track event
        const trackDuration = (currentTrack.duration_seconds || 180) * 1000
        const nextTrackEvent = `event: next_track\ndata: ${JSON.stringify({
          track: nextTrack,
          startsAt: Date.now() + trackDuration,
        })}\n\n`
        controller.enqueue(encoder.encode(nextTrackEvent))

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          const heartbeat = `:heartbeat\n\n`
          try {
            controller.enqueue(encoder.encode(heartbeat))
          } catch {
            clearInterval(heartbeatInterval)
          }
        }, 30000) // Every 30 seconds

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          controller.close()
        })
      } catch (err) {
        console.error('Radio SSE error:', err)
        const errorEvent = `event: error\ndata: ${JSON.stringify({ message: 'Server error' })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
