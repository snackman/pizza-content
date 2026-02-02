#!/usr/bin/env node
/**
 * Pixabay Importer
 *
 * Imports pizza photos and videos from Pixabay.
 * All Pixabay content is free for commercial use (Pixabay License).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx PIXABAY_API_KEY=xxx node scripts/import-pixabay.mjs
 *   SUPABASE_SERVICE_KEY=xxx PIXABAY_API_KEY=xxx node scripts/import-pixabay.mjs --query "italian pizza"
 *   SUPABASE_SERVICE_KEY=xxx PIXABAY_API_KEY=xxx node scripts/import-pixabay.mjs --videos
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 50
const API_BASE = 'https://pixabay.com/api'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    videos: false, // false = photos, true = videos
    imageType: 'photo', // 'all', 'photo', 'illustration', 'vector'
    orientation: 'all', // 'all', 'horizontal', 'vertical'
    category: 'food', // food, backgrounds, etc.
    order: 'popular', // 'popular', 'latest'
    page: 1,
    safeSearch: true,
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
      case '--videos':
      case '-v':
        config.videos = true
        break
      case '--photos':
        config.videos = false
        break
      case '--image-type':
        config.imageType = args[++i]
        break
      case '--orientation':
      case '-o':
        config.orientation = args[++i]
        break
      case '--category':
      case '-c':
        config.category = args[++i]
        break
      case '--order':
        config.order = args[++i]
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
Pixabay Pizza Importer

Usage:
  node scripts/import-pixabay.mjs [options]

Options:
  --query, -q <term>        Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>           Number of items to fetch (default: ${DEFAULT_LIMIT}, max: 200)
  --videos, -v              Fetch videos instead of photos
  --photos                  Fetch photos (default)
  --image-type <type>       Image type: all, photo, illustration, vector (default: photo)
  --orientation, -o <type>  Orientation: all, horizontal, vertical (default: all)
  --category, -c <cat>      Category: food, backgrounds, etc. (default: food)
  --order <type>            Order by: popular, latest (default: popular)
  --page, -p <n>            Page number for pagination (default: 1)
  --dry-run                 Show what would be imported without saving
  --help, -h                Show this help message

Environment:
  PIXABAY_API_KEY           Required. Get one at https://pixabay.com/api/docs/
  SUPABASE_SERVICE_KEY      Required. Supabase service role key.

Examples:
  node scripts/import-pixabay.mjs
  node scripts/import-pixabay.mjs --query "italian pizza" --order popular
  node scripts/import-pixabay.mjs --videos --query "pizza making"
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch photos from Pixabay
async function fetchPixabayPhotos(apiKey, config) {
  const params = new URLSearchParams({
    key: apiKey,
    q: config.query,
    per_page: Math.min(config.limit, 200).toString(),
    page: config.page.toString(),
    image_type: config.imageType,
    orientation: config.orientation,
    category: config.category,
    order: config.order,
    safesearch: config.safeSearch.toString()
  })

  const url = `${API_BASE}/?${params}`
  console.log(`[Pixabay] Searching photos for "${config.query}"...`)

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pixabay API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log(`[Pixabay] Found ${data.totalHits} total photos`)

  return data.hits || []
}

// Fetch videos from Pixabay
async function fetchPixabayVideos(apiKey, config) {
  const params = new URLSearchParams({
    key: apiKey,
    q: config.query,
    per_page: Math.min(config.limit, 200).toString(),
    page: config.page.toString(),
    category: config.category,
    order: config.order,
    safesearch: config.safeSearch.toString()
  })

  const url = `${API_BASE}/videos/?${params}`
  console.log(`[Pixabay] Searching videos for "${config.query}"...`)

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pixabay API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log(`[Pixabay] Found ${data.totalHits} total videos`)

  return data.hits || []
}

// Transform Pixabay photo response
function transformPhoto(photo) {
  if (!photo.webformatURL) {
    return null
  }

  // Build title from tags
  let title = photo.tags || 'Pizza Photo'
  // Capitalize and clean up
  title = title.split(',')[0].trim()
  title = title.charAt(0).toUpperCase() + title.slice(1)
  if (title.length < 5) {
    title = 'Pizza Photo'
  }

  const description = `Photo by ${photo.user || 'Unknown'} on Pixabay`

  // Determine if viral based on downloads/likes
  const isViral = photo.downloads > 10000 || photo.likes > 500

  return {
    type: 'photo',
    title: title.slice(0, 200),
    url: photo.webformatURL, // 640px
    thumbnail_url: photo.previewURL, // 150px
    source_url: photo.pageURL,
    source_platform: 'pixabay',
    description: description,
    is_viral: isViral,
    // Metadata for tagging
    _user: photo.user,
    _downloads: photo.downloads,
    _likes: photo.likes,
    _tags: photo.tags
  }
}

// Transform Pixabay video response
function transformVideo(video) {
  if (!video.videos) {
    return null
  }

  // Get the best quality video (prefer medium for balance of quality and size)
  const videoFiles = video.videos
  const selectedVideo = videoFiles.medium || videoFiles.small || videoFiles.tiny

  if (!selectedVideo?.url) {
    return null
  }

  // Build title from tags
  let title = video.tags || 'Pizza Video'
  title = title.split(',')[0].trim()
  title = title.charAt(0).toUpperCase() + title.slice(1)
  if (title.length < 5) {
    title = 'Pizza Video'
  }

  const description = `Video by ${video.user || 'Unknown'} on Pixabay`

  // Determine if viral based on downloads/likes
  const isViral = video.downloads > 5000 || video.likes > 200

  return {
    type: 'video',
    title: title.slice(0, 200),
    url: selectedVideo.url,
    thumbnail_url: video.picture_id
      ? `https://i.vimeocdn.com/video/${video.picture_id}_640x360.jpg`
      : null,
    source_url: video.pageURL,
    source_platform: 'pixabay',
    description: description,
    is_viral: isViral,
    // Metadata for tagging
    _user: video.user,
    _duration: video.duration,
    _downloads: video.downloads,
    _likes: video.likes,
    _tags: video.tags
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    console.error('Error: PIXABAY_API_KEY environment variable is required')
    console.error('Get an API key at: https://pixabay.com/api/docs/')
    process.exit(1)
  }

  console.log('\n=== Pixabay Pizza Importer ===\n')
  console.log(`Type: ${config.videos ? 'Videos' : 'Photos'}`)
  console.log(`Query: "${config.query}"`)
  console.log(`Category: ${config.category}, Order: ${config.order}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = `${config.videos ? 'videos' : 'photos'}-${config.query.replace(/\s+/g, '-').toLowerCase()}`

  const importer = new ContentImporter({
    platform: 'pixabay',
    sourceIdentifier: sourceId,
    displayName: `Pixabay ${config.videos ? 'Videos' : 'Photos'}: ${config.query}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 100 }), // Pixabay: 100 req/min
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => config.videos
        ? fetchPixabayVideos(apiKey, config)
        : fetchPixabayPhotos(apiKey, config),
      // Transform function
      config.videos ? transformVideo : transformPhoto
    )
  } catch (error) {
    console.error('[Pixabay] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
