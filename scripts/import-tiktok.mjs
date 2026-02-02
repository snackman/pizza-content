#!/usr/bin/env node
/**
 * TikTok Importer
 *
 * Imports pizza-related viral videos from TikTok.
 *
 * API Options:
 * 1. RapidAPI TikTok APIs (recommended) - Freemium, easy to set up
 *    - Get an API key at: https://rapidapi.com/h0p3rwe/api/tiktok-all-in-one
 *    - Set RAPIDAPI_KEY environment variable
 *
 * 2. Official TikTok API (requires business approval)
 *    - Apply at: https://developers.tiktok.com/
 *    - Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET
 *
 * Note: TikTok videos are stored as embed URLs (not downloaded) due to ToS.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx RAPIDAPI_KEY=xxx node scripts/import-tiktok.mjs
 *   SUPABASE_SERVICE_KEY=xxx RAPIDAPI_KEY=xxx node scripts/import-tiktok.mjs --query "pizza recipe"
 *   SUPABASE_SERVICE_KEY=xxx RAPIDAPI_KEY=xxx node scripts/import-tiktok.mjs --hashtag pizzatok
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_QUERY = 'pizza'
const DEFAULT_LIMIT = 20
const DEFAULT_HASHTAG = null

// RapidAPI TikTok All-in-One endpoints
const RAPIDAPI_HOST = 'tiktok-all-in-one.p.rapidapi.com'
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    query: DEFAULT_QUERY,
    hashtag: DEFAULT_HASHTAG,
    limit: DEFAULT_LIMIT,
    country: 'us',
    sortBy: 'relevance', // 'relevance', 'likes', 'date'
    minViews: 10000, // Filter for viral content
    dryRun: false,
    cursor: ''
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
      case '-q':
        config.query = args[++i]
        config.hashtag = null // Query takes precedence
        break
      case '--hashtag':
      case '-t':
        config.hashtag = args[++i]?.replace(/^#/, '') // Remove # if present
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--country':
      case '-c':
        config.country = args[++i]
        break
      case '--sort':
      case '-s':
        config.sortBy = args[++i]
        break
      case '--min-views':
        config.minViews = parseInt(args[++i], 10)
        break
      case '--cursor':
        config.cursor = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
TikTok Pizza Importer

Usage:
  node scripts/import-tiktok.mjs [options]

Options:
  --query, -q <term>      Search query (default: "${DEFAULT_QUERY}")
  --hashtag, -t <tag>     Search by hashtag instead of query (e.g., "pizzatok")
  --limit, -l <n>         Number of videos to fetch (default: ${DEFAULT_LIMIT})
  --country, -c <code>    Country code for search (default: us)
  --sort, -s <type>       Sort by: relevance, likes, date (default: relevance)
  --min-views <n>         Minimum views for viral filter (default: 10000)
  --cursor <token>        Cursor for pagination (from previous run)
  --dry-run               Show what would be imported without saving
  --help, -h              Show this help message

Environment:
  RAPIDAPI_KEY            Required. Get one at https://rapidapi.com/
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Popular Pizza Hashtags:
  #pizza #pizzalover #pizzatime #pizzatok #pizzarecipe
  #homemadepizza #pizzafail #pizzareview #nycpizza #italianpizza

Examples:
  node scripts/import-tiktok.mjs
  node scripts/import-tiktok.mjs --query "pizza making tutorial"
  node scripts/import-tiktok.mjs --hashtag pizzatok --min-views 100000
  node scripts/import-tiktok.mjs --hashtag pizzafail --sort likes
`)
        process.exit(0)
    }
  }

  return config
}

/**
 * Fetch videos from TikTok via RapidAPI
 */
