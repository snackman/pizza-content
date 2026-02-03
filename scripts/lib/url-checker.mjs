/**
 * URL Checker Utility
 *
 * Checks if URLs are still accessible with platform-specific handling.
 * Uses HEAD requests with GET fallback, respects timeouts.
 */

const DEFAULT_TIMEOUT = 10000 // 10 seconds
const USER_AGENT = 'Mozilla/5.0 (compatible; PizzaContentBot/1.0; +https://pizzadao.xyz)'

/**
 * Check if a URL is accessible
 * @param {string} url - The URL to check
 * @param {object} options - Options for the check
 * @returns {Promise<{ok: boolean, status: number, error?: string}>}
 */
export async function checkUrl(url, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const verbose = options.verbose || false

  if (!url) {
    return { ok: false, status: 0, error: 'No URL provided' }
  }

  try {
    // Handle platform-specific checks
    const platformResult = await checkPlatformSpecific(url, { timeout, verbose })
    if (platformResult !== null) {
      return platformResult
    }

    // Generic URL check - try HEAD first, then GET
    return await checkGenericUrl(url, { timeout, verbose })
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Platform-specific URL checking
 * Returns null if no special handling needed
 */
async function checkPlatformSpecific(url, options) {
  const { timeout, verbose } = options

  // YouTube video check via oEmbed
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    return await checkYouTube(url, { timeout, verbose })
  }

  // YouTube shorts
  if (url.includes('youtube.com/shorts/')) {
    return await checkYouTube(url, { timeout, verbose })
  }

  // Vimeo check via oEmbed
  if (url.includes('vimeo.com/')) {
    return await checkVimeo(url, { timeout, verbose })
  }

  // GIPHY - check via API endpoint
  if (url.includes('giphy.com') || url.includes('media.giphy.com')) {
    return await checkGiphy(url, { timeout, verbose })
  }

  // Tenor - these URLs are generally stable, do standard check
  if (url.includes('tenor.com') || url.includes('media.tenor.com')) {
    return null // Use standard check
  }

  // TikTok - often blocks bots, try oEmbed
  if (url.includes('tiktok.com')) {
    return await checkTikTok(url, { timeout, verbose })
  }

  // Imgur - check via API or standard
  if (url.includes('imgur.com') || url.includes('i.imgur.com')) {
    return await checkImgur(url, { timeout, verbose })
  }

  // No special handling needed
  return null
}

/**
 * Check YouTube video via oEmbed API
 */
async function checkYouTube(url, { timeout, verbose }) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(oembedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { ok: true, status: 200 }
    }

    // 401 or 403 means video exists but is private/restricted
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, error: 'Video is private or restricted' }
    }

    // 404 means video doesn't exist
    if (response.status === 404) {
      return { ok: false, status: 404, error: 'Video not found' }
    }

    return { ok: false, status: response.status, error: `YouTube oEmbed returned ${response.status}` }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, status: 0, error: 'Timeout' }
    }
    return { ok: false, status: 0, error: error.message }
  }
}

/**
 * Check Vimeo video via oEmbed API
 */
async function checkVimeo(url, { timeout, verbose }) {
  const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(oembedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { ok: true, status: 200 }
    }

    return { ok: false, status: response.status, error: `Vimeo returned ${response.status}` }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, status: 0, error: 'Timeout' }
    }
    return { ok: false, status: 0, error: error.message }
  }
}

/**
 * Check GIPHY URL - for media URLs, just do HEAD check
 */
async function checkGiphy(url, { timeout, verbose }) {
  // For media URLs (actual GIF files), do standard check
  if (url.includes('media.giphy.com') || url.includes('media0.giphy.com') ||
      url.includes('media1.giphy.com') || url.includes('media2.giphy.com') ||
      url.includes('media3.giphy.com') || url.includes('media4.giphy.com')) {
    return await checkGenericUrl(url, { timeout, verbose })
  }

  // For page URLs, try to extract ID and check via API
  // giphy.com/gifs/xxx-GIFID or giphy.com/gifs/GIFID
  const match = url.match(/giphy\.com\/gifs\/(?:[^\/]+-)?([a-zA-Z0-9]+)/)
  if (match) {
    // Just do a HEAD request on the page
    return await checkGenericUrl(url, { timeout, verbose })
  }

  return await checkGenericUrl(url, { timeout, verbose })
}

/**
 * Check TikTok via oEmbed
 */
async function checkTikTok(url, { timeout, verbose }) {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(oembedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { ok: true, status: 200 }
    }

    // TikTok returns 404 for deleted videos
    if (response.status === 404) {
      return { ok: false, status: 404, error: 'TikTok video not found' }
    }

    return { ok: false, status: response.status, error: `TikTok returned ${response.status}` }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, status: 0, error: 'Timeout' }
    }
    return { ok: false, status: 0, error: error.message }
  }
}

/**
 * Check Imgur URL
 */
async function checkImgur(url, { timeout, verbose }) {
  // For direct image URLs, do standard check
  if (url.includes('i.imgur.com')) {
    const result = await checkGenericUrl(url, { timeout, verbose })

    // Imgur returns 200 with a "removed" image for deleted content
    // The removed image is exactly 503 bytes, but this is fragile
    // Better to just trust the status code
    return result
  }

  // For page URLs, do standard check
  return await checkGenericUrl(url, { timeout, verbose })
}

/**
 * Generic URL check - HEAD with GET fallback
 */
async function checkGenericUrl(url, { timeout, verbose }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Try HEAD first (faster, less bandwidth)
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*'
      },
      redirect: 'follow'
    })

    // Some servers don't support HEAD, try GET
    if (response.status === 405 || response.status === 501) {
      if (verbose) {
        console.log(`  HEAD not supported for ${url}, trying GET...`)
      }
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*'
        },
        redirect: 'follow'
      })
    }

    clearTimeout(timeoutId)

    const ok = response.status >= 200 && response.status < 400
    return {
      ok,
      status: response.status,
      error: ok ? undefined : `HTTP ${response.status}`
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      return { ok: false, status: 0, error: 'Timeout' }
    }

    // Network errors
    if (error.cause?.code === 'ENOTFOUND') {
      return { ok: false, status: 0, error: 'DNS lookup failed' }
    }
    if (error.cause?.code === 'ECONNREFUSED') {
      return { ok: false, status: 0, error: 'Connection refused' }
    }
    if (error.cause?.code === 'ECONNRESET') {
      return { ok: false, status: 0, error: 'Connection reset' }
    }

    return { ok: false, status: 0, error: error.message || 'Unknown error' }
  }
}

/**
 * Check multiple URLs with concurrency limit
 * @param {Array<{id: string, url: string}>} items - Items to check
 * @param {object} options - Options
 * @returns {AsyncGenerator<{id: string, url: string, result: object}>}
 */
export async function* checkUrlsBatch(items, options = {}) {
  const concurrency = options.concurrency || 5
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const verbose = options.verbose || false

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    const results = await Promise.all(
      batch.map(async (item) => {
        const result = await checkUrl(item.url, { timeout, verbose })
        return { ...item, result }
      })
    )

    for (const result of results) {
      yield result
    }
  }
}

export default { checkUrl, checkUrlsBatch }
