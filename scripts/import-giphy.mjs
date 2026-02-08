#!/usr/bin/env node
/**
 * GIPHY Importer
 *
 * Imports pizza GIFs from GIPHY's API.
 * When run with --all-stars flag, searches for content featuring Pizza All Stars.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx GIPHY_API_KEY=xxx node scripts/import-giphy.mjs
 *   SUPABASE_SERVICE_KEY=xxx GIPHY_API_KEY=xxx node scripts/import-giphy.mjs --query "pizza party"
 *   SUPABASE_SERVICE_KEY=xxx GIPHY_API_KEY=xxx node scripts/import-giphy.mjs --trending
 *   SUPABASE_SERVICE_KEY=xxx GIPHY_API_KEY=xxx node scripts/import-giphy.mjs --all-stars
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'
import { getAllStarsSearchTerms } from './lib/all-stars.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 50
const API_BASE = 'https://api.giphy.com/v1/gifs'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    trending: false,
    allStars: false,
    dryRun: false,
    offset: 0
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
      case '--offset':
      case '-o':
        config.offset = parseInt(args[++i], 10)
        break
      case '--trending':
      case '-t':
        config.trending = true
        break
      case '--all-stars':
      case '-a':
        config.allStars = true
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
GIPHY Pizza Importer

Usage:
  node scripts/import-giphy.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>         Number of GIFs to fetch per query (default: ${DEFAULT_LIMIT}, max: 100)
  --offset, -o <n>        Offset for pagination (default: 0)
  --trending, -t          Fetch trending GIFs instead of searching
  --all-stars, -a         Search for all Pizza All Stars (from database)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  GIPHY_API_KEY           Required. Get one at https://developers.giphy.com/
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-giphy.mjs
  node scripts/import-giphy.mjs --query "pizza party" --limit 25
  node scripts/import-giphy.mjs --trending
  node scripts/import-giphy.mjs --all-stars --limit 10
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch GIFs from GIPHY
async function fetchGiphy(apiKey, config) {
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: Math.min(config.limit, 100).toString(),
    offset: config.offset.toString(),
    rating: 'pg-13'
  })

  let url
  if (config.trending) {
    url = `${API_BASE}/trending?${params}`
    console.log('[GIPHY] Fetching trending GIFs...')
  } else {
    params.set('q', config.query)
    url = `${API_BASE}/search?${params}`
    console.log(`[GIPHY] Searching for "${config.query}"...`)
  }

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GIPHY API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data || []
}

// Transform GIPHY response to content format
function transformGif(gif) {
  // Get appropriate GIF size
  const images = gif.images

  // Prefer original or downsized for quality
  const mainGif = images.original || images.downsized_large || images.downsized
  const thumbnail = images.fixed_width_still || images.downsized_still || images.preview_gif

  if (!mainGif?.url) {
    return null
  }

  // Clean up title
  let title = gif.title || ''
  // Remove " GIF" suffix that GIPHY adds
  title = title.replace(/\s*GIF\s*$/i, '').trim()
  if (!title) {
    title = 'Pizza GIF'
  }

  return {
    type: 'gif',
    title: title.slice(0, 200),
    url: mainGif.url,
    thumbnail_url: thumbnail?.url || mainGif.url,
    source_url: gif.url, // GIPHY page URL
    source_platform: 'giphy',
    description: null,
    creator: gif.username || gif.user?.username || null,
    is_viral: false,
    // Metadata for tagging
    _username: gif.username,
    _rating: gif.rating
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    console.error('Error: GIPHY_API_KEY environment variable is required')
    console.error('Get a free API key at: https://developers.giphy.com/')
    process.exit(1)
  }

  console.log('\n=== GIPHY Pizza Importer ===\n')

  // If --all-stars flag, fetch all search terms and run multiple queries
  if (config.allStars) {
    console.log('Mode: Pizza All Stars (multiple queries)')
    console.log(`Limit per query: ${config.limit}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const searchTerms = await getAllStarsSearchTerms()
    console.log(`Found ${searchTerms.length} search terms from All Stars\n`)

    const rateLimiter = new RateLimiter({ requestsPerMinute: 42 })

    for (const term of searchTerms) {
      console.log(`\n--- Searching for "${term}" ---\n`)

      const queryConfig = { ...config, query: term }
      const sourceId = term.replace(/\s+/g, '-').toLowerCase()

      const importer = new ContentImporter({
        platform: 'giphy',
        sourceIdentifier: sourceId,
        displayName: `GIPHY: ${term}`,
        rateLimiter,
        dryRun: config.dryRun
      })

      try {
        await importer.run(
          async () => fetchGiphy(apiKey, queryConfig),
          transformGif
        )
      } catch (error) {
        console.error(`[GIPHY] Error for "${term}":`, error.message)
        // Continue with next term
      }

      // Small delay between queries
      await new Promise(r => setTimeout(r, 1000))
    }
  } else {
    // Single query mode
    console.log(`Mode: ${config.trending ? 'Trending' : `Search "${config.query}"`}`)
    console.log(`Limit: ${config.limit}, Offset: ${config.offset}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const sourceId = config.trending ? 'trending' : config.query.replace(/\s+/g, '-').toLowerCase()

    const importer = new ContentImporter({
      platform: 'giphy',
      sourceIdentifier: sourceId,
      displayName: config.trending ? 'GIPHY Trending' : `GIPHY: ${config.query}`,
      rateLimiter: new RateLimiter({ requestsPerMinute: 42 }), // GIPHY free tier limit
      dryRun: config.dryRun
    })

    try {
      await importer.run(
        // Fetch function
        async () => fetchGiphy(apiKey, config),
        // Transform function
        transformGif
      )
    } catch (error) {
      console.error('[GIPHY] Error:', error.message)
      process.exit(1)
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
