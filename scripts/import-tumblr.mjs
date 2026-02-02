#!/usr/bin/env node
/**
 * Tumblr Importer
 *
 * Imports pizza-related content from Tumblr (memes, fan art, GIFs, photos).
 * Uses Tumblr's API v2 with API key authentication.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx TUMBLR_API_KEY=xxx node scripts/import-tumblr.mjs
 *   SUPABASE_SERVICE_KEY=xxx TUMBLR_API_KEY=xxx node scripts/import-tumblr.mjs --tag "pizza"
 *   SUPABASE_SERVICE_KEY=xxx TUMBLR_API_KEY=xxx node scripts/import-tumblr.mjs --tag "pizza art" --limit 50
 *
 * Environment:
 *   TUMBLR_API_KEY       Required. Your Tumblr OAuth Consumer Key (API key).
 *                        Register at: https://www.tumblr.com/oauth/apps
 *   SUPABASE_SERVICE_KEY Required. Supabase service role key.
 */

import { ContentImporter, detectContentType } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Default configuration
const DEFAULT_TAGS = ['pizza', 'pizza meme', 'pizza art', 'pizzatime', 'pizza gif']
const DEFAULT_LIMIT = 20
const API_BASE = 'https://api.tumblr.com/v2'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    tags: [...DEFAULT_TAGS],
    limit: DEFAULT_LIMIT,
    before: null, // Unix timestamp for pagination
    filter: 'text', // 'text', 'raw', or 'html'
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tag':
      case '-t':
        config.tags = [args[++i]]
        break
      case '--tags':
        config.tags = args[++i].split(',').map(t => t.trim())
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--before':
      case '-b':
        config.before = parseInt(args[++i], 10)
        break
      case '--filter':
      case '-f':
        config.filter = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Tumblr Pizza Importer

Usage:
  node scripts/import-tumblr.mjs [options]

Options:
  --tag, -t <tag>       Search for a single tag (default: cycles through pizza-related tags)
  --tags <a,b,c>        Search for multiple tags (comma-separated)
  --limit, -l <n>       Number of posts to fetch per tag (default: ${DEFAULT_LIMIT})
  --before, -b <ts>     Unix timestamp for pagination (fetch posts before this time)
  --filter, -f <type>   Post format: text, raw, html (default: text)
  --dry-run             Show what would be imported without saving
  --help, -h            Show this help message

Environment:
  TUMBLR_API_KEY        Required. Your Tumblr OAuth Consumer Key.
                        Register at: https://www.tumblr.com/oauth/apps
  SUPABASE_SERVICE_KEY  Required. Supabase service role key.

Default Tags: ${DEFAULT_TAGS.join(', ')}

Examples:
  node scripts/import-tumblr.mjs
  node scripts/import-tumblr.mjs --tag "pizza art" --limit 50
  node scripts/import-tumblr.mjs --tags "pizza,pizza meme,pizza gif" --dry-run
`)
        process.exit(0)
    }
  }

  return config
}

/**
 * Fetch posts tagged with a specific tag from Tumblr
 */
async function fetchTaggedPosts(apiKey, tag, { limit, before, filter }) {
  const params = new URLSearchParams({
    tag,
    api_key: apiKey,
    limit: Math.min(limit, 20).toString(), // Tumblr limits to 20 per request
    filter
  })

  if (before) {
    params.append('before', before.toString())
  }

  const url = `${API_BASE}/tagged?${params}`
  console.log(`[Tumblr] Fetching posts tagged "${tag}"...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PizzaContentBot/1.0 (pizza content importer)'
    }
  })

  if (!response.ok) {
    // Handle rate limiting
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Try again later.`)
    }

    const errorText = await response.text()
    throw new Error(`Tumblr API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()

  if (data.meta?.status !== 200) {
    throw new Error(`Tumblr API error: ${data.meta?.msg || 'Unknown error'}`)
  }

  return data.response || []
}

/**
 * Extract media from a Tumblr post based on its type
 * Tumblr has different post types: photo, video, text, quote, link, chat, audio, answer
 */
function extractMedia(post) {
  const media = {
    url: null,
    thumbnail_url: null,
    type: 'meme' // Default content type
  }

  // Check for NPF content blocks first (new format)
  if (post.content && Array.isArray(post.content)) {
    for (const block of post.content) {
      if (block.type === 'image' && block.media) {
        // Get the best quality image
        const bestMedia = block.media.reduce((best, current) => {
          if (!best || (current.width > best.width)) return current
          return best
        }, null)

        if (bestMedia) {
          media.url = bestMedia.url
          // Get a smaller version for thumbnail
          const thumbMedia = block.media.find(m => m.width <= 500) || bestMedia
          media.thumbnail_url = thumbMedia.url

          // Check if it's a GIF
          if (bestMedia.url?.toLowerCase().includes('.gif') || block.media.some(m => m.type === 'image/gif')) {
            media.type = 'gif'
          }
          return media
        }
      }

      if (block.type === 'video') {
        if (block.media?.url) {
          media.url = block.media.url
          media.thumbnail_url = block.poster?.[0]?.url || null
          media.type = 'video'
          return media
        }
        if (block.url) {
          media.url = block.url
          media.type = 'video'
          return media
        }
      }
    }
  }

  // Legacy format - Photo posts
  if (post.type === 'photo' && post.photos) {
    const photo = post.photos[0]
    if (photo?.original_size?.url) {
      media.url = photo.original_size.url

      // Find a smaller alt size for thumbnail
      const thumbSize = photo.alt_sizes?.find(s => s.width <= 500) || photo.original_size
      media.thumbnail_url = thumbSize.url

      // Check if GIF
      if (media.url.toLowerCase().includes('.gif')) {
        media.type = 'gif'
      }
      return media
    }
  }

  // Legacy format - Video posts
  if (post.type === 'video') {
    // Native Tumblr video
    if (post.video_url) {
      media.url = post.video_url
      media.thumbnail_url = post.thumbnail_url || null
      media.type = 'video'
      return media
    }
    // Embedded video (YouTube, etc.)
    if (post.permalink_url) {
      media.url = post.permalink_url
      media.thumbnail_url = post.thumbnail_url || null
      media.type = 'video'
      return media
    }
  }

  // Legacy format - Text posts might have images in body
  if (post.type === 'text' && post.body) {
    // Try to extract image URL from HTML body
    const imgMatch = post.body.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch) {
      media.url = imgMatch[1]
      media.thumbnail_url = imgMatch[1]
      if (media.url.toLowerCase().includes('.gif')) {
        media.type = 'gif'
      }
      return media
    }
  }

  return media
}

