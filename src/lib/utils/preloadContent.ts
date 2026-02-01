import { Content } from '@/types/database'

/**
 * Preloads content for smooth transitions in the live stream player.
 * Handles images, GIFs, and videos.
 */
export async function preloadContent(content: Content): Promise<void> {
  return new Promise((resolve, reject) => {
    if (content.type === 'video') {
      preloadVideo(content.url)
        .then(resolve)
        .catch(reject)
    } else {
      preloadImage(content.url)
        .then(resolve)
        .catch(reject)
    }
  })
}

/**
 * Preloads an image or GIF
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = (error) => reject(error)
    img.src = url
  })
}

/**
 * Preloads a video (just enough to start playing)
 */
export function preloadVideo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'

    video.onloadeddata = () => {
      resolve()
    }

    video.onerror = (error) => {
      reject(error)
    }

    video.src = url
    video.load()
  })
}

/**
 * Preloads multiple content items
 */
export async function preloadMultiple(items: Content[]): Promise<void[]> {
  return Promise.all(items.map((item) => preloadContent(item)))
}

/**
 * Creates a preload manager that tracks preloaded URLs
 */
export function createPreloadManager() {
  const preloadedUrls = new Set<string>()

  return {
    isPreloaded(url: string): boolean {
      return preloadedUrls.has(url)
    },

    async preload(content: Content): Promise<void> {
      if (preloadedUrls.has(content.url)) {
        return
      }

      await preloadContent(content)
      preloadedUrls.add(content.url)
    },

    async preloadMultiple(items: Content[]): Promise<void> {
      const unpreloaded = items.filter((item) => !preloadedUrls.has(item.url))
      await Promise.all(unpreloaded.map((item) => this.preload(item)))
    },

    clear(): void {
      preloadedUrls.clear()
    },

    getPreloadedCount(): number {
      return preloadedUrls.size
    },
  }
}
