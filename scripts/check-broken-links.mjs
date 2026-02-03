#!/usr/bin/env node
/**
 * Broken Link Checker
 *
 * Scans approved/featured content for broken URLs and optionally flags them.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/check-broken-links.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/check-broken-links.mjs --type gif --limit 100
 *   SUPABASE_SERVICE_KEY=xxx node scripts/check-broken-links.mjs --fix
 */

import { createClient } from '@supabase/supabase-js'
import { checkUrl, checkUrlsBatch } from './lib/url-checker.mjs'

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hecsxlqeviirichoohkl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Statuses to check (active content)
const ACTIVE_STATUSES = ['approved', 'featured']

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    type: null,        // Filter by content type
    limit: null,       // Limit number of items
    fix: false,        // Actually flag broken content
    dryRun: true,      // Report only (default)
    verbose: false,    // Detailed output
    concurrency: 5,    // Parallel checks
    timeout: 10000,    // URL check timeout (ms)
    checkThumbnails: false  // Also check thumbnail URLs
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
      case '-t':
        config.type = args[++i]
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(args[++i], 10)
        break
      case '--fix':
        config.fix = true
        config.dryRun = false
        break
      case '--dry-run':
        config.dryRun = true
        config.fix = false
        break
      case '--verbose':
      case '-v':
        config.verbose = true
        break
      case '--concurrency':
      case '-c':
        config.concurrency = parseInt(args[++i], 10)
        break
      case '--timeout':
        config.timeout = parseInt(args[++i], 10)
        break
      case '--check-thumbnails':
        config.checkThumbnails = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return config
}

function printHelp() {
  console.log(`
Broken Link Checker for Pizza Content

Scans approved/featured content for broken URLs and optionally flags them.

Usage:
  node scripts/check-broken-links.mjs [options]

Options:
  --type, -t <type>       Filter by content type (gif, meme, video, music)
  --limit, -l <n>         Limit number of items to check
  --fix                   Flag broken content as 'flagged_broken' in database
  --dry-run               Report only, don't modify database (default)
  --verbose, -v           Show detailed output for each URL check
  --concurrency, -c <n>   Number of parallel checks (default: 5)
  --timeout <ms>          URL check timeout in milliseconds (default: 10000)
  --check-thumbnails      Also check thumbnail URLs
  --help, -h              Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.
  SUPABASE_URL            Optional. Defaults to pizza-content project.

Examples:
  # Check all content (dry run)
  node scripts/check-broken-links.mjs

  # Check only GIFs with verbose output
  node scripts/check-broken-links.mjs --type gif --verbose

  # Check first 100 items
  node scripts/check-broken-links.mjs --limit 100

  # Actually flag broken content in database
  node scripts/check-broken-links.mjs --fix

  # Check with higher concurrency
  node scripts/check-broken-links.mjs --concurrency 10
`)
}

