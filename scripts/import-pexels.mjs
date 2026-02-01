#!/usr/bin/env node
/**
 * Pexels Importer
 *
 * Imports pizza photos and videos from Pexels.
 * All Pexels content is free for commercial use.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx PEXELS_API_KEY=xxx node scripts/import-pexels.mjs
 *   SUPABASE_SERVICE_KEY=xxx PEXELS_API_KEY=xxx node scripts/import-pexels.mjs --query "pizza making"
 *   SUPABASE_SERVICE_KEY=xxx PEXELS_API_KEY=xxx node scripts/import-pexels.mjs --videos
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 30
const API_BASE = 'https://api.pexels.com'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    videos: false, // false = photos, true = videos
    orientation: 'square', // 'landscape', 'portrait', 'square'
    size: 'medium', // 'large', 'medium', 'small'
    page: 1,
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
      case '--orientation':
      case '-o':
        config.orientation = args[++i]
        break
      case '--size':
      case '-s':
        config.size = args[++i]
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
Pexels Pizza Importer

Usage:
  node scripts/import-pexels.mjs [options]

Options:
  --query, -q <term>        Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>           Number of items to fetch (default: ${DEFAULT_LIMIT}, max: 80)
  --videos, -v              Fetch videos instead of photos
  --photos                  Fetch photos (default)
  --orientation, -o <type>  Orientation: landscape, portrait, square (default: square)
  --size, -s <type>         Size filter: large, medium, small (default: medium)
  --page, -p <n>            Page number for pagination (default: 1)
  --dry-run                 Show what would be imported without saving
  --help, -h                Show this help message

Environment:
  PEXELS_API_KEY            Required. Get one at https://www.pexels.com/api/
  SUPABASE_SERVICE_KEY      Required. Supabase service role key.

Examples:
  node scripts/import-pexels.mjs
  node scripts/import-pexels.mjs --query "pizza making" --orientation landscape
  node scripts/import-pexels.mjs --videos --query "pizza cooking"
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch photos from Pexels
async function fetchPexelsPhotos(apiKey, config) {
  const params = new URLSearchParams({
    query: config.query,
    per_page: Math.min(config.limit, 80).toString(),
    page: config.page.toString(),
    orientation: config.orientation,
    size: config.size
  })

  const url = `${API_BASE}/v1/search?${params}`
  console.log(`[Pexels] Searching photos for "${config.query}"...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': apiKey
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pexels API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log(`[Pexels] Found ${data.total_results} total photos`)

  return data.photos || []
}

// Fetch videos from Pexels
async function fetchPexelsVideos(apiKey, config) {
  const params = new URLSearchParams({
    query: config.query,
    per_page: Math.min(config.limit, 80).toString(),
    page: config.page.toString(),
    orientation: config.orientation,
    size: config.size
  })

  const url = `${API_BASE}/videos/search?${params}`
  console.log(`[Pexels] Searching videos for "${config.query}"...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': apiKey
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Pexels API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log(`[Pexels] Found ${data.total_results} total videos`)

  return data.videos || []
}

// Transform Pexels photo response
function transformPhoto(photo) {
  if (!photo.src) {
    return null
  }

  // Get title from alt text
  let title = photo.alt || 'Pizza Photo'
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Build attribution
  const photographer = photo.photographer || 'Unknown'
  const description = `Photo by ${photographer} on Pexels`

  return {
    type: 'meme',
    title: title.slice(0, 200),
    url: photo.src.large, // 940px
    thumbnail_url: photo.src.medium, // 350px
    source_url: photo.url,
    source_platform: 'pexels',
    description: description,
    is_viral: false,
    // Metadata for tagging
    _photographer: photographer,
    _avgColor: photo.avg_color
  }
}

// Transform Pexels video response
function transformVideo(video) {
  if (!video.video_files || video.video_files.length === 0) {
    return null
  }

  // Get the best quality video file (HD preferred)
  const videoFiles = video.video_files.sort((a, b) => (b.height || 0) - (a.height || 0))
  const hdVideo = videoFiles.find(v => v.height >= 720) || videoFiles[0]

  // Get thumbnail
  const thumbnail = video.image || video.video_pictures?.[0]?.picture

  // Get title
  let title = 'Pizza Video'
  if (video.user?.name) {
    title = `Pizza by ${video.user.name}`
  }

  const description = video.user?.name ? `Video by ${video.user.name} on Pexels` : 'Video from Pexels'

  return {
    type: 'video',
    title: title.slice(0, 200),
    url: hdVideo.link,
    thumbnail_url: thumbnail,
    source_url: video.url,
    source_platform: 'pexels',
    description: description,
    is_viral: false,
    // Metadata for tagging
    _duration: video.duration,
    _width: hdVideo.width,
    _height: hdVideo.height
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.error('Error: PEXELS_API_KEY environment variable is required')
    console.error('Get an API key at: https://www.pexels.com/api/')
    process.exit(1)
  }

  console.log('\n=== Pexels Pizza Importer ===\n')
  console.log(`Type: ${config.videos ? 'Videos' : 'Photos'}`)
  console.log(`Query: "${config.query}"`)
  console.log(`Orientation: ${config.orientation}, Size: ${config.size}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = `${config.videos ? 'videos' : 'photos'}-${config.query.replace(/\s+/g, '-').toLowerCase()}`

  const importer = new ContentImporter({
    platform: 'pexels',
    sourceIdentifier: sourceId,
    displayName: `Pexels ${config.videos ? 'Videos' : 'Photos'}: ${config.query}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 200 }), // Pexels: 200 req/hr
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => config.videos
        ? fetchPexelsVideos(apiKey, config)
        : fetchPexelsPhotos(apiKey, config),
      // Transform function
      config.videos ? transformVideo : transformPhoto
    )
  } catch (error) {
    console.error('[Pexels] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
