#!/usr/bin/env node
/**
 * Reddit Importer
 *
 * Imports pizza content from popular subreddits.
 * Uses Reddit's public JSON API (no auth required for read-only).
 *
 * IMPORTANT: This script validates URLs before importing to prevent broken images.
 * Reddit images (i.redd.it, preview.redd.it) are often deleted but URLs remain,
 * showing "If you are looking at this image, it was probably deleted".
 *
 * Validation includes:
 * - HEAD request to verify URL returns 200
 * - Content-Type check (must be image/* or video/*)
 * - File size check (small files are often placeholder images)
 * - Filtering out self-posts, galleries, videos, and crossposts
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-reddit.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-reddit.mjs --subreddit pizza
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-reddit.mjs --limit 50 --sort top --time week
 */

import { ContentImporter, detectContentType } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// URL validation timeout (ms)
const URL_VALIDATION_TIMEOUT = 5000

/**
 * Validates that a URL is accessible by performing a HEAD request.
 * Returns true if the URL returns a 200 status with valid content type.
 * Reddit URLs are notoriously unreliable - images get deleted but URLs remain.
 */
async function validateImageUrl(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PizzaContentBot/1.0 (image validation)'
      }
    })

    clearTimeout(timeoutId)

    // Check for successful response
    if (!response.ok) {
      console.log(`  [Skip] URL returned ${response.status}: ${url.slice(0, 80)}...`)
      return false
    }

    // Check content type is an image/video
    const contentType = response.headers.get('content-type') || ''
    const validTypes = ['image/', 'video/']
    const isValidType = validTypes.some(t => contentType.startsWith(t))

    if (!isValidType) {
      console.log(`  [Skip] Invalid content-type "${contentType}": ${url.slice(0, 80)}...`)
      return false
    }

    // Check for Reddit's "deleted image" placeholder (small file size)
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > 0 && contentLength < 1000) {
      console.log(`  [Skip] Suspiciously small file (${contentLength} bytes): ${url.slice(0, 80)}...`)
      return false
    }

    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`  [Skip] URL validation timeout: ${url.slice(0, 80)}...`)
    } else {
      console.log(`  [Skip] URL validation failed: ${error.message}`)
    }
    return false
  }
}

/**
 * Check if a Reddit post has valid, direct media.
 * Filters out self-posts, text posts, and posts without direct image/video URLs.
 */
function hasDirectMedia(post) {
  const data = post.data

  // Skip self-posts (text-only)
  if (data.is_self) {
    return false
  }

  // Skip removed/deleted posts
  if (data.removed || data.removed_by_category) {
    return false
  }

  // Must have a URL
  if (!data.url) {
    return false
  }

  const url = data.url.toLowerCase()

  // Skip Reddit video (complex to extract, often breaks)
  if (url.includes('v.redd.it')) {
    return false
  }

  // Skip gallery posts (multiple images, complex)
  if (url.includes('/gallery/') || data.is_gallery) {
    return false
  }

  // Skip crosspost references
  if (data.crosspost_parent_list?.length > 0) {
    return false
  }

  // Must be a direct image link or from known image hosts
  const isDirectImage = url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/)
  const isImageHost = url.includes('i.redd.it') ||
                      url.includes('i.imgur.com') ||
                      url.includes('media.giphy.com')

  return isDirectImage || isImageHost
}

// Default configuration
const DEFAULT_SUBREDDITS = ['pizza', 'pizzacrimes', 'FoodPorn', 'CasualUK']
const DEFAULT_LIMIT = 25
const DEFAULT_SORT = 'hot' // 'hot', 'new', 'top', 'rising'
const DEFAULT_TIME = 'week' // 'hour', 'day', 'week', 'month', 'year', 'all'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    subreddits: [...DEFAULT_SUBREDDITS],
    limit: DEFAULT_LIMIT,
    sort: DEFAULT_SORT,
    time: DEFAULT_TIME,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--subreddit':
      case '-s':
        config.subreddits = [args[++i]]
        break
      case '--subreddits':
        config.subreddits = args[++i].split(',')
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--sort':
        config.sort = args[++i]
        break
      case '--time':
      case '-t':
        config.time = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Reddit Pizza Importer

Usage:
  node scripts/import-reddit.mjs [options]

Options:
  --subreddit, -s <name>  Import from a single subreddit
  --subreddits <a,b,c>    Import from multiple subreddits (comma-separated)
  --limit, -l <n>         Number of posts to fetch per subreddit (default: ${DEFAULT_LIMIT})
  --sort <type>           Sort order: hot, new, top, rising (default: ${DEFAULT_SORT})
  --time, -t <period>     Time period for top/controversial: hour, day, week, month, year, all (default: ${DEFAULT_TIME})
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-reddit.mjs
  node scripts/import-reddit.mjs --subreddit pizza --sort top --time month
  node scripts/import-reddit.mjs --limit 50 --dry-run
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch posts from a subreddit
async function fetchSubreddit(subreddit, { sort, time, limit }) {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}&t=${time}`

  console.log(`[Reddit] Fetching r/${subreddit}...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PizzaContentBot/1.0 (pizza content importer)'
    }
  })

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data?.data?.children || []
}