/**
 * Transform a Tumblr post to our content format
 */
function transformPost(post, tag) {
  // Skip posts without the required data
  if (!post || !post.blog_name) {
    return null
  }

  // Extract media from post
  const media = extractMedia(post)

  // Skip if no media URL found
  if (!media.url) {
    return null
  }

  // Build title from various sources
  let title = post.summary || post.caption_abstract || ''

  // Clean up HTML entities and tags from title
  title = title
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n+/g, ' ')
    .trim()

  // If no title, create one from context
  if (!title) {
    const typeLabel = media.type === 'gif' ? 'GIF' : media.type === 'video' ? 'Video' : 'Post'
    title = `Pizza ${typeLabel} by ${post.blog_name}`
  }

  // Truncate title
  title = title.slice(0, 200)

  // Build description from post content
  let description = ''
  if (post.caption) {
    description = post.caption
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .slice(0, 500)
  }

  // Get tags from post
  const postTags = post.tags || []

  // Determine content type based on tags and media
  let contentType = media.type
  if (contentType === 'meme') {
    // Check tags to refine type
    const tagString = postTags.join(' ').toLowerCase()
    if (tagString.includes('art') || tagString.includes('fanart') || tagString.includes('drawing') || tagString.includes('illustration')) {
      contentType = 'art'
    } else if (tagString.includes('photo') || tagString.includes('photography')) {
      contentType = 'photo'
    }
  }

  // Check if it's viral (high note count)
  const isViral = (post.note_count || 0) > 1000

  return {
    type: contentType,
    title,
    url: media.url,
    thumbnail_url: media.thumbnail_url || media.url,
    source_url: post.post_url || `https://${post.blog_name}.tumblr.com/post/${post.id}`,
    source_platform: 'tumblr',
    description: description || null,
    is_viral: isViral,
    tags: ['pizza', ...postTags.slice(0, 5).map(t => t.toLowerCase())],
    // Metadata for logging
    _note_count: post.note_count,
    _blog_name: post.blog_name,
    _original_tag: tag
  }
}

/**
 * Main import function
 */
async function main() {
  const config = parseArgs()

  const apiKey = process.env.TUMBLR_API_KEY
  if (!apiKey) {
    console.error('Error: TUMBLR_API_KEY environment variable is required')
    console.error('Register an application at: https://www.tumblr.com/oauth/apps')
    process.exit(1)
  }

  console.log('\n=== Tumblr Pizza Importer ===\n')
  console.log(`Tags: ${config.tags.join(', ')}`)
  console.log(`Limit per tag: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  // Tumblr rate limit: ~60 requests per minute, but be conservative
  const rateLimiter = new RateLimiter({ requestsPerMinute: 30 })

  for (const tag of config.tags) {
    console.log(`\n--- Importing tag: "${tag}" ---\n`)

    const sourceIdentifier = tag.replace(/\s+/g, '-').toLowerCase()

    const importer = new ContentImporter({
      platform: 'tumblr',
      sourceIdentifier,
      displayName: `Tumblr: #${tag}`,
      rateLimiter,
      dryRun: config.dryRun
    })

    try {
      // Fetch multiple pages if needed
      let allPosts = []
      let before = config.before
      let remaining = config.limit

      while (remaining > 0) {
        const batchSize = Math.min(remaining, 20) // Tumblr max is 20
        const posts = await rateLimiter.execute(
          () => fetchTaggedPosts(apiKey, tag, { limit: batchSize, before, filter: config.filter }),
          `fetch-${tag}`
        )

        if (!posts || posts.length === 0) {
          break
        }

        allPosts = allPosts.concat(posts)
        remaining -= posts.length

        // Get timestamp for pagination (use featured_timestamp for featured tags, otherwise timestamp)
        const lastPost = posts[posts.length - 1]
        before = lastPost.featured_timestamp || lastPost.timestamp

        // Small delay between pages
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`[Tumblr] Fetched ${allPosts.length} posts for tag "${tag}"`)

      await importer.run(
        // Fetch function (already fetched)
        async () => allPosts,
        // Transform function
        (post) => transformPost(post, tag)
      )
    } catch (error) {
      console.error(`[Tumblr] Error importing tag "${tag}":`, error.message)

      // If rate limited, wait and continue with next tag
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.log('[Tumblr] Rate limited, waiting 60 seconds before next tag...')
        await new Promise(resolve => setTimeout(resolve, 60000))
      }
    }
  }

  console.log('\n=== Import Complete ===\n')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
