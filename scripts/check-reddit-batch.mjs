#!/usr/bin/env node
/**
 * Batch check Reddit URLs from a JSON file
 *
 * Usage: node scripts/check-reddit-batch.mjs <input-file>
 */

import { readFile, writeFile } from 'fs/promises'

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
  const inputFile = process.argv[2]
  if (!inputFile) {
    console.error('Usage: node scripts/check-reddit-batch.mjs <input-file>')
    process.exit(1)
  }

  console.log(`Reading from ${inputFile}...`)
  const rawData = await readFile(inputFile, 'utf8')

  // Parse the MCP output format
  const parsed = JSON.parse(rawData)
  const text = parsed[0].text

  // Extract the JSON array from the untrusted-data tags
  // The text field contains escaped JSON like: [{\"id\":...}]
  // We need to find the array between the tags

  const endMarker = '</untrusted-data'
  const endIdx = text.indexOf(endMarker)

  if (endIdx === -1) {
    console.error('Could not find end marker in MCP output')
    process.exit(1)
  }

  // Find the start of the JSON array (first '[{' pattern)
  const jsonStartIdx = text.indexOf('[{')
  if (jsonStartIdx === -1 || jsonStartIdx > endIdx) {
    console.error('Could not find JSON array in MCP output')
    process.exit(1)
  }

  // Find the end of the array (last '}]' before the end marker)
  const jsonEndIdx = text.lastIndexOf('}]', endIdx) + 2
  if (jsonEndIdx <= 2) {
    console.error('Could not find end of JSON array')
    process.exit(1)
  }

  // Extract and unescape the JSON array
  let jsonStr = text.slice(jsonStartIdx, jsonEndIdx)

  // The JSON might be escaped (double quotes escaped as \")
  // Try parsing as-is first, then try unescaping
  let items
  try {
    items = JSON.parse(jsonStr)
  } catch (e) {
    // Try unescaping
    jsonStr = jsonStr.replace(/\\"/g, '"')
    items = JSON.parse(jsonStr)
  }

  console.log(`Found ${items.length} items to check\n`)

  const working = []
  const broken = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = await checkUrl(item.url)

    if (result.working) {
      working.push(item.id)
      console.log(`[${i + 1}/${items.length}] WORKING: ${item.url.slice(-30)}`)
    } else {
      broken.push(item.id)
      console.log(`[${i + 1}/${items.length}] BROKEN (${result.reason}): ${item.url.slice(-30)}`)
    }

    // Small delay to be nice to servers
    await new Promise(r => setTimeout(r, 50))
  }

  console.log(`\n=== Results ===`)
  console.log(`Working: ${working.length}`)
  console.log(`Broken: ${broken.length}`)

  // Write results to files
  await writeFile('working-reddit-ids.json', JSON.stringify(working, null, 2))
  await writeFile('broken-reddit-ids.json', JSON.stringify(broken, null, 2))

  console.log('\nResults written to:')
  console.log('  working-reddit-ids.json')
  console.log('  broken-reddit-ids.json')
}

main()