// Fetch content from database
async function fetchContent(supabase, config) {
  let query = supabase
    .from('content')
    .select('id, type, title, url, thumbnail_url, source_url, source_platform, created_at')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })

  if (config.type) {
    query = query.eq('type', config.type)
  }

  if (config.limit) {
    query = query.limit(config.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch content: ${error.message}`)
  }

  return data || []
}

// Flag content as broken
async function flagAsBroken(supabase, contentId, verbose) {
  const { error } = await supabase
    .from('content')
    .update({ status: 'flagged_broken' })
    .eq('id', contentId)

  if (error) {
    console.error(`  Failed to flag content ${contentId}: ${error.message}`)
    return false
  }

  if (verbose) {
    console.log(`  Flagged ${contentId} as broken`)
  }

  return true
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

// Progress bar
function progressBar(current, total, width = 30) {
  const percent = total > 0 ? current / total : 0
  const filled = Math.round(width * percent)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${current}/${total} (${(percent * 100).toFixed(1)}%)`
}

// Main function
async function main() {
  const config = parseArgs()

  // Validate environment
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is required')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('\n=== Pizza Content Broken Link Checker ===\n')
  console.log(`Mode: ${config.fix ? 'FIX (will update database)' : 'DRY RUN (report only)'}`)
  if (config.type) console.log(`Type filter: ${config.type}`)
  if (config.limit) console.log(`Limit: ${config.limit}`)
  console.log(`Concurrency: ${config.concurrency}`)
  console.log(`Timeout: ${config.timeout}ms`)
  console.log('')

  // Fetch content
  console.log('Fetching content from database...')
  const startFetch = Date.now()
  const content = await fetchContent(supabase, config)
  console.log(`Found ${content.length} items to check (${formatDuration(Date.now() - startFetch)})\n`)

  if (content.length === 0) {
    console.log('No content to check.')
    return
  }

  // Prepare items for checking
  const itemsToCheck = content.map(item => ({
    id: item.id,
    url: item.url,
    title: item.title,
    type: item.type,
    platform: item.source_platform,
    thumbnail_url: item.thumbnail_url
  }))

  // Stats
  const stats = {
    checked: 0,
    ok: 0,
    broken: 0,
    flagged: 0,
    errors: [],
    brokenItems: [],
    byPlatform: {},
    byType: {}
  }

  const startCheck = Date.now()

  // Check URLs
  console.log('Checking URLs...\n')

  for await (const result of checkUrlsBatch(itemsToCheck, {
    concurrency: config.concurrency,
    timeout: config.timeout,
    verbose: config.verbose
  })) {
    stats.checked++

    // Update progress
    process.stdout.write(`\r${progressBar(stats.checked, content.length)}`)

    // Track by platform and type
    const platform = result.platform || 'unknown'
    const type = result.type || 'unknown'

    if (!stats.byPlatform[platform]) {
      stats.byPlatform[platform] = { ok: 0, broken: 0 }
    }
    if (!stats.byType[type]) {
      stats.byType[type] = { ok: 0, broken: 0 }
    }

    if (result.result.ok) {
      stats.ok++
      stats.byPlatform[platform].ok++
      stats.byType[type].ok++

      if (config.verbose) {
        console.log(`\n  OK: ${result.title.slice(0, 50)}`)
      }
    } else {
      stats.broken++
      stats.byPlatform[platform].broken++
      stats.byType[type].broken++

      const brokenItem = {
        id: result.id,
        title: result.title,
        url: result.url,
        type: result.type,
        platform: result.platform,
        status: result.result.status,
        error: result.result.error
      }
      stats.brokenItems.push(brokenItem)

      if (config.verbose) {
        console.log(`\n  BROKEN: ${result.title.slice(0, 50)}`)
        console.log(`    URL: ${result.url}`)
        console.log(`    Error: ${result.result.error} (status: ${result.result.status})`)
      }

      // Flag in database if --fix is enabled
      if (config.fix) {
        const flagged = await flagAsBroken(supabase, result.id, config.verbose)
        if (flagged) {
          stats.flagged++
        }
      }
    }

    // Also check thumbnail if requested
    if (config.checkThumbnails && result.thumbnail_url && result.thumbnail_url !== result.url) {
      const thumbResult = await checkUrl(result.thumbnail_url, {
        timeout: config.timeout,
        verbose: config.verbose
      })

      if (!thumbResult.ok && config.verbose) {
        console.log(`\n  BROKEN THUMBNAIL: ${result.title.slice(0, 50)}`)
        console.log(`    URL: ${result.thumbnail_url}`)
        console.log(`    Error: ${thumbResult.error}`)
      }
    }
  }

  const duration = Date.now() - startCheck

  // Print summary
  console.log('\n\n=== Summary ===\n')
  console.log(`Total checked: ${stats.checked}`)
  console.log(`OK: ${stats.ok} (${((stats.ok / stats.checked) * 100).toFixed(1)}%)`)
  console.log(`Broken: ${stats.broken} (${((stats.broken / stats.checked) * 100).toFixed(1)}%)`)
  if (config.fix) {
    console.log(`Flagged: ${stats.flagged}`)
  }
  console.log(`Duration: ${formatDuration(duration)}`)
  console.log(`Speed: ${(stats.checked / (duration / 1000)).toFixed(1)} items/sec`)

  // Breakdown by platform
  if (Object.keys(stats.byPlatform).length > 1) {
    console.log('\n--- By Platform ---')
    for (const [platform, counts] of Object.entries(stats.byPlatform).sort((a, b) => b[1].broken - a[1].broken)) {
      const total = counts.ok + counts.broken
      const brokenPct = total > 0 ? ((counts.broken / total) * 100).toFixed(1) : '0.0'
      console.log(`  ${platform}: ${counts.broken}/${total} broken (${brokenPct}%)`)
    }
  }

  // Breakdown by type
  if (Object.keys(stats.byType).length > 1) {
    console.log('\n--- By Type ---')
    for (const [type, counts] of Object.entries(stats.byType).sort((a, b) => b[1].broken - a[1].broken)) {
      const total = counts.ok + counts.broken
      const brokenPct = total > 0 ? ((counts.broken / total) * 100).toFixed(1) : '0.0'
      console.log(`  ${type}: ${counts.broken}/${total} broken (${brokenPct}%)`)
    }
  }

  // List broken items
  if (stats.brokenItems.length > 0) {
    console.log('\n--- Broken Items ---')
    const displayLimit = 20
    const itemsToDisplay = stats.brokenItems.slice(0, displayLimit)

    for (const item of itemsToDisplay) {
      console.log(`\n  [${item.type}] ${item.title.slice(0, 60)}`)
      console.log(`    ID: ${item.id}`)
      console.log(`    URL: ${item.url}`)
      console.log(`    Platform: ${item.platform || 'unknown'}`)
      console.log(`    Error: ${item.error} (${item.status})`)
    }

    if (stats.brokenItems.length > displayLimit) {
      console.log(`\n  ... and ${stats.brokenItems.length - displayLimit} more`)
    }
  }

  // Recommendations
  if (stats.broken > 0 && !config.fix) {
    console.log('\n--- Recommendations ---')
    console.log('Run with --fix to flag broken content in the database:')
    console.log('  node scripts/check-broken-links.mjs --fix')
  }

  console.log('\n=== Check Complete ===\n')

  // Exit with error code if broken links found
  process.exit(stats.broken > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
