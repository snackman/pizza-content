#!/usr/bin/env node
/**
 * YouTube Pizza Gaming Content Importer
 *
 * Imports pizza game-related videos from YouTube - gameplay, reviews, trailers.
 * This is a wrapper around the YouTube API specifically for gaming content.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-games-youtube.mjs
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-games-youtube.mjs --query "pizza tower gameplay"
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-games-youtube.mjs --all
 *
 * Note: Videos are stored as links (not downloaded) due to YouTube's ToS.
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_LIMIT = 25
const API_BASE = 'https://www.googleapis.com/youtube/v3'

// Predefined gaming search queries
const GAMING_QUERIES = [
  'pizza tower gameplay',
  'pizza tower speedrun',
  'good pizza great pizza gameplay',
  'pizza game review',
  'papa pizzeria flash game',
  'pizza connection game',
  'pizza simulator game',
  'cooking pizza game',
  'pizza tycoon gameplay'
]

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: null, // Will be set from GAMING_QUERIES or --query
    queries: [], // Multiple queries to run
    limit: DEFAULT_LIMIT,
    order: 'relevance',
    videoDuration: 'any', // Gaming videos can be long
    publishedAfter: null,
    dryRun: false,
    all: false // Run all predefined queries
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
      case '--order':
      case '-o':
        config.order = args[++i]
        break
      case '--duration':
      case '-d':
        config.videoDuration = args[++i]
        break
      case '--after':
        config.publishedAfter = args[++i]
        break
      case '--all':
      case '-a':
        config.all = true
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
YouTube Pizza Gaming Content Importer

Usage:
  node scripts/import-games-youtube.mjs [options]

Options:
  --query, -q <term>      Custom search query
  --all, -a               Run all predefined gaming queries
  --limit, -l <n>         Number of videos per query (default: ${DEFAULT_LIMIT}, max: 50)
  --order, -o <type>      Order by: date, rating, relevance, viewCount (default: relevance)
  --duration, -d <type>   Video duration: any, short, medium, long (default: any)
  --after <date>          Only videos published after this ISO 8601 date
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Predefined Gaming Queries:
${GAMING_QUERIES.map(q => `  - "${q}"`).join('\n')}

Environment:
  YOUTUBE_API_KEY         Required. Get one at https://console.cloud.google.com/
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-games-youtube.mjs --all
  node scripts/import-games-youtube.mjs --query "pizza tower gameplay"
  node scripts/import-games-youtube.mjs --query "indie pizza game" --order viewCount
`)
        process.exit(0)
    }
  }

  // Determine which queries to run
  if (config.all) {
    config.queries = GAMING_QUERIES
  } else if (config.query) {
    config.queries = [config.query]
  } else {
    // Default to first gaming query
    config.queries = [GAMING_QUERIES[0]]
  }

  return config
}

// Fetch videos from YouTube
async function fetchYouTube(apiKey, query, config) {
  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: Math.min(config.limit, 50).toString(),
    order: config.order,
    videoDuration: config.videoDuration,
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    // Gaming category ID is 20
    videoCategoryId: '20'
  })

  if (config.publishedAfter) {
    params.set('publishedAfter', config.publishedAfter)
  }

  const url = `${API_BASE}/search?${params}`
  console.log(`[YouTube Gaming] Searching for "${query}" (order: ${config.order})...`)

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`YouTube API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.items || []
}

// Detect game name from title
function detectGameName(title) {
  const lowerTitle = title.toLowerCase()

  // Known pizza games
  const knownGames = [
    { pattern: /pizza tower/i, tag: 'pizza-tower' },
    { pattern: /good pizza.*great pizza/i, tag: 'good-pizza-great-pizza' },
    { pattern: /papa'?s? pizzeria/i, tag: 'papas-pizzeria' },
    { pattern: /pizza connection/i, tag: 'pizza-connection' },
    { pattern: /pizza tycoon/i, tag: 'pizza-tycoon' },
    { pattern: /pizza simulator/i, tag: 'pizza-simulator' },
    { pattern: /cooking (fever|mama|game)/i, tag: 'cooking-game' }
  ]

  for (const game of knownGames) {
    if (game.pattern.test(title)) {
      return game.tag
    }
  }

  return null
}

// Detect content type from title
function detectContentType(title) {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('speedrun')) return 'speedrun'
  if (lowerTitle.includes('walkthrough') || lowerTitle.includes('playthrough')) return 'walkthrough'
  if (lowerTitle.includes('review')) return 'review'
  if (lowerTitle.includes('trailer')) return 'trailer'
  if (lowerTitle.includes('let\'s play') || lowerTitle.includes('lets play')) return 'lets-play'
  if (lowerTitle.includes('gameplay')) return 'gameplay'
  if (lowerTitle.includes('guide') || lowerTitle.includes('tutorial')) return 'tutorial'
  if (lowerTitle.includes('boss') || lowerTitle.includes('ending')) return 'highlights'

  return 'gameplay' // Default for gaming content
}

// Transform YouTube response to content format
function transformVideo(video) {
  const snippet = video.snippet
  const videoId = video.id?.videoId

  if (!videoId || !snippet) {
    return null
  }

  // Get best available thumbnail
  const thumbnails = snippet.thumbnails
  const thumbnail = thumbnails.high || thumbnails.medium || thumbnails.default

  // Clean up title
  let title = snippet.title || 'Pizza Game Video'
  title = title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up description
  let description = snippet.description || ''
  description = description
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .slice(0, 400)

  // Build tags
  const tags = ['pizza', 'game', 'gaming', 'youtube']

  // Add game-specific tag if detected
  const gameName = detectGameName(title)
  if (gameName) {
    tags.push(gameName)
  }

  // Add content type tag
  const contentType = detectContentType(title)
  tags.push(contentType)

  return {
    type: 'game', // Using 'game' type for gaming content
    title: title.slice(0, 200),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail_url: thumbnail?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    source_url: `https://www.youtube.com/watch?v=${videoId}`,
    source_platform: 'youtube',
    description: description || null,
    is_viral: false, // Would need separate API call to get view count
    tags: [...new Set(tags)].slice(0, 10),
    // Metadata for logging
    _channelTitle: snippet.channelTitle,
    _publishedAt: snippet.publishedAt
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY environment variable is required')
    console.error('Get an API key at: https://console.cloud.google.com/')
    console.error('Enable "YouTube Data API v3" in the API Library')
    process.exit(1)
  }

  console.log('\n=== YouTube Pizza Gaming Importer ===\n')
  console.log(`Queries to run: ${config.queries.length}`)
  console.log(`Videos per query: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const rateLimiter = new RateLimiter({ requestsPerMinute: 30 })

  // Process each query
  for (const query of config.queries) {
    console.log(`\n--- Processing: "${query}" ---\n`)

    const sourceId = `games-youtube-${query.replace(/\s+/g, '-').toLowerCase()}`

    const importer = new ContentImporter({
      platform: 'youtube',
      sourceIdentifier: sourceId,
      displayName: `YouTube Gaming: ${query}`,
      rateLimiter,
      dryRun: config.dryRun
    })

    try {
      await importer.run(
        // Fetch function
        async () => fetchYouTube(apiKey, query, config),
        // Transform function
        transformVideo
      )
    } catch (error) {
      console.error(`[YouTube Gaming] Error with query "${query}":`, error.message)
      // Continue with next query
    }

    // Brief pause between queries
    if (config.queries.indexOf(query) < config.queries.length - 1) {
      console.log('[YouTube Gaming] Waiting before next query...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n=== All Imports Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
