#!/usr/bin/env node
/**
 * YouTube Importer
 *
 * Imports pizza-related videos from YouTube using the Data API v3.
 * Note: Videos are stored as links (not downloaded) due to YouTube's ToS.
 * When run with --all-stars flag, searches for content featuring Pizza All Stars.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-youtube.mjs
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-youtube.mjs --query "pizza making"
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-youtube.mjs --order viewCount
 *   SUPABASE_SERVICE_KEY=xxx YOUTUBE_API_KEY=xxx node scripts/import-youtube.mjs --all-stars
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'
import { getAllStarsSearchTerms } from './lib/all-stars.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 25
const API_BASE = 'https://www.googleapis.com/youtube/v3'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    limit: DEFAULT_LIMIT,
    order: 'relevance', // 'date', 'rating', 'relevance', 'title', 'viewCount'
    videoDuration: 'short', // 'any', 'short' (<4min), 'medium' (4-20min), 'long' (>20min)
    publishedAfter: null, // ISO 8601 date
    allStars: false,
    dryRun: false,
    pageToken: ''
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
      case '--page-token':
        config.pageToken = args[++i]
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
YouTube Pizza Importer

Usage:
  node scripts/import-youtube.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --limit, -l <n>         Number of videos to fetch (default: ${DEFAULT_LIMIT}, max: 50)
  --order, -o <type>      Order by: date, rating, relevance, title, viewCount (default: relevance)
  --duration, -d <type>   Video duration: any, short, medium, long (default: short)
  --after <date>          Only videos published after this ISO 8601 date
  --page-token <token>    Page token for pagination
  --all-stars, -a         Search for all Pizza All Stars (from database)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  YOUTUBE_API_KEY         Required. Get one at https://console.cloud.google.com/
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Examples:
  node scripts/import-youtube.mjs
  node scripts/import-youtube.mjs --query "pizza making" --order viewCount
  node scripts/import-youtube.mjs --query "pizza review" --duration medium
  node scripts/import-youtube.mjs --all-stars --limit 10
`)
        process.exit(0)
    }
  }

  return config
}

// Fetch videos from YouTube
async function fetchYouTube(apiKey, config) {
  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    q: config.query,
    maxResults: Math.min(config.limit, 50).toString(),
    order: config.order,
    videoDuration: config.videoDuration,
    videoEmbeddable: 'true',
    safeSearch: 'moderate'
  })

  if (config.publishedAfter) {
    params.set('publishedAfter', config.publishedAfter)
  }

  if (config.pageToken) {
    params.set('pageToken', config.pageToken)
  }

  const url = `${API_BASE}/search?${params}`
  console.log(`[YouTube] Searching for "${config.query}" (order: ${config.order})...`)

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`YouTube API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()

  // Log pagination token for next run
  if (data.nextPageToken) {
    console.log(`[YouTube] Next page token: ${data.nextPageToken}`)
  }

  return data.items || []
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
  let title = snippet.title || 'Pizza Video'
  // Decode HTML entities
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
    .slice(0, 500)

  return {
    type: 'video',
    title: title.slice(0, 200),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail_url: thumbnail?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    source_url: `https://www.youtube.com/watch?v=${videoId}`,
    source_platform: 'youtube',
    description: description || null,
    creator: snippet.channelTitle || null,
    is_viral: false, // Would need separate API call to get view count
    // Metadata for tagging
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

  console.log('\n=== YouTube Pizza Importer ===\n')

  // If --all-stars flag, fetch all search terms and run multiple queries
  if (config.allStars) {
    console.log('Mode: Pizza All Stars (multiple queries)')
    console.log(`Limit per query: ${config.limit}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const searchTerms = await getAllStarsSearchTerms()
    console.log(`Found ${searchTerms.length} search terms from All Stars\n`)

    const rateLimiter = new RateLimiter({ requestsPerMinute: 60 })

    for (const term of searchTerms) {
      console.log(`\n--- Searching for "${term}" ---\n`)

      const queryConfig = { ...config, query: term }
      const sourceId = term.replace(/\s+/g, '-').toLowerCase()

      const importer = new ContentImporter({
        platform: 'youtube',
        sourceIdentifier: sourceId,
        displayName: `YouTube: ${term}`,
        rateLimiter,
        dryRun: config.dryRun
      })

      try {
        await importer.run(
          async () => fetchYouTube(apiKey, queryConfig),
          transformVideo
        )
      } catch (error) {
        console.error(`[YouTube] Error for "${term}":`, error.message)
        // Continue with next term
      }

      // Small delay between queries
      await new Promise(r => setTimeout(r, 1000))
    }
  } else {
    // Single query mode
    console.log(`Query: "${config.query}"`)
    console.log(`Order: ${config.order}, Duration: ${config.videoDuration}, Limit: ${config.limit}`)
    if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

    const sourceId = config.query.replace(/\s+/g, '-').toLowerCase()

    const importer = new ContentImporter({
      platform: 'youtube',
      sourceIdentifier: sourceId,
      displayName: `YouTube: ${config.query}`,
      rateLimiter: new RateLimiter({ requestsPerMinute: 60 }), // YouTube quota is per day, not per minute
      dryRun: config.dryRun
    })

    try {
      await importer.run(
        // Fetch function
        async () => fetchYouTube(apiKey, config),
        // Transform function
        transformVideo
      )
    } catch (error) {
      console.error('[YouTube] Error:', error.message)
      process.exit(1)
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
