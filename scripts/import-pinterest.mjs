#!/usr/bin/env node
/**
 * Pinterest Importer
 *
 * Imports pizza-related pins from Pinterest using web scraping.
 * Pinterest doesn't have a public API (requires business account approval),
 * so this uses the undocumented search endpoint.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-pinterest.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-pinterest.mjs --query "pizza recipe"
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-pinterest.mjs --type art --dry-run
 *
 * Limitations:
 *   - No official API, relies on web scraping (may break if Pinterest changes)
 *   - Rate limiting required to avoid blocks
 *   - No authentication = limited access to public pins only
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 50
const DEFAULT_CONTENT_TYPE = 'photo' // 'photo' or 'art'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    contentType: DEFAULT_CONTENT_TYPE,
    bookmark: '', // For pagination
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
      case '--type':
      case '-t':
        config.contentType = args[++i]
        break
      case '--bookmark':
      case '-b':
        config.bookmark = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Pinterest Pizza Importer

Usage:
  node scripts/import-pinterest.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>         Number of pins to fetch (default: ${DEFAULT_LIMIT})
  --type, -t <type>       Content type: photo, art (default: ${DEFAULT_CONTENT_TYPE})
  --bookmark, -b <token>  Pagination bookmark for next page
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Content Types:
  photo   - Food photography, recipes (default)
  art     - Pizza artwork, illustrations, designs

Examples:
  node scripts/import-pinterest.mjs
  node scripts/import-pinterest.mjs --query "pizza recipe" --limit 100
  node scripts/import-pinterest.mjs --query "pizza art illustration" --type art
  node scripts/import-pinterest.mjs --query "pepperoni pizza" --dry-run

Limitations:
  - Uses web scraping (no official public API)
  - May break if Pinterest changes their site structure
  - Aggressive rate limiting to avoid blocks (5 req/min)
  - Public pins only (no authenticated access)
`)
        process.exit(0)
    }
  }

  return config
}

/**
 * Fetch Pinterest search results using the web scraping approach
 * Pinterest loads search results via a JSON endpoint
 */
async function fetchPinterestPins(query, limit, bookmark = '') {
  const allPins = []
  let currentBookmark = bookmark
  let attempts = 0
  const maxAttempts = 5

  while (allPins.length < limit && attempts < maxAttempts) {
    attempts++

    try {
      const pins = await fetchPinterestPage(query, currentBookmark)

      if (!pins || pins.length === 0) {
        console.log('[Pinterest] No more results found')
        break
      }

      // Filter for image pins only (exclude videos, products, etc)
      const imagePins = pins.filter(pin =>
        pin && pin.images && !pin.is_video && !pin.is_promoted
      )

      allPins.push(...imagePins)
      console.log(`[Pinterest] Fetched ${imagePins.length} pins (total: ${allPins.length})`)

      // Get next bookmark for pagination
      currentBookmark = pins._bookmark || ''
      if (!currentBookmark) {
        console.log('[Pinterest] No more pages available')
        break
      }

      // Rate limit between pages
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.log(`[Pinterest] Error fetching page: ${error.message}`)
      break
    }
  }

  return allPins.slice(0, limit)
}

/**
 * Fetch a single page of Pinterest search results
 */
async function fetchPinterestPage(query, bookmark = '') {
  // Pinterest uses a resource endpoint for search
  const searchParams = {
    source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
    data: JSON.stringify({
      options: {
        query: query,
        scope: 'pins',
        bookmarks: bookmark ? [bookmark] : [],
        field_set_key: 'unauth_react',
        no_fetch_context_on_resource: false
      },
      context: {}
    })
  }

  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?${new URLSearchParams(searchParams)}`

  console.log(`[Pinterest] Searching for "${query}"...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.pinterest.com/',
      'Origin': 'https://www.pinterest.com'
    }
  })

  if (!response.ok) {
    // Try alternate HTML scraping method
    console.log(`[Pinterest] API returned ${response.status}, trying HTML scraping...`)
    return fetchPinterestFromHTML(query)
  }

  const data = await response.json()

  // Extract pins from response
  const results = data?.resource_response?.data?.results || []
  const nextBookmark = data?.resource_response?.bookmark || ''

  // Attach bookmark to results for pagination
  results._bookmark = nextBookmark

  return results
}

/**
 * Fallback: Scrape Pinterest search page HTML
 */
