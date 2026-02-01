#!/usr/bin/env node
/**
 * Imgur Importer
 *
 * Imports pizza images and GIFs from Imgur.
 * Uses Imgur's API v3 (requires client ID).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx IMGUR_CLIENT_ID=xxx node scripts/import-imgur.mjs
 *   SUPABASE_SERVICE_KEY=xxx IMGUR_CLIENT_ID=xxx node scripts/import-imgur.mjs --query "pizza"
 *   SUPABASE_SERVICE_KEY=xxx IMGUR_CLIENT_ID=xxx node scripts/import-imgur.mjs --gallery hot
 */

import { ContentImporter, detectContentType } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 50
const API_BASE = 'https://api.imgur.com/3'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    gallery: null, // 'hot', 'top', 'user'
    sort: 'viral', // 'viral', 'top', 'time', 'rising'
    window: 'week', // 'day', 'week', 'month', 'year', 'all'
    page: 0,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
      case '-q':
        config.query = args[++i]
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--gallery':
      case '-g':
        config.gallery = args[++i]
        break
      case '--sort':
      case '-s':
        config.sort = args[++i]
        break
      case '--window':
      case '-w':
        config.window = args[++i]
        break
      case '--page':
      case '-p':
        config.page = parseInt(args[++i], 10)
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Imgur Pizza Importer

Usage:
  node scripts/import-imgur.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>         Number of images to fetch (default: ${DEFAULT_LIMIT})
  --gallery, -g <type>    Fetch from gallery: hot, top, user (instead of search)
  --sort, -s <type>       Sort: viral, top, time, rising (default: viral)
  --window, -w <period>   Time window: day, week, month, year, all (default: week)
  --page, -p <n>          Page number for pagination (default: 0)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  IMGUR_CLIENT_ID         Required. Get one at https://api.imgur.com/oauth2/addclient
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-imgur.mjs
  node scripts/import-imgur.mjs --query "pizza meme" --sort top
  node scripts/import-imgur.mjs --gallery hot --window day
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch images from Imgur
async function fetchImgur(clientId, config) {
  let url

  if (config.gallery) {
    // Fetch from gallery
    url = `${API_BASE}/gallery/${config.gallery}/${config.sort}/${config.window}/${config.page}`
    console.log(`[Imgur] Fetching ${config.gallery} gallery (${config.sort}, ${config.window})...`)
  } else {
    // Search
    const params = new URLSearchParams({
      q: config.query,
      q_type: 'jpg,png,gif,anigif',
      sort: config.sort,
      window: config.window
    })
    url = `${API_BASE}/gallery/search/${config.sort}/${config.window}/${config.page}?${params}`
    console.log(`[Imgur] Searching for "${config.query}"...`)
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Client-ID ${clientId}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Imgur API error: ${response.status} - ${error.data?.error || 'Unknown error'}`)
  }

  const data = await response.json()
  let items = data.data || []

  // Flatten albums into individual images
  const flattenedItems = []
  for (const item of items) {
    if (item.is_album && item.images) {
      // Add each image from the album
      for (const img of item.images) {
        flattenedItems.push({
          ...img,
          _albumTitle: item.title,
          _albumLink: item.link
        })
      }
    } else if (!item.is_album && item.link) {
      flattenedItems.push(item)
    }
  }

  // Filter to pizza-related if from gallery (not search)
  if (config.gallery) {
    const pizzaKeywords = ['pizza', 'pizzeria', 'slice', 'pepperoni', 'margherita', 'cheese', 'pie']
    return flattenedItems.filter(item => {
      const text = `${item.title || ''} ${item.description || ''} ${item._albumTitle || ''}`.toLowerCase()
      return pizzaKeywords.some(kw => text.includes(kw))
    })
  }

  return flattenedItems.slice(0, config.limit)
}

// Transform Imgur response to content format
function transformImage(image) {
  if (!image.link) {
    return null
  }

  // Skip videos (we want images/GIFs)
  if (image.type?.startsWith('video/')) {
    return null
  }

  const isGif = image.animated || image.type === 'image/gif' || image.link.endsWith('.gif')

  // Get title
  let title = image.title || image._albumTitle || ''
  if (!title) {
    title = isGif ? 'Pizza GIF' : 'Pizza Image'
  }

  // Clean up title
  title = title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  // Get description
  let description = image.description || ''
  description = description.slice(0, 500)

  // Determine if viral based on views/points
  const isViral = (image.views > 100000) || (image.points > 1000)

  return {
    type: isGif ? 'gif' : 'meme',
    title: title.slice(0, 200),
    url: image.link,
    thumbnail_url: image.link.replace(/\.(gif|png|jpg|jpeg)$/i, 't.$1'), // Thumbnail version
    source_url: `https://imgur.com/${image.id}`,
    source_platform: 'imgur',
    description: description || null,
    is_viral: isViral,
    // Metadata for tagging
    _views: image.views,
    _points: image.points
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const clientId = process.env.IMGUR_CLIENT_ID
  if (!clientId) {
    console.error('Error: IMGUR_CLIENT_ID environment variable is required')
    console.error('Register an application at: https://api.imgur.com/oauth2/addclient')
    process.exit(1)
  }

  console.log('\n=== Imgur Pizza Importer ===\n')
  console.log(`Mode: ${config.gallery ? `Gallery (${config.gallery})` : `Search "${config.query}"`}`)
  console.log(`Sort: ${config.sort}, Window: ${config.window}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = config.gallery || config.query.replace(/\s+/g, '-').toLowerCase()

  const importer = new ContentImporter({
    platform: 'imgur',
    sourceIdentifier: sourceId,
    displayName: config.gallery ? `Imgur ${config.gallery}` : `Imgur: ${config.query}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 60 }), // Imgur has generous limits
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => fetchImgur(clientId, config),
      // Transform function
      transformImage
    )
  } catch (error) {
    console.error('[Imgur] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
