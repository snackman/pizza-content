#!/usr/bin/env node

/**
 * Flickr Pizza Content Importer
 *
 * Imports pizza photos from Flickr's public API.
 *
 * Usage:
 *   node scripts/import-flickr.mjs                    # Import pizza photos
 *   node scripts/import-flickr.mjs --limit 50        # Limit results
 *   node scripts/import-flickr.mjs --all-stars       # Include All Stars search terms
 *   node scripts/import-flickr.mjs --dry-run         # Preview without importing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getAllStarsSearchTerms } from './lib/all-stars.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const flickrApiKey = process.env.FLICKR_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

if (!flickrApiKey) {
  console.error('Missing FLICKR_API_KEY - get one at https://www.flickr.com/services/api/misc.api_keys.html')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    limit: 100,
    dryRun: false,
    allStars: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        config.limit = parseInt(args[++i], 10)
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--all-stars':
        config.allStars = true
        break
    }
  }

  return config
}

async function searchFlickr(query, perPage = 100) {
  const params = new URLSearchParams({
    method: 'flickr.photos.search',
    api_key: flickrApiKey,
    text: query,
    format: 'json',
    nojsoncallback: '1',
    per_page: perPage.toString(),
    sort: 'relevance',
    content_type: '1', // Photos only
    media: 'photos',
    extras: 'url_l,url_m,url_o,owner_name,description,date_upload',
    safe_search: '1', // Safe content
  })

  const response = await fetch(`https://api.flickr.com/services/rest/?${params}`)

  if (!response.ok) {
    throw new Error(`Flickr API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.stat !== 'ok') {
    throw new Error(`Flickr API error: ${data.message}`)
  }

  return data.photos.photo
}

function getPhotoUrl(photo) {
  // Prefer large, then medium, then construct from id
  if (photo.url_l) return photo.url_l
  if (photo.url_m) return photo.url_m
  if (photo.url_o) return photo.url_o

  // Construct URL from photo data
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`
}

function getThumbnailUrl(photo) {
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_q.jpg`
}

async function importPhotos(photos, config) {
  let imported = 0
  let skipped = 0
  let failed = 0

  for (const photo of photos) {
    const url = getPhotoUrl(photo)
    const thumbnailUrl = getThumbnailUrl(photo)
    const sourceUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`

    // Check if already exists
    const { data: existing } = await supabase
      .from('content')
      .select('id')
      .eq('url', url)
      .single()

    if (existing) {
      skipped++
      continue
    }

    const content = {
      title: photo.title || 'Flickr Pizza Photo',
      description: photo.description?._content || null,
      url: url,
      thumbnail_url: thumbnailUrl,
      source_url: sourceUrl,
      source_platform: 'flickr',
      type: 'photo',
      status: 'approved',
      metadata: {
        flickr_id: photo.id,
        owner: photo.owner,
        owner_name: photo.ownername,
        date_upload: photo.dateupload,
      }
    }

    if (config.dryRun) {
      console.log(`  [DRY RUN] Would import: ${content.title}`)
      imported++
      continue
    }

    const { error } = await supabase.from('content').insert(content)

    if (error) {
      console.error(`  Failed to import "${photo.title}": ${error.message}`)
      failed++
    } else {
      imported++
    }
  }

  return { imported, skipped, failed }
}

async function main() {
  const config = parseArgs()

  console.log('📸 Flickr Pizza Importer')
  console.log('========================')

  if (config.dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n')
  }

  let searchTerms = ['pizza']

  if (config.allStars) {
    console.log('⭐ Including All Stars search terms...')
    const allStarsTerms = await getAllStarsSearchTerms()
    searchTerms = [...searchTerms, ...allStarsTerms]
  }

  let totalImported = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const term of searchTerms) {
    console.log(`\n🔍 Searching for "${term}"...`)

    try {
      const photos = await searchFlickr(term, Math.min(config.limit, 100))
      console.log(`   Found ${photos.length} photos`)

      const { imported, skipped, failed } = await importPhotos(photos, config)

      totalImported += imported
      totalSkipped += skipped
      totalFailed += failed

      console.log(`   ✅ Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`)

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