async function fetchPinterestFromHTML(query) {
  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })

  if (!response.ok) {
    throw new Error(`Pinterest returned ${response.status}`)
  }

  const html = await response.text()

  // Look for embedded JSON data in the page
  const jsonMatch = html.match(/<script[^>]*id="__PWS_DATA__"[^>]*>([^<]+)<\/script>/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      // Navigate to pins in the data structure
      const pins = data?.props?.initialReduxState?.pins || {}
      return Object.values(pins).filter(p => p && p.images)
    } catch (e) {
      console.log('[Pinterest] Could not parse embedded JSON')
    }
  }

  // Alternative: Look for script data
  const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/)
  if (scriptMatch) {
    try {
      const state = JSON.parse(scriptMatch[1])
      const pins = state?.pins || state?.search?.pins || {}
      return Object.values(pins).filter(p => p && p.images)
    } catch (e) {
      console.log('[Pinterest] Could not parse initial state')
    }
  }

  return []
}

/**
 * Transform Pinterest pin to content format
 */
function transformPin(pin, contentType = 'photo') {
  if (!pin || !pin.images) {
    return null
  }

  // Get the best quality image
  const images = pin.images
  let imageUrl = null
  let thumbnailUrl = null

  // Pinterest image sizes: orig, 736x, 564x, 474x, 236x, 170x, 136x
  const sizes = ['orig', '736x', '564x', '474x']
  for (const size of sizes) {
    if (images[size]?.url) {
      if (!imageUrl) imageUrl = images[size].url
      break
    }
  }

  // Thumbnail (smaller size)
  const thumbSizes = ['236x', '170x', '136x']
  for (const size of thumbSizes) {
    if (images[size]?.url) {
      thumbnailUrl = images[size].url
      break
    }
  }

  if (!imageUrl) return null

  // Get title and description
  let title = pin.title || pin.grid_title || ''
  if (!title && pin.description) {
    // Use first sentence of description as title
    title = pin.description.split(/[.!?]/)[0].trim()
  }
  if (!title) {
    title = 'Pizza Pin'
  }

  // Clean up title
  title = title
    .replace(/\s+/g, ' ')
    .replace(/[#@]\w+/g, '') // Remove hashtags/mentions
    .trim()
    .slice(0, 200)

  // Capitalize first letter
  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  // Build source URL
  const pinId = pin.id || pin.native_pin_id
  const sourceUrl = pin.link || `https://www.pinterest.com/pin/${pinId}/`

  // Extract description
  let description = pin.description || pin.closeup_description || ''
  if (description) {
    description = description.slice(0, 500)
  }

  // Determine if likely art vs photo based on content
  const isArt = contentType === 'art' ||
    /\b(art|illustration|drawing|cartoon|design|vector|artwork|anime|painting)\b/i.test(title + ' ' + description)

  // Extract pinner info for attribution
  const pinner = pin.pinner?.username || pin.pinner?.full_name || ''
  if (pinner && !description) {
    description = `Pinned by ${pinner} on Pinterest`
  }

  // Determine viral status based on repin count
  const repinCount = pin.repin_count || pin.aggregated_pin_data?.aggregated_stats?.saves || 0
  const isViral = repinCount > 1000

  return {
    type: isArt ? 'art' : 'photo',
    title: title || 'Pizza Pin',
    url: imageUrl,
    thumbnail_url: thumbnailUrl || imageUrl,
    source_url: sourceUrl,
    source_platform: 'pinterest',
    description: description || null,
    is_viral: isViral,
    // Metadata for auto-tagging
    _repinCount: repinCount,
    _pinner: pinner,
    _domain: pin.domain || '',
    _board: pin.board?.name || ''
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  console.log('\n=== Pinterest Pizza Importer ===\n')
  console.log(`Query: "${config.query}"`)
  console.log(`Content Type: ${config.contentType}`)
  console.log(`Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  // Adjust query for art content
  let searchQuery = config.query
  if (config.contentType === 'art' && !config.query.includes('art')) {
    searchQuery = `${config.query} art illustration`
    console.log(`Adjusted query for art: "${searchQuery}"`)
  }

  const sourceId = `${config.contentType}-${config.query.replace(/\s+/g, '-').toLowerCase()}`

  const importer = new ContentImporter({
    platform: 'pinterest',
    sourceIdentifier: sourceId,
    displayName: `Pinterest ${config.contentType}: ${config.query}`,
    // Very conservative rate limiting to avoid blocks
    rateLimiter: new RateLimiter({ requestsPerMinute: 5 }),
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => fetchPinterestPins(searchQuery, config.limit, config.bookmark),
      // Transform function
      (pin) => transformPin(pin, config.contentType)
    )
  } catch (error) {
    console.error('[Pinterest] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
  console.log('Note: Pinterest scraping may be unreliable. If no pins were imported,')
  console.log('Pinterest may have changed their site structure or blocked the request.')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
