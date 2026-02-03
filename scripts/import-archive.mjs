#!/usr/bin/env node
/**
 * Archive.org Importer
 *
 * Imports pizza content from the Internet Archive.
 * Uses Archive.org's public API (no auth required).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-archive.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-archive.mjs --type video
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-archive.mjs --limit 50
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_LIMIT = 25
const DEFAULT_MEDIA_TYPE = 'all' // 'all', 'movies', 'image', 'audio'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    limit: DEFAULT_LIMIT,
    mediaType: DEFAULT_MEDIA_TYPE,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
      case '-t':
        config.mediaType = args[++i]
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Archive.org Pizza Importer

Usage:
  node scripts/import-archive.mjs [options]

Options:
  --type, -t <type>       Media type: all, movies, image, audio (default: ${DEFAULT_MEDIA_TYPE})
  --limit, -l <n>         Number of items to fetch (default: ${DEFAULT_LIMIT})
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-archive.mjs
  node scripts/import-archive.mjs --type movies --limit 50
  node scripts/import-archive.mjs --type image --dry-run
`)
        process.exit(0)
    }
  }

  return config
}

// Map Archive.org media types to our content types
function mapMediaType(archiveType) {
  const typeMap = {
    'movies': 'video',
    'image': 'photo',
    'audio': 'music',
    'texts': null // Skip text documents
  }
  return typeMap[archiveType] || null
}

// Fetch items from Archive.org
async function fetchArchive({ mediaType, limit }) {
  // Build search query
  let query = 'pizza'
  let mediaTypeFilter = ''

  if (mediaType !== 'all') {
    mediaTypeFilter = `&mediatype=${mediaType}`
  } else {
    // Exclude texts, we want visual/audio content
    mediaTypeFilter = '&mediatype=(movies OR image OR audio)'
  }

  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}${mediaTypeFilter}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=mediatype&fl[]=creator&fl[]=date&fl[]=downloads&output=json&rows=${limit}&sort[]=downloads+desc`

  console.log(`[Archive.org] Fetching pizza content...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PizzaSauce/1.0 (pizza content aggregator)'
    }
  })

  if (!response.ok) {
    throw new Error(`Archive.org API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data?.response?.docs || []
}

// Get the best media file URL for an item
async function getMediaUrl(identifier, mediaType) {
  const metadataUrl = `https://archive.org/metadata/${identifier}`

  try {
    const response = await fetch(metadataUrl)
    if (!response.ok) return null

    const data = await response.json()
    const files = data?.files || []

    // Find the best file based on media type
    let bestFile = null

    if (mediaType === 'movies') {
      // Prefer mp4, then ogv, then any video
      bestFile = files.find(f => f.name?.endsWith('.mp4') && f.source === 'derivative') ||
                 files.find(f => f.name?.endsWith('.mp4')) ||
                 files.find(f => f.name?.endsWith('.ogv')) ||
                 files.find(f => f.format?.toLowerCase().includes('mpeg4'))
    } else if (mediaType === 'image') {
      // Prefer jpg/png
      bestFile = files.find(f => f.name?.match(/\.(jpg|jpeg|png|gif)$/i) && f.source !== 'derivative') ||
                 files.find(f => f.name?.match(/\.(jpg|jpeg|png|gif)$/i))
    } else if (mediaType === 'audio') {
      // Prefer mp3
      bestFile = files.find(f => f.name?.endsWith('.mp3')) ||
                 files.find(f => f.format?.toLowerCase().includes('mp3'))
    }

    if (bestFile) {
      return `https://archive.org/download/${identifier}/${encodeURIComponent(bestFile.name)}`
    }

    return null
  } catch (error) {
    console.error(`[Archive.org] Error fetching metadata for ${identifier}:`, error.message)
    return null
  }
}

// Transform Archive.org item to our format
async function transformItem(item) {
  const contentType = mapMediaType(item.mediatype)

  // Skip unsupported types
  if (!contentType) {
    return null
  }

  // Get the actual media URL
  const mediaUrl = await getMediaUrl(item.identifier, item.mediatype)

  if (!mediaUrl) {
    console.log(`[Archive.org] Skipping ${item.identifier}: no suitable media file found`)
    return null
  }

  const thumbnailUrl = `https://archive.org/services/img/${item.identifier}`

  return {
    type: contentType,
    title: (item.title || item.identifier).slice(0, 200),
    url: mediaUrl,
    thumbnail_url: thumbnailUrl,
    source_url: `https://archive.org/details/${item.identifier}`,
    source_platform: 'archive.org',
    description: item.description?.slice(0, 500) || null,
    is_viral: (item.downloads || 0) > 10000,
    metadata: {
      creator: item.creator,
      date: item.date,
      downloads: item.downloads
    }
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  console.log('\n=== Archive.org Pizza Importer ===\n')
  console.log(`Media Type: ${config.mediaType}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const rateLimiter = new RateLimiter({ requestsPerMinute: 30 })

  const importer = new ContentImporter({
    platform: 'archive.org',
    sourceIdentifier: 'archive.org',
    displayName: 'Internet Archive',
    rateLimiter,
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => {
        const items = await fetchArchive(config)
        return items
      },
      // Transform function (async)
      async (item) => {
        await rateLimiter.wait() // Rate limit metadata requests
        return transformItem(item)
      }
    )
  } catch (error) {
    console.error('[Archive.org] Error:', error.message)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
