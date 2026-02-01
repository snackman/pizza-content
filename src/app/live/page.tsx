'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LiveStreamPlayer } from '@/components/live'
import { LiveStreamSettings } from '@/hooks/useLiveStream'
import { ContentType } from '@/types/database'

function LiveStreamContent() {
  const searchParams = useSearchParams()

  // Parse URL parameters for embedding support
  const parseSettings = (): Partial<LiveStreamSettings> => {
    const settings: Partial<LiveStreamSettings> = {}

    // Content types: /live?types=gif,meme,video
    const typesParam = searchParams.get('types')
    if (typesParam) {
      const validTypes: ContentType[] = ['gif', 'meme', 'video']
      const types = typesParam
        .split(',')
        .map((t) => t.trim().toLowerCase() as ContentType)
        .filter((t) => validTypes.includes(t))

      if (types.length > 0) {
        settings.contentTypes = types
      }
    }

    // Interval: /live?interval=15
    const intervalParam = searchParams.get('interval')
    if (intervalParam) {
      const interval = parseInt(intervalParam)
      if (!isNaN(interval) && interval >= 5 && interval <= 60) {
        settings.intervalSeconds = interval
      }
    }

    // Shuffle: /live?shuffle=true
    const shuffleParam = searchParams.get('shuffle')
    if (shuffleParam !== null) {
      settings.shuffleEnabled = shuffleParam === 'true' || shuffleParam === '1'
    }

    // Music: /live?music=true
    const musicParam = searchParams.get('music')
    if (musicParam !== null) {
      settings.musicEnabled = musicParam === 'true' || musicParam === '1'
    }

    // Volume: /live?volume=50
    const volumeParam = searchParams.get('volume')
    if (volumeParam) {
      const volume = parseInt(volumeParam)
      if (!isNaN(volume) && volume >= 0 && volume <= 100) {
        settings.musicVolume = volume
      }
    }

    // Show info: /live?info=true
    const infoParam = searchParams.get('info')
    if (infoParam !== null) {
      settings.showInfo = infoParam === 'true' || infoParam === '1'
    }

    return settings
  }

  const initialSettings = parseSettings()

  return <LiveStreamPlayer initialSettings={initialSettings} />
}

export default function LiveStreamPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">&#127829;</div>
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      }
    >
      <LiveStreamContent />
    </Suspense>
  )
}
