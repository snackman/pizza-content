#!/usr/bin/env node
/**
 * RAWG.io Pizza Games Importer
 *
 * Imports pizza-themed games from RAWG.io (the largest video game database).
 * Uses the free API to search for pizza-related games.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx RAWG_API_KEY=xxx node scripts/import-games-rawg.mjs
 *   SUPABASE_SERVICE_KEY=xxx RAWG_API_KEY=xxx node scripts/import-games-rawg.mjs --query "pizza tower"
 *   SUPABASE_SERVICE_KEY=xxx RAWG_API_KEY=xxx node scripts/import-games-rawg.mjs --page 2
 *
 * Get a free API key at: https://rawg.io/apidocs
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_PAGE_SIZE = 20
const API_BASE = 'https://api.rawg.io/api'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    pageSize: DEFAULT_PAGE_SIZE,
    page: 1,
    ordering: '-rating', // Best rated first
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
      case '-q':
        config.query = args[++i]
        break
      case '--page-size':
      case '-s':
        config.pageSize = parseInt(args[++i], 10)
        break
      case '--page':
      case '-p':
        config.page = parseInt(args[++i], 10)
        break
      case '--ordering':
      case '-o':
        config.ordering = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
RAWG.io Pizza Games Importer

Usage:
  node scripts/import-games-rawg.mjs [options]

Options:
  --query, -q <term>       Search query (default: "${DEFAULT_QUERY}")
  --page-size, -s <n>      Results per page (default: ${DEFAULT_PAGE_SIZE}, max: 40)
  --page, -p <n>           Page number (default: 1)
  --ordering, -o <type>    Order by: -rating, -released, name, -added (default: -rating)
  --dry-run                Show what would be imported without saving
  --help, -h               Show this help message

Environment:
  RAWG_API_KEY             Required. Get one at https://rawg.io/apidocs
  SUPABASE_SERVICE_KEY     Required. Supabase service role key.

Examples:
  node scripts/import-games-rawg.mjs
  node scripts/import-games-rawg.mjs --query "pizza tower" --ordering -released
  node scripts/import-games-rawg.mjs --page 2

Notable pizza games to search for:
  - "pizza tower" (popular indie platformer)
  - "good pizza great pizza" (pizza shop simulator)
  - "pizza connection" (business simulation series)
  - "papa's pizzeria" (flash game series)
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch games from RAWG.io
async function fetchRAWG(apiKey, config) {
  const params = new URLSearchParams({
    key: apiKey,
    search: config.query,
    page_size: Math.min(config.pageSize, 40).toString(),
    page: config.page.toString(),
    ordering: config.ordering
  })

  const url = `${API_BASE}/games?${params}`
  console.log(`[RAWG] Searching for "${config.query}" (page ${config.page})...`)

  const response = await fetch(url)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`RAWG API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Log pagination info
  if (data.next) {
    console.log(`[RAWG] More results available. Next page: ${config.page + 1}`)
  }
  console.log(`[RAWG] Total results: ${data.count}`)

  return data.results || []
}

// Get platform names from platform array
function getPlatformTags(platforms) {
  if (!platforms || !Array.isArray(platforms)) return []

  const platformNames = platforms
    .map(p => p.platform?.name?.toLowerCase())
    .filter(Boolean)

  const tags = []

  // Group platforms into common categories
  if (platformNames.some(p => p.includes('pc') || p.includes('windows') || p.includes('linux') || p.includes('mac'))) {
    tags.push('pc')
  }
  if (platformNames.some(p => p.includes('playstation'))) {
    tags.push('playstation')
  }
  if (platformNames.some(p => p.includes('xbox'))) {
    tags.push('xbox')
  }
  if (platformNames.some(p => p.includes('nintendo') || p.includes('switch') || p.includes('wii'))) {
    tags.push('nintendo')
  }
  if (platformNames.some(p => p.includes('ios') || p.includes('android'))) {
    tags.push('mobile')
  }
  if (platformNames.some(p => p.includes('web'))) {
    tags.push('browser')
  }

  return tags
}

// Get genre tags
function getGenreTags(genres) {
  if (!genres || !Array.isArray(genres)) return []

  return genres
    .map(g => g.name?.toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
    .slice(0, 3) // Limit to 3 genre tags
}

// Build store links description
function buildStoreInfo(stores) {
  if (!stores || !Array.isArray(stores) || stores.length === 0) return ''

  const storeNames = stores
    .map(s => s.store?.name)
    .filter(Boolean)

  if (storeNames.length === 0) return ''

  return `\n\nAvailable on: ${storeNames.join(', ')}`
}

// Transform RAWG response to content format
function transformGame(game) {
  if (!game || !game.name) {
    return null
  }

  // Build description
  let description = game.description_raw || game.description || ''
  // Strip HTML if present
  description = description.replace(/<[^>]*>/g, '').trim()
  // Truncate to reasonable length
  description = description.slice(0, 400)

  // Add store info if available
  const storeInfo = buildStoreInfo(game.stores)
  if (storeInfo && description.length + storeInfo.length <= 500) {
    description += storeInfo
  }

  // Build tags
  const tags = ['pizza', 'game']
  tags.push(...getPlatformTags(game.platforms))
  tags.push(...getGenreTags(game.genres))

  // Add indie tag if applicable
  if (game.genres?.some(g => g.name?.toLowerCase() === 'indie')) {
    tags.push('indie')
  }

  // Determine if game is "viral" (popular)
  // RAWG rating is out of 5, ratings_count is total reviews
  const isViral = (game.rating >= 4.0) || (game.ratings_count >= 1000)

  // Use RAWG page as source URL
  const sourceUrl = `https://rawg.io/games/${game.slug}`

  // Use the game's official website if available, otherwise RAWG page
  const url = game.website || sourceUrl

  return {
    type: 'game',
    title: game.name.slice(0, 200),
    url: url,
    thumbnail_url: game.background_image || null,
    source_url: sourceUrl,
    source_platform: 'rawg',
    description: description || null,
    is_viral: isViral,
    tags: [...new Set(tags)].slice(0, 10), // Dedupe and limit
    // Metadata for logging (not stored)
    _rating: game.rating,
    _ratingsCount: game.ratings_count,
    _released: game.released
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.RAWG_API_KEY
  if (!apiKey) {
    console.error('Error: RAWG_API_KEY environment variable is required')
    console.error('Get a free API key at: https://rawg.io/apidocs')
    process.exit(1)
  }

  console.log('\n=== RAWG.io Pizza Games Importer ===\n')
  console.log(`Query: "${config.query}"`)
  console.log(`Page: ${config.page}, Page Size: ${config.pageSize}, Ordering: ${config.ordering}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = `games-${config.query.replace(/\s+/g, '-').toLowerCase()}`

  const importer = new ContentImporter({
    platform: 'rawg',
    sourceIdentifier: sourceId,
    displayName: `RAWG: ${config.query}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 20 }), // RAWG has generous limits
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => fetchRAWG(apiKey, config),
      // Transform function
      transformGame
    )
  } catch (error) {
    console.error('[RAWG] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