async function fetchTikTokVideos(apiKey, config) {
  const headers = {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': RAPIDAPI_HOST
  }

  let url
  let searchType

  if (config.hashtag) {
    // Search by hashtag/challenge
    searchType = 'hashtag'
    url = `${RAPIDAPI_BASE}/challenge/posts?challenge_name=${encodeURIComponent(config.hashtag)}&count=${config.limit}`
    if (config.cursor) {
      url += `&cursor=${config.cursor}`
    }
    console.log(`[TikTok] Searching hashtag #${config.hashtag}...`)
  } else {
    // Search by keyword
    searchType = 'search'
    url = `${RAPIDAPI_BASE}/search/video?keyword=${encodeURIComponent(config.query)}&count=${config.limit}&region=${config.country}`
    if (config.cursor) {
      url += `&cursor=${config.cursor}`
    }
    console.log(`[TikTok] Searching for "${config.query}"...`)
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorText = await response.text()

    // Check for common RapidAPI errors
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid or missing RAPIDAPI_KEY. Get one at https://rapidapi.com/')
    }
    if (response.status === 429) {
      throw new Error('Rate limited by TikTok API. Try again later or upgrade your RapidAPI plan.')
    }

    throw new Error(`TikTok API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Log cursor for pagination
  if (data.cursor || data.hasMore) {
    console.log(`[TikTok] Next cursor: ${data.cursor || 'use offset'}`)
    console.log(`[TikTok] Has more: ${data.hasMore}`)
  }

  // Handle different response formats from different endpoints
  let videos = []

  if (data.data?.videos) {
    videos = data.data.videos
  } else if (data.data?.posts) {
    videos = data.data.posts
  } else if (data.videos) {
    videos = data.videos
  } else if (data.posts) {
    videos = data.posts
  } else if (data.itemList) {
    videos = data.itemList
  } else if (Array.isArray(data.data)) {
    videos = data.data
  } else if (Array.isArray(data)) {
    videos = data
  }

  // Filter by minimum views for viral content
  if (config.minViews > 0) {
    const beforeFilter = videos.length
    videos = videos.filter(v => {
      const views = v.playCount || v.play_count || v.stats?.playCount || 0
      return views >= config.minViews
    })
    console.log(`[TikTok] Filtered ${beforeFilter} -> ${videos.length} videos (min ${config.minViews} views)`)
  }

  return videos
}

/**
 * Transform TikTok video response to content format
 */
function transformVideo(video) {
  // Handle various TikTok API response formats
  const videoId = video.id || video.video_id || video.aweme_id

  if (!videoId) {
    return null
  }

  // Extract video statistics
  const stats = video.stats || video.statistics || {}
  const playCount = video.playCount || video.play_count || stats.playCount || stats.play_count || 0
  const likeCount = video.diggCount || video.digg_count || stats.diggCount || stats.likeCount || 0
  const shareCount = video.shareCount || video.share_count || stats.shareCount || 0
  const commentCount = video.commentCount || video.comment_count || stats.commentCount || 0

  // Extract author info
  const author = video.author || video.authorMeta || {}
  const authorName = author.nickname || author.uniqueId || author.unique_id || 'Unknown'
  const authorUsername = author.uniqueId || author.unique_id || author.id || ''

  // Extract video description/title
  let title = video.desc || video.description || video.title || ''
  // Clean up and truncate
  title = title
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)

  if (!title) {
    title = `Pizza video by @${authorUsername}`
  }

  // Extract cover/thumbnail
  const cover = video.cover || video.video?.cover || video.video?.originCover
  const thumbnailUrl = typeof cover === 'string' ? cover :
    (cover?.url_list?.[0] || video.video?.dynamicCover || video.thumbnail_url || null)

  // Build TikTok URL
  const sourceUrl = `https://www.tiktok.com/@${authorUsername}/video/${videoId}`

  // TikTok embed URL format
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`

  // Extract hashtags from description
  const hashtagMatches = (video.desc || '').match(/#\w+/g) || []
  const hashtags = hashtagMatches.map(h => h.slice(1).toLowerCase())

  // Determine if viral (>100k views)
  const isViral = playCount >= 100000

  // Extract duration
  const duration = video.duration || video.video?.duration || null

  return {
    type: 'video',
    title: title,
    url: embedUrl, // Use embed URL for display
    thumbnail_url: thumbnailUrl,
    source_url: sourceUrl, // Original TikTok link
    source_platform: 'tiktok',
    description: video.desc?.slice(0, 500) || null,
    is_viral: isViral,
    tags: hashtags.length > 0 ? hashtags : ['pizza', 'tiktok'],
    // Metadata for logging
    _authorName: authorName,
    _authorUsername: authorUsername,
    _playCount: playCount,
    _likeCount: likeCount,
    _shareCount: shareCount,
    _commentCount: commentCount,
    _duration: duration
  }
}

/**
 * Alternative: Fetch from official TikTok API (requires approval)
 */
async function fetchTikTokOfficial(clientKey, clientSecret, config) {
  // Step 1: Get access token
  const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  })

  if (!tokenResponse.ok) {
    throw new Error('Failed to authenticate with TikTok API')
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  // Step 2: Search videos (Note: Official API has limited search capabilities)
  const searchResponse = await fetch(
    `https://open.tiktokapis.com/v2/research/video/query/?fields=id,video_description,create_time,username,like_count,view_count,share_count`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          and: [
            { operation: 'IN', field_name: 'keyword', field_values: [config.query] }
          ]
        },
        max_count: config.limit
      })
    }
  )

  if (!searchResponse.ok) {
    throw new Error('TikTok search failed - ensure Research API access is approved')
  }

  const searchData = await searchResponse.json()
  return searchData.data?.videos || []
}

