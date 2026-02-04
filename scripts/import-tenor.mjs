#!/usr/bin/env node
/**
 * Tenor Importer
 *
 * Imports pizza GIFs from Tenor's API (Google-owned).
 * When run with --all-stars flag, searches for content featuring Pizza All Stars.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx TENOR_API_KEY=xxx node scripts/import-tenor.mjs
 *   SUPABASE_SERVICE_KEY=xxx TENOR_API_KEY=xxx node scripts/import-tenor.mjs --query "pizza party"
 *   SUPABASE_SERVICE_KEY=xxx TENOR_API_KEY=xxx node scripts/import-tenor.mjs --featured
 *   SUPABASE_SERVICE_KEY=xxx TENOR_API_KEY=xxx node scripts/import-tenor.mjs --all-stars
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'
import { getAllStarsSearchTerms } from './lib/all-stars.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 50
const API_BASE = 'https://tenor.googleapis.com/v2'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    featured: false,
    allStars: false,
    dryRun: false,
    pos: '' // Position for pagination
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
      case '--pos':
      case '-p':
        config.pos = args[++i]
        break
      case '--featured':
      case '-f':
        config.featured = true
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
Tenor Pizza Importer

Usage:
  node scripts/import-tenor.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>         Number of GIFs to fetch (default: ${DEFAULT_LIMIT}, max: 50)
  --pos, -p <position>    Position for pagination
  --featured, -f          Fetch featured GIFs instead of searching
  --all-stars, -a         Search for all Pizza All Stars (from database)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  TENOR_API_KEY           Required. Get one at https://developers.google.com/tenor/
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-tenor.mjs
  node scripts/import-tenor.mjs --query "pizza party" --limit 25
  node scripts/import-tenor.mjs --featured
  node scripts/import-tenor.mjs --all-stars --limit 10
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch GIFs from Tenor
async function fetchTenor(apiKey, config) {
  const params = new URLSearchParams({
    key: apiKey,
    limit: Math.min(config.limit, 50).toString(),
    media_filter: 'gif,tinygif',
    contentfilter: 'medium'
  })

  if (config.pos) {
    params.set('pos', config.pos)
  }

  let url
  if (config.featured) {
    url = `${API_BASE}/featured?${params}`
    console.log('[Tenor] Fetching featured GIFs...')
  } else {
    params.set('q', config.query)
    url = `${API_BASE}/search?${params}`
    console.log(`[Tenor] Searching for "${config.query}"...`)
  }

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tenor API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  // Log pagination position for next run
  if (data.next) {
    console.log(`[Tenor] Next position for pagination: ${data.next}`)
  }

  return data.results || []
}

// Transform Tenor response to content format
function transformGif(gif) {
  // Get media formats
  const formats = gif.media_formats

  if (!formats) {
    return null
  }

  // Prefer gif format, fall back to others
  const mainGif = formats.gif || formats.mediumgif || formats.tinygif
  const thumbnail = formats.tinygif || formats.nanogif || formats.gif

  if (!mainGif?.url) {
    return null
  }

  // Clean up title
  let title = gif.content_description || gif.h1_title || ''
  if (!title) {
    title = 'Pizza GIF'
  }

  return {
    type: 'gif',
    title: title.slice(0, 200),
    url: mainGif.url,
    thumbnail_url: thumbnail?.url || mainGif.url,
    source_url: gif.url || gif.itemurl, // Tenor page URL
    source_platform: 'tenor',
    description: null,
    is_viral: false,
    // Metadata for tagging
    _tags: gif.tags || [],
    _hasaudio: gif.hasaudio
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.TENOR_API_KEY
  if (!apiKey) {
    console.error('Error: TENOR_API_KEY environment variable is required')
    console.error('Get a free API key at: https://developers.google.com/tenor/')
    process.exit(1)
  }

  console.log('\n=== Tenor Pizza Importer ===\n')

  // If --all-stars flag, fetch all search terms and run multiple queries
  if (config.allStars) {
    console.log('Mode: Pizza All Stars (multiple queries)')
    console.log(`Limit per query: ${config.limit}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const searchTerms = await getAllStarsSearchTerms()
    console.log(`Found ${searchTerms.length} search terms from All Stars\n`)

    const rateLimiter = new RateLimiter({ requestsPerMinute: 30 })

    for (const term of searchTerms) {
      console.log(`\n--- Searching for "${term}" ---\n`)

      const queryConfig = { ...config, query: term }
      const sourceId = term.replace(/\s+/g, '-').toLowerCase()

      const importer = new ContentImporter({
        platform: 'tenor',
        sourceIdentifier: sourceId,
        displayName: `Tenor: ${term}`,
        rateLimiter,
        dryRun: config.dryRun
      })

      try {
        await importer.run(
          async () => fetchTenor(apiKey, queryConfig),
          transformGif
        )
      } catch (error) {
        console.error(`[Tenor] Error for "${term}":`, error.message)
        // Continue with next term
      }

      // Small delay between queries
      await new Promise(r => setTimeout(r, 1000))
    }
  } else {
    // Single query mode
    console.log(`Mode: ${config.featured ? 'Featured' : `Search "${config.query}"`}`)
    console.log(`Limit: ${config.limit}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const sourceId = config.featured ? 'featured' : config.query.replace(/\s+/g, '-').toLowerCase()

    const importer = new ContentImporter({
      platform: 'tenor',
      sourceIdentifier: sourceId,
      displayName: config.featured ? 'Tenor Featured' : `Tenor: ${config.query}`,
      rateLimiter: new RateLimiter({ requestsPerMinute: 30 }),
      dryRun: config.dryRun
    })

    try {
      await importer.run(
        // Fetch function
        async () => fetchTenor(apiKey, config),
        // Transform function
        transformGif
      )
    } catch (error) {
      console.error('[Tenor] Error:', error.message)
      process.exit(1)
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
