#!/usr/bin/env node
/**
 * Know Your Meme Scraper - Scrapes pizza memes
 * Usage: node scripts/import-knowyourmeme.mjs
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

async function fetchKYMPage(query = 'pizza', page = 1) {
  const url = `https://knowyourmeme.com/search?context=images&sort=relevance&q=${encodeURIComponent(query)}&page=${page}`

  console.log(`[KYM] Fetching page ${page}...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`KYM error: ${response.status}`)
  }

  const html = await response.text()
  const results = []

  // Match photo entries
  const photoRegex = /<a[^>]*class="photo"[^>]*href="([^"]*)"[^>]*style="background-image:\s*url\(([^)]+)\)"/g
  let match

  while ((match = photoRegex.exec(html)) !== null) {
    const [, href, imageUrl] = match
    if (imageUrl && !imageUrl.includes('blank.gif')) {
      results.push({
        url: imageUrl.replace(/\?.*$/, ''),
        source_url: href.startsWith('http') ? href : `https://knowyourmeme.com${href}`,
        title: 'Pizza Meme'
      })
    }
  }

  // Also try img tags with data-src
  const imgRegex = /<img[^>]*data-src="([^"]*)"[^>]*alt="([^"]*)"/g
  while ((match = imgRegex.exec(html)) !== null) {
    const [, src, alt] = match
    if (src && src.includes('kym-assets') && !results.find(r => r.url === src)) {
      results.push({
        url: src,
        source_url: url,
        title: alt || 'Pizza Meme'
      })
    }
  }

  console.log(`[KYM] Found ${results.length} images`)
  return results
}

function transformItem(item) {
  if (!item.url || item.url.includes('blank.gif')) return null

  return {
    type: 'meme',
    title: (item.title || 'Pizza Meme').slice(0, 200),
    url: item.url,
    thumbnail_url: item.url,
    source_url: item.source_url,
    source_platform: 'knowyourmeme',
    tags: ['pizza', 'meme', 'knowyourmeme'],
    status: 'approved'
  }
}

async function main() {
  console.log('\n=== Know Your Meme Pizza Scraper ===\n')

  const importer = new ContentImporter({
    platform: 'knowyourmeme',
    sourceIdentifier: 'pizza-search',
    displayName: 'Know Your Meme Pizza',
    rateLimiter: new RateLimiter({ requestsPerMinute: 10 })
  })

  try {
    for (let page = 1; page <= 3; page++) {
      await importer.run(
        () => fetchKYMPage('pizza', page),
        transformItem
      )
      await new Promise(r => setTimeout(r, 2000))
    }
  } catch (error) {
    console.error('[KYM] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Scrape Complete ===\n')
}

main().catch(console.error)
