/**
 * Google Drive Music Sync Script for Pizza Content
 *
 * This script syncs music files from a Google Drive folder to the Supabase database.
 * Instead of downloading files, it creates database entries that point to the
 * streaming proxy endpoint (/api/music/gdrive/[fileId]).
 *
 * Usage:
 *   node scripts/sync-gdrive-music.mjs [folder-id]
 *
 * If no folder ID is provided, uses the default Pizza Music folder.
 *
 * Environment variables required:
 *   - GOOGLE_SERVICE_ACCOUNT_JSON: Service account credentials JSON
 *   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_KEY: Supabase service role key
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

// Default Pizza Music folder ID
const DEFAULT_FOLDER_ID = '1owejIWtX7obut3cX6tOo7EEdVssp6AcE'

// Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hecsxlqeviirichoohkl.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || 'sb_secret_EOXIDzdK-3JLjbzJXPzoaA_WPPkCLk1'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Audio MIME types we support
const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
]

/**
 * Initialize Google Drive client using service account
 */
function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!serviceAccountJson) {
    console.error('\nError: GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set.')
    console.log('\nTo use this script:')
    console.log('1. Create a Google Cloud service account')
    console.log('2. Share the Google Drive folder with the service account email')
    console.log('3. Download the service account JSON key')
    console.log('4. Set GOOGLE_SERVICE_ACCOUNT_JSON to the JSON content')
    console.log('\nExample:')
    console.log('  set GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}')
    console.log('  node scripts/sync-gdrive-music.mjs')
    process.exit(1)
  }

  let credentials
  try {
    credentials = JSON.parse(serviceAccountJson)
  } catch (e) {
    console.error('\nError: Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON')
    console.error('Ensure the value is valid JSON.')
    process.exit(1)
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

/**
 * Parse filename to extract artist and title
 */
function parseFilename(filename) {
  // Remove extension
  const name = filename.replace(/\.[^.]+$/, '')

  // Remove leading track numbers
  const withoutTrackNum = name.replace(/^\d+[\.\s\-]+/, '')

  // Try "Artist - Title" pattern
  const dashMatch = withoutTrackNum.match(/^(.+?)\s*-\s*(.+)$/)
  if (dashMatch) {
    return {
      artist: cleanString(dashMatch[1]),
      title: cleanString(dashMatch[2]),
    }
  }

  // Try "Artist_Title" pattern
  const underscoreMatch = withoutTrackNum.match(/^(.+?)_(.+)$/)
  if (underscoreMatch) {
    return {
      artist: cleanString(underscoreMatch[1]),
      title: cleanString(underscoreMatch[2]),
    }
  }

  // No pattern matched
  return {
    artist: null,
    title: cleanString(withoutTrackNum),
  }
}

function cleanString(str) {
  return str.replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Estimate audio duration from file size
 * MP3 @ 128kbps ~= 16KB per second
 */
function estimateDuration(sizeBytes, mimeType) {
  const sizeKB = sizeBytes / 1024

  // WAV files are much larger
  if (mimeType && mimeType.includes('wav')) {
    return Math.round(sizeKB / 176)
  }

  // MP3 and other compressed formats
  return Math.round(sizeKB / 16)
}

/**
 * List audio files in a Google Drive folder
 */
async function listAudioFiles(drive, folderId) {
  const mimeTypeQuery = AUDIO_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ')
  const query = `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`

  const audioFiles = []
  let pageToken

  do {
    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 100,
      pageToken,
    })

    const files = response.data.files || []

    for (const file of files) {
      if (!file.id || !file.name) continue

      const { artist, title } = parseFilename(file.name)
      const size = parseInt(file.size || '0', 10)

      audioFiles.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType || 'audio/mpeg',
        size,
        artist,
        title,
        estimatedDuration: estimateDuration(size, file.mimeType),
      })
    }

    pageToken = response.data.nextPageToken
  } while (pageToken)

  return audioFiles
}

async function main() {
  const folderId = process.argv[2] || DEFAULT_FOLDER_ID

  console.log('='.repeat(60))
  console.log('Google Drive Music Sync')
  console.log('='.repeat(60))
  console.log(`\nFolder ID: ${folderId}`)

  // Initialize Google Drive client
  console.log('\nConnecting to Google Drive...')
  const drive = getDriveClient()

  // List audio files in the folder
  console.log('Scanning for audio files...\n')
  let audioFiles
  try {
    audioFiles = await listAudioFiles(drive, folderId)
  } catch (error) {
    if (error.message.includes('not found') || error.code === 404) {
      console.error('\nError: Folder not found or not accessible.')
      console.log('\nMake sure:')
      console.log('1. The folder ID is correct')
      console.log('2. The folder is shared with the service account email')
      process.exit(1)
    }
    throw error
  }

  if (audioFiles.length === 0) {
    console.log('No audio files found in the folder.')
    console.log(`Supported formats: ${AUDIO_MIME_TYPES.join(', ')}`)
    process.exit(0)
  }

  console.log(`Found ${audioFiles.length} audio file(s)\n`)
  console.log('-'.repeat(60))

  let successCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const file of audioFiles) {
    console.log(`\nProcessing: ${file.name}`)
    console.log(`  Title: ${file.title}`)
    if (file.artist) console.log(`  Artist: ${file.artist}`)
    console.log(
      `  Duration: ~${Math.floor(file.estimatedDuration / 60)}:${(file.estimatedDuration % 60).toString().padStart(2, '0')}`
    )
    console.log(`  Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

    try {
      // Check if already exists by source_url
      const sourceUrl = `gdrive:${file.id}`
      const { data: existing } = await supabase
        .from('content')
        .select('id')
        .eq('source_url', sourceUrl)
        .single()

      if (existing) {
        console.log('  Skipped: Already exists in database')
        skippedCount++
        continue
      }

      // Create the streaming URL
      const streamUrl = `/api/music/gdrive/${file.id}`

      // Insert into database
      const { error: insertError } = await supabase.from('content').insert({
        type: 'music',
        title: file.title,
        artist: file.artist,
        url: streamUrl,
        source_url: sourceUrl,
        source_platform: 'google-drive',
        duration_seconds: file.estimatedDuration,
        status: 'approved',
        tags: ['pizza', 'music', 'pizza-radio', 'google-drive'],
      })

      if (insertError) {
        // Check for duplicate
        if (insertError.message.includes('duplicate') || insertError.code === '23505') {
          console.log('  Skipped: Duplicate entry')
          skippedCount++
        } else {
          throw new Error(`DB insert failed: ${insertError.message}`)
        }
      } else {
        console.log('  Success!')
        successCount++
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Sync Complete')
  console.log('='.repeat(60))
  console.log(`  New tracks: ${successCount}`)
  console.log(`  Skipped: ${skippedCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Total scanned: ${audioFiles.length}`)

  if (successCount > 0) {
    console.log('\nNew music is now available at:')
    console.log('  - /music (Music Library)')
    console.log('  - /radio (Pizza Radio)')
    console.log('  - /api/music (API)')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
