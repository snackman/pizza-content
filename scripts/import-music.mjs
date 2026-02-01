/**
 * Music Import Script for Pizza Content
 *
 * This script imports music files from a local directory into Supabase.
 * It uploads the audio files to Supabase Storage and creates records in the content table.
 *
 * Usage:
 *   node scripts/import-music.mjs [path-to-music-folder]
 *
 * If no path is provided, it defaults to: data/music
 *
 * Prerequisites:
 * - Music files should be MP3 format
 * - Set SUPABASE_SERVICE_KEY environment variable or update the key below
 * - The 'content' storage bucket must exist
 *
 * Note: This script does NOT run automatically. Run it manually after
 * downloading music files from Google Drive.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = 'https://hecsxlqeviirichoohkl.supabase.co'
// Use environment variable or fallback to service key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_EOXIDzdK-3JLjbzJXPzoaA_WPPkCLk1'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Default music directory
const defaultMusicDir = join(__dirname, '..', 'data', 'music')

// Supported audio formats
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac']

/**
 * Extract title from filename
 * Cleans up filename to create a readable title
 */
function titleFromFilename(filename) {
  const name = basename(filename, extname(filename))
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse filename for artist/title info
 * Common patterns:
 * - "Artist - Title.mp3"
 * - "Title.mp3"
 */
function parseFilename(filename) {
  const name = basename(filename, extname(filename))

  // Try to extract artist from "Artist - Title" pattern
  const dashMatch = name.match(/^(.+?)\s*-\s*(.+)$/)
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      title: dashMatch[2].trim(),
    }
  }

  // Just use filename as title
  return {
    artist: null,
    title: titleFromFilename(filename),
  }
}

/**
 * Get audio duration using file header (basic estimation)
 * For accurate duration, you'd need a library like music-metadata
 */
function estimateDuration(fileBuffer, extension) {
  // For MP3s, estimate based on file size and typical bitrate
  // This is rough - 128kbps is common, ~16KB per second
  if (extension === '.mp3') {
    const fileSizeKB = fileBuffer.length / 1024
    const estimatedSeconds = Math.round(fileSizeKB / 16)
    return estimatedSeconds
  }
  // Default to 3 minutes for unknown formats
  return 180
}

async function main() {
  // Get music directory from command line or use default
  const musicDir = process.argv[2] || defaultMusicDir

  console.log('='.repeat(60))
  console.log('Pizza Music Import Script')
  console.log('='.repeat(60))
  console.log(`\nMusic directory: ${musicDir}`)

  // Check if directory exists
  if (!existsSync(musicDir)) {
    console.error(`\nError: Directory not found: ${musicDir}`)
    console.log('\nTo use this script:')
    console.log('1. Download music files from Google Drive')
    console.log('2. Place them in data/music or specify a custom path')
    console.log('3. Run: node scripts/import-music.mjs [path]')
    process.exit(1)
  }

  // Ensure storage bucket exists
  console.log('\nChecking storage bucket...')
  const { error: bucketError } = await supabase.storage.createBucket('content', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
  })

  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket error:', bucketError.message)
  } else {
    console.log('Storage bucket ready.')
  }

  // Find all audio files
  const files = readdirSync(musicDir).filter((f) => {
    const ext = extname(f).toLowerCase()
    return AUDIO_EXTENSIONS.includes(ext)
  })

  if (files.length === 0) {
    console.log('\nNo audio files found in directory.')
    console.log(`Supported formats: ${AUDIO_EXTENSIONS.join(', ')}`)
    process.exit(0)
  }

  console.log(`\nFound ${files.length} audio file(s)\n`)
  console.log('-'.repeat(60))

  let successCount = 0
  let errorCount = 0

  for (const file of files) {
    const filePath = join(musicDir, file)
    const extension = extname(file).toLowerCase()
    const { artist, title } = parseFilename(file)

    console.log(`\nProcessing: ${file}`)
    console.log(`  Title: ${title}`)
    if (artist) console.log(`  Artist: ${artist}`)

    try {
      // Read file
      const fileBuffer = readFileSync(filePath)
      const duration = estimateDuration(fileBuffer, extension)
      console.log(`  Duration: ~${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`)

      // Create storage path
      const safeName = file.replace(/\s+/g, '-').toLowerCase()
      const storagePath = `music/${safeName}`

      // Upload to storage
      console.log('  Uploading to storage...')
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(storagePath, fileBuffer, {
          contentType: extension === '.mp3' ? 'audio/mpeg' : `audio/${extension.slice(1)}`,
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('content').getPublicUrl(storagePath)

      // Insert into database
      console.log('  Adding to database...')
      const { error: insertError } = await supabase.from('content').insert({
        type: 'music',
        title: title,
        artist: artist,
        url: publicUrl,
        duration_seconds: duration,
        status: 'approved',
        tags: ['pizza', 'music', 'pizza-radio'],
      })

      if (insertError) {
        // Check if it's a duplicate
        if (insertError.message.includes('duplicate') || insertError.code === '23505') {
          console.log('  Skipped: Already exists in database')
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
  console.log('Import Complete')
  console.log('='.repeat(60))
  console.log(`  Successful: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Total: ${files.length}`)

  if (successCount > 0) {
    console.log('\nMusic is now available at:')
    console.log('  - /music (Music Library)')
    console.log('  - /radio (Pizza Radio)')
    console.log('  - /api/music (API)')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
