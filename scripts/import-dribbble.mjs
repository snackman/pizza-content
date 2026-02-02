#!/usr/bin/env node
/**
 * Dribbble Importer
 *
 * Imports pizza-related designs and illustrations from Dribbble.
 * Great for professional pizza logos, illustrations, and design work.
 *
 * Note: Dribbble API v2 only provides access to authenticated user's own shots.
 * This script also supports scraping public search results for broader discovery.
 *
 * Usage:
 *   # Scrape public search (default, no API key required):
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-dribbble.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-dribbble.mjs --query "pizza logo"
 *
 *   # Use API to fetch your own shots:
 *   SUPABASE_SERVICE_KEY=xxx DRIBBBLE_ACCESS_TOKEN=xxx node scripts/import-dribbble.mjs --api
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 30
const API_BASE = 'https://api.dribbble.com/v2'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    page: 1,
    useApi: false, // Use scraping by default since API doesn't have search
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
      case '--page':
      case '-p':
        config.page = parseInt(args[++i], 10)
        break
      case '--api':
        config.useApi = true
        break
      case '--scrape':
        config.useApi = false
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Dribbble Pizza Importer

Usage:
  node scripts/import-dribbble.mjs [options]

Options:
  --query, -q <term>    Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>       Number of shots to fetch (default: ${DEFAULT_LIMIT})
  --page, -p <n>        Page number for pagination (default: 1)
  --api                 Use API to fetch your own shots (requires DRIBBBLE_ACCESS_TOKEN)
  --scrape              Use web scraping for public search (default, no token needed)
  --dry-run             Show what would be imported without saving
  --help, -h            Show this help message

Environment:
  DRIBBBLE_ACCESS_TOKEN   Required for --api mode. OAuth token from Dribbble.
                          Get one at: https://dribbble.com/account/applications
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  # Scrape public pizza designs (default):
  node scripts/import-dribbble.mjs

  # Search for pizza logos:
  node scripts/import-dribbble.mjs --query "pizza logo"

  # Search for pizza illustrations:
  node scripts/import-dribbble.mjs --query "pizza illustration"

  # Fetch your own shots via API:
  DRIBBBLE_ACCESS_TOKEN=xxx node scripts/import-dribbble.mjs --api

Note: Dribbble API v2 does not have a public search endpoint.
      For broad pizza content discovery, the scraping mode is recommended.
`)
        process.exit(0)
    }
  }

  return config
}

/**
 * Fetch shots using the Dribbble API (authenticated user's shots only)
 */
