import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Supabase session pooler connection
const connectionString = 'postgresql://postgres.hecsxlqeviirichoohkl:lM2UYUrPmFQdWMyo@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

const client = new pg.Client({ connectionString })

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`)
  const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', filename), 'utf8')

  try {
    await client.query(sql)
    console.log(`✓ ${filename} completed`)
    return true
  } catch (error) {
    console.error(`✗ ${filename} failed:`, error.message)
    return false
  }
}

async function main() {
  console.log('Connecting to Supabase database...')
  await client.connect()
  console.log('Connected!\n')

  console.log('Running Pizza Content migrations...')

  const migrations = [
    '001_initial_schema.sql',
    '002_rls_policies.sql',
    '003_profile_trigger.sql'
  ]

  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (!success) {
      console.log('\nStopping due to error.')
      break
    }
  }

  await client.end()
  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
