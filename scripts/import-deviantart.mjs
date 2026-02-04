#!/usr/bin/env node
/**
 * DeviantArt Importer
 *
 * Imports pizza art from DeviantArt's API using OAuth2 Client Credentials.
 * When run with --all-stars flag, searches for content featuring Pizza All Stars.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx DEVIANTART_CLIENT_ID=xxx DEVIANTART_CLIENT_SECRET=xxx node scripts/import-deviantart.mjs
 *   SUPABASE_SERVICE_KEY=xxx DEVIANTART_CLIENT_ID=xxx DEVIANTART_CLIENT_SECRET=xxx node scripts/import-deviantart.mjs --tag "pizza"
 *   SUPABASE_SERVICE_KEY=xxx DEVIANTART_CLIENT_ID=xxx DEVIANTART_CLIENT_SECRET=xxx node scripts/import-deviantart.mjs --query "pizza art"
 *   SUPABASE_SERVICE_KEY=xxx DEVIANTART_CLIENT_ID=xxx DEVIANTART_CLIENT_SECRET=xxx node scripts/import-deviantart.mjs --all-stars
 *
 * Register your app at: https://www.deviantart.com/developers/register
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'
import { getAllStarsSearchTerms } from './lib/all-stars.mjs'

// Default configuration
const DEFAULT_TAG = 'pizza'
const DEFAULT_LIMIT = 24
const API_BASE = 'https://www.deviantart.com/api/v1/oauth2'
const TOKEN_URL = 'https://www.deviantart.com/oauth2/token'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    tag: DEFAULT_TAG,
    query: null, // Use tag search by default, query for text search
    limit: DEFAULT_LIMIT,
    offset: 0,
    matureContent: false,
    allStars: false,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tag':
      case '-t':
        config.tag = args[++i]
        break
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
      case '--mature':
      case '-m':
        config.matureContent = true
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
DeviantArt Pizza Art Importer

Usage:
  node scripts/import-deviantart.mjs [options]

Options:
  --tag, -t <tag>         Tag to search for (default: "${DEFAULT_TAG}")
  --query, -q <term>      Text query for searching (overrides --tag)
  --limit, -l <n>         Number of items to fetch (default: ${DEFAULT_LIMIT}, max: 60)
  --offset, -o <n>        Offset for pagination (default: 0)
  --mature, -m            Include mature content
  --all-stars, -a         Search for all Pizza All Stars (from database)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  DEVIANTART_CLIENT_ID      Required. OAuth client ID from DeviantArt Developer Portal.
  DEVIANTART_CLIENT_SECRET  Required. OAuth client secret from DeviantArt Developer Portal.
  SUPABASE_SERVICE_KEY      Required. Supabase service role key.

Register your app at: https://www.deviantart.com/developers/register

Examples:
  node scripts/import-deviantart.mjs
  node scripts/import-deviantart.mjs --tag "pizza art" --limit 50
  node scripts/import-deviantart.mjs --query "italian pizza" --offset 24
  node scripts/import-deviantart.mjs --all-stars --limit 10
`)
        process.exit(0)
    }
  }

  return config
}

// Token cache
let cachedToken = null
let tokenExpiresAt = 0

// Get OAuth2 access token using Client Credentials grant
async function getAccessToken(clientId, clientSecret) {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken
  }

  console.log('[DeviantArt] Fetching new access token...')

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeviantArt OAuth error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  if (data.status !== 'success' || !data.access_token) {
    throw new Error(`DeviantArt OAuth failed: ${JSON.stringify(data)}`)
  }

  cachedToken = data.access_token
  // Token expires in 1 hour, cache it
  tokenExpiresAt = Date.now() + (data.expires_in * 1000)

  console.log('[DeviantArt] Access token obtained')
  return cachedToken
}

// Fetch deviations by tag
async function fetchByTag(accessToken, config) {
  const params = new URLSearchParams({
    tag: config.tag,
    limit: Math.min(config.limit, 60).toString(),
    offset: config.offset.toString(),
    mature_content: config.matureContent.toString()
  })

  const url = `${API_BASE}/browse/tags?${params}`
  console.log(`[DeviantArt] Browsing tag "${config.tag}"...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeviantArt API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  if (data.has_more) {
    console.log(`[DeviantArt] Has more results at offset ${data.next_offset}`)
  }

  return data.results || []
}

// Fetch deviations by text query (using hot/popular with query param)
async function fetchByQuery(accessToken, config) {
  const params = new URLSearchParams({
    q: config.query,
    limit: Math.min(config.limit, 60).toString(),
    offset: config.offset.toString(),
    mature_content: config.matureContent.toString()
  })

  const url = `${API_BASE}/browse/popular?${params}`
  console.log(`[DeviantArt] Searching for "${config.query}"...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeviantArt API error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  if (data.has_more) {
    console.log(`[DeviantArt] Has more results at offset ${data.next_offset}`)
  }

  return data.results || []
}

// Transform DeviantArt deviation to content format
function transformDeviation(deviation) {
  // Skip if no preview image available
  if (!deviation.content && !deviation.preview && !deviation.thumbs?.length) {
    console.log(`[DeviantArt] Skipping ${deviation.deviationid}: No image available`)
    return null
  }

  // Skip literature/text-only deviations
  if (deviation.category_path?.includes('literature')) {
    console.log(`[DeviantArt] Skipping literature: ${deviation.title}`)
    return null
  }

  // Get the best image URL available
  // Prefer content > preview > largest thumb
  let imageUrl = null
  let thumbnailUrl = null

  if (deviation.content?.src) {
    imageUrl = deviation.content.src
  } else if (deviation.preview?.src) {
    imageUrl = deviation.preview.src
  }

  // Get thumbnail from thumbs array (prefer larger sizes)
  if (deviation.thumbs?.length) {
    // Sort by size to get largest
    const sortedThumbs = [...deviation.thumbs].sort((a, b) =>
      (b.width * b.height) - (a.width * a.height)
    )
    thumbnailUrl = sortedThumbs[0]?.src
    // If no main image, use largest thumb
    if (!imageUrl) {
      imageUrl = thumbnailUrl
    }
    // Use smaller thumb for thumbnail if we have multiple
    if (sortedThumbs.length > 1) {
      thumbnailUrl = sortedThumbs[Math.min(2, sortedThumbs.length - 1)]?.src
    }
  }

  if (!imageUrl) {
    console.log(`[DeviantArt] Skipping ${deviation.deviationid}: Could not find image URL`)
    return null
  }

  thumbnailUrl = thumbnailUrl || imageUrl

  // Build title
  let title = deviation.title || 'Pizza Art'
  // Add artist name if available
  const artist = deviation.author?.username
  if (artist && !title.toLowerCase().includes(artist.toLowerCase())) {
    title = `${title}`
  }

  // Build description
  let description = null
  if (artist) {
    description = `Art by ${artist} on DeviantArt`
  }

  // Extract category for tags
  const categoryTags = []
  if (deviation.category_path) {
    // e.g., "digitalart/drawings/food" -> ["digitalart", "drawings", "food"]
    const cats = deviation.category_path.split('/').filter(c => c && c !== 'other')
    categoryTags.push(...cats.slice(0, 3))
  }

  return {
    type: 'art',
    title: title.slice(0, 200),
    url: imageUrl,
    thumbnail_url: thumbnailUrl,
    source_url: deviation.url, // Link to DeviantArt page
    source_platform: 'deviantart',
    description: description,
    is_viral: deviation.stats?.favourites > 1000,
    // Additional metadata for auto-tagger
    _artist: artist,
    _category: deviation.category_path,
    _favorites: deviation.stats?.favourites,
    _comments: deviation.stats?.comments,
    _categoryTags: categoryTags
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const clientId = process.env.DEVIANTART_CLIENT_ID
  const clientSecret = process.env.DEVIANTART_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Error: DEVIANTART_CLIENT_ID and DEVIANTART_CLIENT_SECRET environment variables are required')
    console.error('Register your app at: https://www.deviantart.com/developers/register')
    process.exit(1)
  }

  console.log('\n=== DeviantArt Pizza Art Importer ===\n')

  // If --all-stars flag, fetch all search terms and run multiple queries
  if (config.allStars) {
    console.log('Mode: Pizza All Stars (multiple queries)')
    console.log(`Limit per query: ${config.limit}`)
    console.log(`Mature content: ${config.matureContent ? 'Yes' : 'No'}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const searchTerms = await getAllStarsSearchTerms()
    console.log(`Found ${searchTerms.length} search terms from All Stars\n`)

    // Get access token first
    const accessToken = await getAccessToken(clientId, clientSecret)
    const rateLimiter = new RateLimiter({ requestsPerMinute: 20 })

    for (const term of searchTerms) {
      console.log(`\n--- Searching for "${term}" ---\n`)

      const queryConfig = { ...config, query: term }
      const sourceId = `query-${term.replace(/\s+/g, '-').toLowerCase()}`

      const importer = new ContentImporter({
        platform: 'deviantart',
        sourceIdentifier: sourceId,
        displayName: `DeviantArt Query: ${term}`,
        rateLimiter,
        dryRun: config.dryRun
      })

      try {
        await importer.run(
          async () => fetchByQuery(accessToken, queryConfig),
          transformDeviation
        )
      } catch (error) {
        console.error(`[DeviantArt] Error for "${term}":`, error.message)
        // Continue with next term
      }

      // Small delay between queries
      await new Promise(r => setTimeout(r, 1000))
    }
  } else {
    // Single query mode
    console.log(`Mode: ${config.query ? `Query "${config.query}"` : `Tag "${config.tag}"`}`)
    console.log(`Limit: ${config.limit}, Offset: ${config.offset}`)
    console.log(`Mature content: ${config.matureContent ? 'Yes' : 'No'}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const sourceId = config.query
      ? `query-${config.query.replace(/\s+/g, '-').toLowerCase()}`
      : `tag-${config.tag.replace(/\s+/g, '-').toLowerCase()}`

    const importer = new ContentImporter({
      platform: 'deviantart',
      sourceIdentifier: sourceId,
      displayName: config.query
        ? `DeviantArt Query: ${config.query}`
        : `DeviantArt Tag: ${config.tag}`,
      // DeviantArt rate limits are not clearly documented,
      // but we'll be conservative: ~20 requests per minute
      rateLimiter: new RateLimiter({ requestsPerMinute: 20 }),
      dryRun: config.dryRun
    })

    try {
      // Get access token first
      const accessToken = await getAccessToken(clientId, clientSecret)

      await importer.run(
        // Fetch function
        async () => config.query
          ? fetchByQuery(accessToken, config)
          : fetchByTag(accessToken, config),
        // Transform function
        transformDeviation
      )
    } catch (error) {
      console.error('[DeviantArt] Error:', error.message)
      process.exit(1)
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
