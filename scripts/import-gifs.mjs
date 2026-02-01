import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, basename, extname } from 'path'

const supabaseUrl = 'https://hecsxlqeviirichoohkl.supabase.co'
const supabaseServiceKey = 'sb_secret_EOXIDzdK-3JLjbzJXPzoaA_WPPkCLk1'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const gifsDir = 'C:/Users/samgo/OneDrive/Documents/PizzaDAO/Code/pizza-content/data/gifs'

function titleFromFilename(filename) {
  // Remove extension and clean up filename
  const name = basename(filename, extname(filename))
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\.gif$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('Creating storage bucket...')

  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.createBucket('content', {
    public: true,
    fileSizeLimit: 52428800 // 50MB
  })

  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket error:', bucketError.message)
  }

  console.log('\nUploading GIFs...\n')

  const files = readdirSync(gifsDir).filter(f => f.toLowerCase().endsWith('.gif'))
  console.log(`Found ${files.length} GIFs\n`)

  for (const file of files) {
    const filePath = join(gifsDir, file)
    const fileBuffer = readFileSync(filePath)
    const storagePath = `gifs/${file.replace(/\s+/g, '-').toLowerCase()}`

    console.log(`Uploading: ${file}`)

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/gif',
        upsert: true
      })

    if (uploadError) {
      console.error(`  ✗ Upload failed: ${uploadError.message}`)
      continue
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(storagePath)

    // Insert into content table
    const title = titleFromFilename(file)
    const { error: insertError } = await supabase
      .from('content')
      .insert({
        type: 'gif',
        title: title,
        url: publicUrl,
        thumbnail_url: publicUrl,
        status: 'approved',
        tags: ['pizza', 'rare-pizzas']
      })

    if (insertError) {
      console.error(`  ✗ DB insert failed: ${insertError.message}`)
    } else {
      console.log(`  ✓ Added: "${title}"`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