async function fetchFromAPI(accessToken, config) {
  const params = new URLSearchParams({
    page: config.page.toString(),
    per_page: Math.min(config.limit, 30).toString() // API max is 100, but 30 is typical
  })

  const url = `${API_BASE}/user/shots?${params}`
  console.log('[Dribbble API] Fetching your shots...')

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dribbble API error: ${response.status} - ${errorText}`)
  }

  const shots = await response.json()
  console.log(`[Dribbble API] Fetched ${shots.length} shots`)

  // Filter for pizza-related content if a query is specified
  if (config.query && config.query !== 'pizza') {
    const queryLower = config.query.toLowerCase()
    const filtered = shots.filter(shot => {
      const title = (shot.title || '').toLowerCase()
      const description = (shot.description || '').toLowerCase()
      const tags = (shot.tags || []).map(t => t.toLowerCase())
      return title.includes(queryLower) ||
             description.includes(queryLower) ||
             tags.some(t => t.includes(queryLower))
    })
    console.log(`[Dribbble API] Filtered to ${filtered.length} matching "${config.query}"`)
    return filtered
  }

  return shots
}

/**
 * Scrape Dribbble search results (public, no auth required)
 */
async function fetchFromScrape(config) {
  const url = `https://dribbble.com/search/${encodeURIComponent(config.query)}?page=${config.page}`
  console.log(`[Dribbble] Scraping search for "${config.query}" (page ${config.page})...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  })

  if (!response.ok) {
    throw new Error(`Dribbble scrape error: ${response.status}`)
  }

  const html = await response.text()
  const shots = []

  // Try to extract JSON data from the page
  // Dribbble embeds shot data in script tags
  const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const searchResults = data?.props?.pageProps?.shots ||
                           data?.props?.pageProps?.results?.shots ||
                           data?.props?.pageProps?.searchResults?.shots ||
                           []

      for (const shot of searchResults) {
        if (shot) {
          shots.push({
            id: shot.id || shot.hashId,
            title: shot.title,
            description: shot.description,
            html_url: shot.url || `https://dribbble.com/shots/${shot.id || shot.hashId}`,
            images: shot.images || { normal: shot.imageUrl, hidpi: shot.hdImageUrl },
            user: shot.user || { name: shot.userDisplayName, username: shot.username },
            likes_count: shot.likesCount || shot.likes_count || 0,
            views_count: shot.viewsCount || shot.views_count || 0,
            tags: shot.tags || []
          })
        }
      }
    } catch (e) {
      console.log('[Dribbble] Could not parse JSON data, falling back to HTML parsing')
    }
  }

  // Fallback: Parse HTML directly for shot cards
  if (shots.length === 0) {
    // Match shot elements from the search results page
    // Pattern: data-thumbnail-id="XXXXX" and associated image/title
    const shotRegex = /data-thumbnail-id="(\d+)"[\s\S]*?<img[^>]*src="([^"]*dribbble[^"]*)"[^>]*alt="([^"]*)"/g
    let match

    while ((match = shotRegex.exec(html)) !== null && shots.length < config.limit) {
      const [, id, imageUrl, title] = match
      if (imageUrl && !imageUrl.includes('placeholder')) {
        shots.push({
          id: id,
          title: title || 'Pizza Design',
          html_url: `https://dribbble.com/shots/${id}`,
          images: { normal: imageUrl },
          user: { name: 'Unknown Designer' },
          likes_count: 0
        })
      }
    }

    // Alternative pattern for newer Dribbble HTML structure
    if (shots.length === 0) {
      const altRegex = /href="(\/shots\/(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/g
      while ((match = altRegex.exec(html)) !== null && shots.length < config.limit) {
        const [, href, id, imageUrl, title] = match
        if (imageUrl && imageUrl.includes('cdn.dribbble.com')) {
          shots.push({
            id: id,
            title: title || 'Pizza Design',
            html_url: `https://dribbble.com${href}`,
            images: { normal: imageUrl },
            user: { name: 'Unknown Designer' },
            likes_count: 0
          })
        }
      }
    }

    // Third pattern: look for shot data in JSON-LD or other embedded data
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    if (ldJsonMatch && shots.length === 0) {
      for (const jsonStr of ldJsonMatch) {
        try {
          const cleanJson = jsonStr.replace(/<\/?script[^>]*>/g, '')
          const data = JSON.parse(cleanJson)
          if (data.image && data.name) {
            shots.push({
              id: data.url?.match(/shots\/(\d+)/)?.[1] || Date.now(),
              title: data.name,
              html_url: data.url,
              images: { normal: data.image },
              user: { name: data.author?.name || 'Unknown' },
              likes_count: 0
            })
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  console.log(`[Dribbble] Found ${shots.length} shots`)
  return shots.slice(0, config.limit)
}

/**
 * Transform a Dribbble shot to our content format
 */
function transformShot(shot) {
  if (!shot) return null

  // Get image URLs
  let imageUrl = null
  let thumbnailUrl = null

  if (shot.images) {
    // API format
    imageUrl = shot.images.hidpi || shot.images.normal || shot.images.teaser
    thumbnailUrl = shot.images.teaser || shot.images.normal
  }

  if (!imageUrl) return null

  // Get title
  let title = shot.title || 'Pizza Design'
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Get designer info
  const designer = shot.user?.name || shot.user?.username || 'Unknown Designer'
  const description = shot.description
    ? `${shot.description.slice(0, 150)}... - Design by ${designer} on Dribbble`
    : `Design by ${designer} on Dribbble`

  // Determine if viral based on likes
  const isViral = (shot.likes_count || 0) > 1000

  // Extract tags
  const tags = ['pizza', 'design', 'dribbble', 'art']
  if (shot.tags && Array.isArray(shot.tags)) {
    tags.push(...shot.tags.slice(0, 5).map(t => typeof t === 'string' ? t : t.name))
  }

  return {
    type: 'art', // Dribbble content is design/illustration art
    title: title.slice(0, 200),
    url: imageUrl,
    thumbnail_url: thumbnailUrl || imageUrl,
    source_url: shot.html_url || `https://dribbble.com/shots/${shot.id}`,
    source_platform: 'dribbble',
    description: description.slice(0, 500),
    is_viral: isViral,
    tags: [...new Set(tags)].slice(0, 10),
    // Metadata
    _designer: designer,
    _likes: shot.likes_count,
    _views: shot.views_count
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  console.log('\n=== Dribbble Pizza Importer ===\n')
  console.log(`Mode: ${config.useApi ? 'API (your shots)' : 'Scrape (public search)'}`)
  console.log(`Query: "${config.query}"`)
  console.log(`Page: ${config.page}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  // Check for API token if using API mode
  const accessToken = process.env.DRIBBBLE_ACCESS_TOKEN
  if (config.useApi && !accessToken) {
    console.error('Error: DRIBBBLE_ACCESS_TOKEN environment variable is required for API mode')
    console.error('Get an OAuth token at: https://dribbble.com/account/applications')
    console.error('\nAlternatively, use scraping mode (default) which does not require authentication:')
    console.error('  node scripts/import-dribbble.mjs --scrape')
    process.exit(1)
  }

  const sourceId = config.query.replace(/\s+/g, '-').toLowerCase()

  const importer = new ContentImporter({
    platform: 'dribbble',
    sourceIdentifier: sourceId,
    displayName: `Dribbble: ${config.query}`,
    // Dribbble API: 60 req/min; Scraping: be polite with 10 req/min
    rateLimiter: new RateLimiter({ requestsPerMinute: config.useApi ? 60 : 10 }),
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => config.useApi
        ? fetchFromAPI(accessToken, config)
        : fetchFromScrape(config),
      // Transform function
      transformShot
    )
  } catch (error) {
    console.error('[Dribbble] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