// Main import function
async function main() {
  const config = parseArgs()

  // Check for API credentials
  const rapidApiKey = process.env.RAPIDAPI_KEY
  const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY
  const tiktokClientSecret = process.env.TIKTOK_CLIENT_SECRET

  const useOfficialApi = tiktokClientKey && tiktokClientSecret && !rapidApiKey

  if (!rapidApiKey && !useOfficialApi) {
    console.error('Error: API credentials required')
    console.error('')
    console.error('Option 1 (Recommended): RapidAPI')
    console.error('  RAPIDAPI_KEY=xxx node scripts/import-tiktok.mjs')
    console.error('  Get a key at: https://rapidapi.com/h0p3rwe/api/tiktok-all-in-one')
    console.error('')
    console.error('Option 2: Official TikTok API (requires approval)')
    console.error('  TIKTOK_CLIENT_KEY=xxx TIKTOK_CLIENT_SECRET=xxx node scripts/import-tiktok.mjs')
    console.error('  Apply at: https://developers.tiktok.com/')
    process.exit(1)
  }

  console.log('\n=== TikTok Pizza Importer ===\n')

  if (config.hashtag) {
    console.log(`Hashtag: #${config.hashtag}`)
  } else {
    console.log(`Query: "${config.query}"`)
  }
  console.log(`Country: ${config.country}, Limit: ${config.limit}, Min Views: ${config.minViews}`)
  console.log(`API: ${useOfficialApi ? 'Official TikTok API' : 'RapidAPI'}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const sourceId = config.hashtag
    ? `hashtag-${config.hashtag}`
    : config.query.replace(/\s+/g, '-').toLowerCase()

  const importer = new ContentImporter({
    platform: 'tiktok',
    sourceIdentifier: sourceId,
    displayName: config.hashtag
      ? `TikTok: #${config.hashtag}`
      : `TikTok: ${config.query}`,
    rateLimiter: new RateLimiter({
      requestsPerMinute: 10, // TikTok is strict about rate limiting
      maxRetries: 3,
      baseDelay: 2000 // 2 second base delay between retries
    }),
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function
      async () => {
        if (useOfficialApi) {
          return fetchTikTokOfficial(tiktokClientKey, tiktokClientSecret, config)
        } else {
          return fetchTikTokVideos(rapidApiKey, config)
        }
      },
      // Transform function
      transformVideo
    )
  } catch (error) {
    console.error('[TikTok] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
