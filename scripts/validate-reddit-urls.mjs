#!/usr/bin/env node
/**
 * Validates Reddit content URLs and restores working items
 *
 * Checks flagged Reddit content to see if URLs are actually working.
 * For each URL:
 * - Makes a HEAD request to check HTTP 200
 * - Verifies content-type is an image/video type
 * - Checks content-length > 5000 bytes (broken Reddit images are small placeholders)
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/validate-reddit-urls.mjs
 *
 * If no service key, will output IDs for manual update.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hecsxlqeviirichoohkl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required')
  process.exit(1)
}

const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUrl(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'PizzaSauce/1.0' }
    })

    clearTimeout(timeout)

    if (!response.ok) return { working: false, reason: `HTTP ${response.status}` }

    const contentType = response.headers.get('content-type') || ''
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)

    // Check if it's an image or video
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return { working: false, reason: `Not media: ${contentType}` }
    }

    // Reddit's "deleted" placeholder is very small
    if (contentLength > 0 && contentLength < 5000) {
      return { working: false, reason: `Too small: ${contentLength} bytes` }
    }

    return { working: true, contentType, contentLength }
  } catch (error) {
    return { working: false, reason: error.message }
  }
}

async function main() {
  console.log('Fetching flagged Reddit content...')

  const { data: items, error } = await supabase
    .from('content')
    .select('id, url, title')
    .eq('source_platform', 'reddit')
    .eq('status', 'flagged_broken')

  if (error) {
    console.error('Error fetching:', error)
    process.exit(1)
  }

  console.log(`Found ${items.length} Reddit items to check\n`)

  const working = []
  const broken = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = await checkUrl(item.url)

    if (result.working) {
      working.push(item.id)
      console.log(`[${i + 1}/${items.length}] WORKING: ${item.title?.slice(0, 50)}`)
    } else {
      broken.push(item.id)
      console.log(`[${i + 1}/${items.length}] BROKEN (${result.reason}): ${item.title?.slice(0, 50)}`)
    }

    // Small delay to be nice to servers
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n=== Results ===`)
  console.log(`Working: ${working.length}`)
  console.log(`Broken: ${broken.length}`)

  if (working.length > 0) {
    if (hasServiceKey) {
      console.log(`\nRestoring ${working.length} working items to approved...`)

      // Update in batches of 50
      for (let i = 0; i < working.length; i += 50) {
        const batch = working.slice(i, i + 50)
        const { error: updateError } = await supabase
          .from('content')
          .update({ status: 'approved' })
          .in('id', batch)

        if (updateError) {
          console.error('Update error:', updateError)
        } else {
          console.log(`Updated batch ${Math.floor(i / 50) + 1}`)
        }
      }

      console.log('Done! Working Reddit items restored.')
    } else {
      console.log(`\n=== Working IDs (for manual update) ===`)
      console.log(JSON.stringify(working))
    }
  }

  if (broken.length > 0) {
    console.log(`\n=== Broken IDs ===`)
    console.log(JSON.stringify(broken))
  }
}

main()