// Filter and transform Reddit posts
function transformPost(post, subreddit) {
  const data = post.data

  // Skip NSFW content
  if (data.over_18) {
    return null
  }

  // Use the new hasDirectMedia check for better filtering
  if (!hasDirectMedia(post)) {
    return null
  }

  // Get media URL
  let mediaUrl = null
  let thumbnailUrl = null
  let contentType = 'meme'

  // Check for direct image/gif links
  if (data.url) {
    const url = data.url.replace(/&amp;/g, '&')

    if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      mediaUrl = url
      contentType = url.toLowerCase().includes('.gif') ? 'gif' : 'meme'
    } else if (url.includes('i.redd.it') || url.includes('i.imgur.com')) {
      mediaUrl = url
      contentType = url.toLowerCase().includes('.gif') ? 'gif' : 'meme'
    } else if (url.includes('v.redd.it')) {
      // Reddit video - skip for now (complex to extract)
      return null
    } else if (url.includes('imgur.com') && !url.includes('/a/') && !url.includes('/gallery/')) {
      // Single imgur image
      mediaUrl = url.replace('imgur.com', 'i.imgur.com')
      if (!mediaUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
        mediaUrl += '.jpg'
      }
    } else if (url.includes('giphy.com')) {
      // GIPHY link
      const giphyId = url.match(/giphy\.com\/gifs\/(?:[^-]+-)*([a-zA-Z0-9]+)/)?.[1] ||
                      url.match(/media\.giphy\.com\/media\/([^/]+)/)?.[1]
      if (giphyId) {
        mediaUrl = `https://media.giphy.com/media/${giphyId}/giphy.gif`
        contentType = 'gif'
      }
    }
  }

  // Check Reddit preview images
  if (!mediaUrl && data.preview?.images?.[0]) {
    const source = data.preview.images[0].source
    if (source?.url) {
      mediaUrl = source.url.replace(/&amp;/g, '&')
    }
  }

  // Get thumbnail
  if (data.thumbnail && data.thumbnail !== 'self' && data.thumbnail !== 'default' && data.thumbnail !== 'nsfw') {
    thumbnailUrl = data.thumbnail.replace(/&amp;/g, '&')
  }

  // Skip if no media URL found
  if (!mediaUrl) {
    return null
  }

  // Filter: must be pizza-related
  const text = `${data.title} ${subreddit}`.toLowerCase()
  const pizzaKeywords = ['pizza', 'pizzeria', 'slice', 'pepperoni', 'margherita', 'cheese', 'dough', 'pie']
  const hasPizzaContent = pizzaKeywords.some(kw => text.includes(kw)) ||
                          subreddit.toLowerCase().includes('pizza')

  if (!hasPizzaContent) {
    return null
  }

  return {
    type: contentType,
    title: data.title.slice(0, 200), // Limit title length
    url: mediaUrl,
    thumbnail_url: thumbnailUrl || mediaUrl,
    source_url: `https://reddit.com${data.permalink}`,
    source_platform: 'reddit',
    description: data.selftext?.slice(0, 500) || null,
    is_viral: data.score > 1000,
    // Additional metadata for tagging
    _score: data.score,
    _subreddit: subreddit
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  console.log('\n=== Reddit Pizza Importer ===\n')
  console.log(`Subreddits: ${config.subreddits.join(', ')}`)
  console.log(`Sort: ${config.sort}, Time: ${config.time}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const rateLimiter = new RateLimiter({ requestsPerMinute: 10 }) // Reddit rate limit

  for (const subreddit of config.subreddits) {
    console.log(`\n--- Importing r/${subreddit} ---\n`)

    const importer = new ContentImporter({
      platform: 'reddit',
      sourceIdentifier: subreddit,
      displayName: `r/${subreddit}`,
      rateLimiter,
      dryRun: config.dryRun
    })

    try {
      await importer.run(
        // Fetch function
        async () => {
          const posts = await fetchSubreddit(subreddit, config)
          return posts
        },
        // Transform function (async to support URL validation)
        async (post) => {
          const content = transformPost(post, subreddit)
          if (!content) return null

          // Validate the media URL is accessible before importing
          // This prevents importing deleted Reddit images
          console.log(`  [Validate] Checking URL: ${content.url.slice(0, 60)}...`)
          const isValid = await validateImageUrl(content.url)

          if (!isValid) {
            return null // Skip this post
          }

          console.log(`  [Valid] URL is accessible`)
          return content
        }
      )
    } catch (error) {
      console.error(`[Reddit] Error importing r/${subreddit}:`, error.message)
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
