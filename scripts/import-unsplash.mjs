#!/usr/bin/env node
/**
 * Unsplash Importer
 *
 * Imports high-quality pizza photos from Unsplash.
 * All Unsplash photos are free to use (with attribution appreciated).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx UNSPLASH_ACCESS_KEY=xxx node scripts/import-unsplash.mjs
 *   SUPABASE_SERVICE_KEY=xxx UNSPLASH_ACCESS_KEY=xxx node scripts/import-unsplash.mjs --query "pepperoni pizza"
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 30
const API_BASE = 'https://api.unsplash.com'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    orientation: 'squarish', // 'landscape', 'portrait', 'squarish'
    orderBy: 'relevant', // 'relevant', 'latest'
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
      case '--orientation':
      case '-o':
        config.orientation = args[++i]
        break
      case '--order-by':
        config.orderBy = args[++i]
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
Unsplash Pizza Importer

Usage:
  node scripts/import-unsplash.mjs [options]

Options:
  --query, -q <term>        Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>           Number of photos to fetch (default: ${DEFAULT_LIMIT}, max: 30)
  --orientation, -o <type>  Orientation: landscape, portrait, squarish (default: squarish)
  --order-by <type>         Order by: relevant, latest (default: relevant)
  --page, -p <n>            Page number for pagination (default: 1)
  --dry-run                 Show what would be imported without saving
  --help, -h                Show this help message

Environment:
  UNSPLASH_ACCESS_KEY       Required. Get one at https://unsplash.com/developers
  SUPABASE_SERVICE_KEY      Required. Supabase service role key.

Examples:
  node scripts/import-unsplash.mjs
  node scripts/import-unsplash.mjs --query "pepperoni pizza" --orientation landscape
  node scripts/import-unsplash.mjs --order-by latest --page 2
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch photos from Unsplash
async function fetchUnsplash(accessKey, config) {
  const params = new URLSearchParams({
    query: config.query,
    per_page: Math.min(config.limit, 30).toString(),
    page: config.page.toString(),
    orientation: config.orientation,
    order_by: config.orderBy
  })

  const url = `${API_BASE}/search/photos?${params}`
  console.log(`[Unsplash] Searching for "${config.query}"...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Client-ID ${accessKey}`,
      'Accept-Version': 'v1'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Unsplash API error: ${response.status} - ${error.errors?.join(', ') || 'Unknown error'}`)
  }

  const data = await response.json()

  // Log total results
  console.log(`[Unsplash] Found ${data.total} total results, fetching page ${config.page}`)

  return data.results || []
}

// Transform Unsplash response to content format
function transformPhoto(photo) {
  if (!photo.urls) {
    return null
  }

  // Get title from description or alt_description
  let title = photo.description || photo.alt_description || ''
  if (!title) {
    title = 'Pizza Photo'
  }
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Build attribution
  const photographer = photo.user?.name || photo.user?.username || 'Unknown'
  const description = `Photo by ${photographer} on Unsplash`

  // Determine if viral based on likes
  const isViral = photo.likes > 500

  return {
    type: 'meme', // Unsplash photos are high-quality images
    title: title.slice(0, 200),
    url: photo.urls.regular, // 1080px wide
    thumbnail_url: photo.urls.small, // 400px wide
    source_url: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
    source_platform: 'unsplash',
    description: description,
    is_viral: isViral,
    // Metadata for tagging
    _photographer: photographer,
    _likes: photo.likes,
    _tags: photo.tags?.map(t => t.title) || []
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    console.error('Error: UNSPLASH_ACCESS_KEY environment variable is required')
    console.error('Register at: https://unsplash.com/developers')
    process.exit(1)
  }

  console.log('\n=== Unsplash Pizza Importer ===\n')
  console.log(`Query: "${config.query}"`)
  console.log(`Orientation: ${config.orientation}, Order: ${config.orderBy}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = config.query.replace(/\s+/g, '-').toLowerCase()

  const importer = new ContentImporter({
    platform: 'unsplash',
    sourceIdentifier: sourceId,
    displayName: `Unsplash: ${config.query}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 50 }), // Unsplash: 50 req/hour
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => fetchUnsplash(accessKey, config),
      // Transform function
      transformPhoto
    )
  } catch (error) {
    console.error('[Unsplash] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
