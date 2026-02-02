#!/usr/bin/env node
/**
 * 9GAG Scraper - Scrapes pizza content from 9GAG
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-9gag.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-9gag.mjs --tag pizza
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-9gag.mjs --dry-run
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

const DEFAULT_TAG = 'pizza'
const DEFAULT_LIMIT = 50

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    tag: DEFAULT_TAG,
    limit: DEFAULT_LIMIT,
    type: 'hot',
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tag':
      case '-t':
        config.tag = args[++i]
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--type':
        config.type = args[++i]
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
9GAG Pizza Scraper

Usage:
  node scripts/import-9gag.mjs [options]

Options:
  --tag, -t <tag>       Tag to fetch (default: "${DEFAULT_TAG}")
  --limit, -l <n>       Number of posts to fetch (default: ${DEFAULT_LIMIT})
  --type <type>         Post type: hot, trending, fresh (default: hot)
  --dry-run             Show what would be imported without saving
  --help, -h            Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.
`)
        process.exit(0)
    }
  }

  return config
}

async function fetch9GAGPosts(tag = 'pizza', type = 'hot', cursor = '') {
  const url = cursor
    ? `https://9gag.com/v1/tag-posts/tag/${encodeURIComponent(tag)}/type/${type}?${cursor}`
    : `https://9gag.com/v1/tag-posts/tag/${encodeURIComponent(tag)}/type/${type}`

  console.log(`[9GAG] Fetching ${tag} posts (${type})...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    console.log(`[9GAG] API returned ${response.status}, trying HTML scraping...`)
    return fetch9GAGFromHTML(tag)
  }

  const data = await response.json()
  return data.data?.posts || []
}

async function fetch9GAGFromHTML(tag) {
  const url = `https://9gag.com/tag/${encodeURIComponent(tag)}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) return []

  const html = await response.text()

  const jsonMatch = html.match(/window\._config\s*=\s*JSON\.parse\("([^"]+)"\)/)
  if (jsonMatch) {
    try {
      const config = JSON.parse(jsonMatch[1].replace(/\\"/g, '"'))
      return config.data?.posts || []
    } catch (e) {
      console.log('[9GAG] Could not parse config')
    }
  }

  return []
}

function transformPost(post) {
  if (!post) return null

  let imageUrl = null
  let type = 'meme'

  if (post.images?.image700?.url) {
    imageUrl = post.images.image700.url
  } else if (post.images?.image460?.url) {
    imageUrl = post.images.image460.url
  }

  if (post.type === 'Animated' || post.images?.image460sv) {
    if (post.images?.image460sv?.url) {
      imageUrl = post.images.image460sv.url
      type = 'gif'
    }
  }

  if (!imageUrl) return null

  return {
    type,
    title: (post.title || 'Pizza Post').slice(0, 200),
    url: imageUrl,
    thumbnail_url: post.images?.imageFbThumbnail?.url || imageUrl,
    source_url: post.url || `https://9gag.com/gag/${post.id}`,
    source_platform: '9gag',
    tags: ['pizza', '9gag', ...(post.tags?.map(t => t.key) || [])].slice(0, 10),
    status: 'approved',
    is_viral: (post.upVoteCount > 10000)
  }
}

async function main() {
  const config = parseArgs()

  console.log('\n=== 9GAG Pizza Scraper ===\n')
  console.log(`Tag: ${config.tag}, Type: ${config.type}, Limit: ${config.limit}`)
  if (config.dryRun) console.log('DRY RUN MODE\n')

  const importer = new ContentImporter({
    platform: '9gag',
    sourceIdentifier: config.tag,
    displayName: `9GAG: ${config.tag}`,
    rateLimiter: new RateLimiter({ requestsPerMinute: 10 }),
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      async () => {
        const posts = await fetch9GAGPosts(config.tag, config.type)
        return posts.slice(0, config.limit)
      },
      transformPost
    )
  } catch (error) {
    console.error('[9GAG] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Scrape Complete ===\n')
}

main().catch(console.error)
