#!/usr/bin/env node

/**
 * Imgflip Pizza Meme Importer
 *
 * Imports pizza-related memes from Imgflip.
 * Note: Imgflip's API is limited - we search their meme templates and
 * can also import user-generated memes via their search.
 *
 * Usage:
 *   node scripts/import-imgflip.mjs                   # Import pizza memes
 *   node scripts/import-imgflip.mjs --limit 50       # Limit results
 *   node scripts/import-imgflip.mjs --dry-run        # Preview without importing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    limit: 50,
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        config.limit = parseInt(args[++i], 10)
        break
      case '--dry-run':
        config.dryRun = true
        break
    }
  }

  return config
}

// Imgflip doesn't have a search API, but we can scrape their search page
async function searchImgflip(query, limit = 50) {
  const searchUrl = `https://imgflip.com/ajax_meme_search_new?q=${encodeURIComponent(query)}&include_nsfw=0`

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  })

  if (!response.ok) {
    throw new Error(`Imgflip search error: ${response.status}`)
  }

  const html = await response.text()

  // Parse the meme results from HTML/JSON response
  const memes = []

  // Try to extract meme data from the response
  // Imgflip returns HTML with meme boxes
  const memeRegex = /data-meme-id="(\d+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/gi
  let match

  while ((match = memeRegex.exec(html)) !== null && memes.length < limit) {
    memes.push({
      id: match[1],
      url: match[2].startsWith('//') ? 'https:' + match[2] : match[2],
      name: match[3],
    })
  }

  // Also try getting popular meme templates that might be pizza-related
  if (memes.length < limit && query.toLowerCase().includes('pizza')) {
    const templatesResponse = await fetch('https://api.imgflip.com/get_memes')
    const templatesData = await templatesResponse.json()

    if (templatesData.success) {
      const pizzaTemplates = templatesData.data.memes.filter(m =>
        m.name.toLowerCase().includes('pizza')
      )

      for (const template of pizzaTemplates) {
        if (memes.length >= limit) break
        if (!memes.find(m => m.id === template.id)) {
          memes.push({
            id: template.id,
            url: template.url,
            name: template.name,
            box_count: template.box_count,
          })
        }
      }
    }
  }

  return memes
}

// Alternative: fetch from Imgflip's featured/hot pages
async function fetchHotMemes(query = 'pizza') {
  const memes = []

  // Search multiple pages
  for (let page = 1; page <= 3; page++) {
    try {
      const url = `https://imgflip.com/search?q=${encodeURIComponent(query)}&page=${page}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      })

      const html = await response.text()

      // Extract meme images from search results
      // Look for patterns like: <img class="shadow" src="https://i.imgflip.com/..." alt="..." />
      const imgRegex = /<img[^>]+class="[^"]*shadow[^"]*"[^>]+src="(https:\/\/i\.imgflip\.com\/[^"]+)"[^>]+alt="([^"]+)"/gi
      let match

      while ((match = imgRegex.exec(html)) !== null) {
        const imgUrl = match[1]
        const title = match[2]

        // Skip if already have this URL
        if (!memes.find(m => m.url === imgUrl)) {
          memes.push({
            id: imgUrl.split('/').pop().split('.')[0],
            url: imgUrl,
            name: title,
          })
        }
      }

      // Rate limit between pages
      await new Promise(r => setTimeout(r, 500))
    } catch (error) {
      console.error(`Error fetching page ${page}: ${error.message}`)
    }
  }

  return memes
}

async function importMemes(memes, config) {
  let imported = 0
  let skipped = 0
  let failed = 0

  for (const meme of memes) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('content')
      .select('id')
      .eq('url', meme.url)
      .single()

    if (existing) {
      skipped++
      continue
    }

    const content = {
      title: meme.name || 'Imgflip Pizza Meme',
      url: meme.url,
      thumbnail_url: meme.url,
      source_url: `https://imgflip.com/i/${meme.id}`,
      source_platform: 'imgflip',
      type: 'meme',
      status: 'approved',
      metadata: {
        imgflip_id: meme.id,
        box_count: meme.box_count,
      }
    }

    if (config.dryRun) {
      console.log(`  [DRY RUN] Would import: ${content.title}`)
      imported++
      continue
    }

    const { error } = await supabase.from('content').insert(content)

    if (error) {
      console.error(`  Failed to import "${meme.name}": ${error.message}`)
      failed++
    } else {
      imported++
    }
  }

  return { imported, skipped, failed }
}

async function main() {
  const config = parseArgs()

  console.log('😂 Imgflip Pizza Meme Importer')
  console.log('==============================')

  if (config.dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n')
  }

  const searchTerms = [
    'pizza',
    'pizza delivery',
    'pizza party',
    'pepperoni',
    'italian food pizza',
  ]

  let totalImported = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const term of searchTerms) {
    console.log(`\n🔍 Searching for "${term}"...`)

    try {
      const memes = await fetchHotMemes(term)
      console.log(`   Found ${memes.length} memes`)

      if (memes.length === 0) {
        console.log('   Trying alternative search...')
        const altMemes = await searchImgflip(term, config.limit)
        console.log(`   Found ${altMemes.length} memes from alternative search`)

        if (altMemes.length > 0) {
          const { imported, skipped, failed } = await importMemes(altMemes.slice(0, config.limit), config)
          totalImported += imported
          totalSkipped += skipped
          totalFailed += failed
          console.log(`   ✅ Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`)
        }
      } else {
        const { imported, skipped, failed } = await importMemes(memes.slice(0, config.limit), config)
        totalImported += imported
        totalSkipped += skipped
        totalFailed += failed
        console.log(`   ✅ Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`)
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000))
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Total imported: ${totalImported}`)
  console.log(`   Total skipped: ${totalSkipped}`)
  console.log(`   Total failed: ${totalFailed}`)
  console.log('\n✨ Done!')
}

main().catch(console.error)
