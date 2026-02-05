#!/usr/bin/env node

/**
 * Broken Image Detector
 *
 * Validates all content URLs and flags broken ones.
 * Can be run after imports or on-demand.
 *
 * Usage:
 *   node scripts/detect-broken-images.mjs              # Check all approved content
 *   node scripts/detect-broken-images.mjs --source pexels  # Check specific source
 *   node scripts/detect-broken-images.mjs --type video     # Check specific type
 *   node scripts/detect-broken-images.mjs --limit 100      # Limit checks
 *   node scripts/detect-broken-images.mjs --dry-run        # Don't update database
 *   node scripts/detect-broken-images.mjs --fix            # Unflags items that are now working
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    source: null,
    type: null,
    limit: null,
    dryRun: false,
    fix: false,
    concurrency: 10,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        config.source = args[++i]
        break
      case '--type':
        config.type = args[++i]
        break
      case '--limit':
        config.limit = parseInt(args[++i], 10)
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--fix':
        config.fix = true
        break
      case '--concurrency':
        config.concurrency = parseInt(args[++i], 10)
        break
      case '--verbose':
      case '-v':
        config.verbose = true
        break
      case '--help':
      case '-h':
        console.log(`
Broken Image Detector

Usage:
  node scripts/detect-broken-images.mjs [options]

Options:
  --source <name>     Check specific source (pexels, giphy, reddit, etc.)
  --type <type>       Check specific type (video, photo, gif, meme)
  --limit <n>         Limit number of items to check
  --dry-run           Don't update database, just report
  --fix               Re-check flagged items and unflag working ones
  --concurrency <n>   Number of concurrent checks (default: 10)
  --verbose, -v       Show detailed output
  --help, -h          Show this help
        `)
        process.exit(0)
    }
  }

  return config
}

// Validate a single URL
async function validateUrl(url, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { valid: false, reason: `HTTP ${response.status}` }
    }

    const contentType = response.headers.get('content-type') || ''
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)

    // Check for valid image/video content types
    const validTypes = [
      'image/',
      'video/',
      'application/octet-stream', // Sometimes used for binary files
    ]

    const isValidType = validTypes.some(type => contentType.includes(type))

    if (!isValidType && contentLength === 0) {
      return { valid: false, reason: `Invalid content-type: ${contentType}` }
    }

    // Check for suspiciously small content (likely placeholder or error image)
    // Skip this check for certain sources that might legitimately have small files
    if (contentLength > 0 && contentLength < 1000) {
      return { valid: false, reason: `Too small: ${contentLength} bytes` }
    }

    return { valid: true, contentType, contentLength }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      return { valid: false, reason: 'Timeout' }
    }

    return { valid: false, reason: error.message || 'Unknown error' }
  }
}

// Process items in batches with concurrency control
async function processBatch(items, concurrency, processor) {
  const results = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)

    // Progress indicator
    const progress = Math.min(i + concurrency, items.length)
    process.stdout.write(`\rProcessed ${progress}/${items.length} items...`)
  }

  console.log() // New line after progress
  return results
}

async function main() {
  const config = parseArgs()

  console.log('🔍 Broken Image Detector')
  console.log('========================')

  if (config.dryRun) {
    console.log('📋 DRY RUN - No database changes will be made')
  }

  // Build query
  let query = supabase
    .from('content')
    .select('id, title, url, thumbnail_url, source_platform, type, status')

  if (config.fix) {
    // Re-check flagged items
    query = query.eq('status', 'flagged_broken')
    console.log('🔧 Checking flagged_broken items to see if they work now...')
  } else {
    // Check approved items
    query = query.eq('status', 'approved')
  }

  if (config.source) {
    query = query.eq('source_platform', config.source)
    console.log(`📁 Filtering by source: ${config.source}`)
  }

  if (config.type) {
    query = query.eq('type', config.type)
    console.log(`📁 Filtering by type: ${config.type}`)
  }

  if (config.limit) {
    query = query.limit(config.limit)
    console.log(`📊 Limiting to ${config.limit} items`)
  }

  query = query.order('created_at', { ascending: false })

  const { data: items, error } = await query

  if (error) {
    console.error('❌ Error fetching content:', error.message)
    process.exit(1)
  }

  if (!items || items.length === 0) {
    console.log('✅ No items to check')
    return
  }

  console.log(`\n📊 Found ${items.length} items to check`)
  console.log(`⚡ Concurrency: ${config.concurrency}\n`)

  const broken = []
  const fixed = []
  const valid = []

  // Process items
  const results = await processBatch(items, config.concurrency, async (item) => {
    // Check the main URL first, then thumbnail if available
    const urlToCheck = item.thumbnail_url || item.url

    if (!urlToCheck) {
      return { item, result: { valid: false, reason: 'No URL' } }
    }

    const result = await validateUrl(urlToCheck)
    return { item, result }
  })

  // Categorize results
  for (const { item, result } of results) {
    if (config.fix) {
      // In fix mode, we're checking flagged items
      if (result.valid) {
        fixed.push({ item, result })
      } else {
        broken.push({ item, result })
      }
    } else {
      // In normal mode, we're checking approved items
      if (result.valid) {
        valid.push({ item, result })
      } else {
        broken.push({ item, result })
      }
    }
  }

  // Report results
  console.log('\n📊 Results:')
  console.log(`   ✅ Valid: ${config.fix ? fixed.length : valid.length}`)
  console.log(`   ❌ Broken: ${broken.length}`)

  if (broken.length > 0 && config.verbose) {
    console.log('\n❌ Broken items:')
    for (const { item, result } of broken.slice(0, 20)) {
      console.log(`   - [${item.source_platform}] ${item.title?.slice(0, 50)}...`)
      console.log(`     Reason: ${result.reason}`)
    }
    if (broken.length > 20) {
      console.log(`   ... and ${broken.length - 20} more`)
    }
  }

  if (config.fix && fixed.length > 0 && config.verbose) {
    console.log('\n✅ Items that are now working:')
    for (const { item } of fixed.slice(0, 10)) {
      console.log(`   - [${item.source_platform}] ${item.title?.slice(0, 50)}...`)
    }
  }

  // Update database
  if (!config.dryRun) {
    if (config.fix && fixed.length > 0) {
      // Unflag items that are now working
      const idsToUnflag = fixed.map(({ item }) => item.id)

      console.log(`\n🔄 Unflagging ${idsToUnflag.length} items that are now working...`)

      const { error: unflagError } = await supabase
        .from('content')
        .update({ status: 'approved' })
        .in('id', idsToUnflag)

      if (unflagError) {
        console.error('❌ Error unflagging items:', unflagError.message)
      } else {
        console.log(`✅ Unflagged ${idsToUnflag.length} items`)
      }
    }

    if (!config.fix && broken.length > 0) {
      // Flag broken items
      const idsToFlag = broken.map(({ item }) => item.id)

      console.log(`\n🔄 Flagging ${idsToFlag.length} broken items...`)

      const { error: flagError } = await supabase
        .from('content')
        .update({ status: 'flagged_broken' })
        .in('id', idsToFlag)

      if (flagError) {
        console.error('❌ Error flagging items:', flagError.message)
      } else {
        console.log(`✅ Flagged ${idsToFlag.length} items as broken`)
      }
    }
  }

  // Summary by source
  if (broken.length > 0) {
    const bySource = {}
    for (const { item } of broken) {
      bySource[item.source_platform] = (bySource[item.source_platform] || 0) + 1
    }

    console.log('\n📊 Broken items by source:')
    for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${source}: ${count}`)
    }
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
