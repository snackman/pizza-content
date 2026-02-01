/**
 * Content Importer
 *
 * Shared utilities for importing content from various platforms.
 * Handles source tracking, logging, and common import logic.
 */

import { createClient } from '@supabase/supabase-js'
import { RateLimiter } from './rate-limiter.mjs'
import { Deduplicator } from './deduplicator.mjs'
import { AutoTagger } from './auto-tagger.mjs'

// Supabase configuration - uses environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hecsxlqeviirichoohkl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export class ContentImporter {
  constructor(options = {}) {
    this.platform = options.platform
    this.sourceIdentifier = options.sourceIdentifier || 'default'
    this.displayName = options.displayName || `${this.platform}/${this.sourceIdentifier}`

    // Initialize Supabase
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_KEY environment variable is required')
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Initialize utilities
    this.rateLimiter = options.rateLimiter || new RateLimiter({
      requestsPerMinute: options.requestsPerMinute || 30
    })
    this.deduplicator = new Deduplicator(this.supabase)
    this.autoTagger = options.autoTagger || new AutoTagger()

    // State
    this.sourceId = null
    this.logId = null
    this.stats = {
      found: 0,
      imported: 0,
      skipped: 0,
      errors: []
    }

    // Options
    this.dryRun = options.dryRun || false
    this.verbose = options.verbose !== false
  }

  /**
   * Initialize the importer (create/fetch source record, start log)
   */
  async initialize() {
    this.log('Initializing importer...')

    // Ensure source exists
    await this.ensureSource()

    // Start import log
    await this.startLog()

    // Load deduplication cache
    await this.deduplicator.loadCache()

    this.log(`Importer ready: ${this.displayName}`)
  }

  /**
   * Ensure import source record exists
   */
  async ensureSource() {
    const { data: existing, error: selectError } = await this.supabase
      .from('import_sources')
      .select('id')
      .eq('platform', this.platform)
      .eq('source_identifier', this.sourceIdentifier)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // If table doesn't exist, log warning but continue
      if (selectError.message?.includes('does not exist')) {
        this.log('Warning: import_sources table not found. Run migration first.')
        return
      }
      throw selectError
    }

    if (existing) {
      this.sourceId = existing.id
      this.log(`Using existing source: ${this.sourceId}`)
    } else {
      const { data: created, error: insertError } = await this.supabase
        .from('import_sources')
        .insert({
          platform: this.platform,
          source_identifier: this.sourceIdentifier,
          display_name: this.displayName,
          is_active: true
        })
        .select('id')
        .single()

      if (insertError) {
        if (insertError.message?.includes('does not exist')) {
          this.log('Warning: import_sources table not found. Run migration first.')
          return
        }
        throw insertError
      }

      this.sourceId = created.id
      this.log(`Created new source: ${this.sourceId}`)
    }
  }

  /**
   * Start an import log record
   */
  async startLog() {
    if (!this.sourceId) return

    const { data, error } = await this.supabase
      .from('import_logs')
      .insert({
        source_id: this.sourceId,
        status: 'running'
      })
      .select('id')
      .single()

    if (error) {
      if (error.message?.includes('does not exist')) {
        this.log('Warning: import_logs table not found. Run migration first.')
        return
      }
      throw error
    }

    this.logId = data.id
    this.log(`Started import log: ${this.logId}`)
  }

  /**
   * Run the import process
   */
  async run(fetchFn, transformFn) {
    try {
      await this.initialize()

      this.log('Fetching content...')
      const items = await this.rateLimiter.execute(() => fetchFn(), 'fetch')
      this.stats.found = items?.length || 0
      this.log(`Found ${this.stats.found} items`)

      if (!items || items.length === 0) {
        await this.finalize('completed')
        return this.stats
      }

      // Process items
      for (const item of items) {
        try {
          await this.processItem(item, transformFn)
        } catch (error) {
          this.stats.errors.push({
            item: item.id || item.title || 'unknown',
            error: error.message
          })
          this.log(`Error processing item: ${error.message}`, 'error')
        }
      }

      await this.finalize('completed')
      return this.stats

    } catch (error) {
      this.log(`Import failed: ${error.message}`, 'error')
      await this.finalize('failed', error.message)
      throw error
    }
  }

  /**
   * Process a single item
   */
  async processItem(item, transformFn) {
    // Transform to content format
    const content = await transformFn(item)

    if (!content) {
      this.stats.skipped++
      return
    }

    // Check for duplicates
    if (content.source_url && await this.deduplicator.exists(content.source_url)) {
      this.log(`Skipping duplicate: ${content.source_url}`, 'debug')
      this.stats.skipped++
      return
    }

    // Auto-tag if no tags provided
    if (!content.tags || content.tags.length === 0) {
      content.tags = this.autoTagger.extractFromContent({
        title: content.title,
        description: content.description,
        platform: this.platform,
        type: content.type
      })
    }

    // Ensure required fields
    const finalContent = {
      type: content.type || 'meme',
      title: content.title || 'Untitled',
      url: content.url,
      thumbnail_url: content.thumbnail_url || content.url,
      source_url: content.source_url,
      source_platform: content.source_platform || this.platform,
      tags: content.tags || ['pizza'],
      status: 'approved', // No moderation queue
      description: content.description || null,
      is_viral: content.is_viral || false
    }

    if (this.dryRun) {
      this.log(`[DRY RUN] Would import: ${finalContent.title}`)
      this.stats.imported++
      return
    }

    // Insert into database
    const { error } = await this.supabase
      .from('content')
      .insert(finalContent)

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        this.log(`Duplicate detected: ${finalContent.source_url}`, 'debug')
        this.stats.skipped++
      } else {
        throw error
      }
    } else {
      this.deduplicator.addToCache(finalContent.source_url)
      this.log(`Imported: ${finalContent.title}`)
      this.stats.imported++
    }
  }

  /**
   * Finalize the import (update log, update source timestamp)
   */
  async finalize(status, errorMessage = null) {
    this.log(`\nImport ${status}:`)
    this.log(`  Found: ${this.stats.found}`)
    this.log(`  Imported: ${this.stats.imported}`)
    this.log(`  Skipped: ${this.stats.skipped}`)
    if (this.stats.errors.length > 0) {
      this.log(`  Errors: ${this.stats.errors.length}`)
    }

    // Update import log
    if (this.logId) {
      await this.supabase
        .from('import_logs')
        .update({
          status,
          items_found: this.stats.found,
          items_imported: this.stats.imported,
          items_skipped: this.stats.skipped,
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', this.logId)
    }

    // Update source last_fetched_at
    if (this.sourceId) {
      await this.supabase
        .from('import_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', this.sourceId)
    }
  }

  /**
   * Log helper
   */
  log(message, level = 'info') {
    if (!this.verbose && level === 'debug') return

    const prefix = `[${this.platform}]`
    if (level === 'error') {
      console.error(prefix, message)
    } else {
      console.log(prefix, message)
    }
  }

  /**
   * Get the Supabase client (for custom queries)
   */
  getSupabase() {
    return this.supabase
  }
}

/**
 * Helper to detect content type from URL
 */
export function detectContentType(url) {
  if (!url) return 'meme'

  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('.gif') || lowerUrl.includes('giphy') || lowerUrl.includes('tenor')) {
    return 'gif'
  }

  if (
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.webm') ||
    lowerUrl.includes('tiktok') ||
    lowerUrl.includes('vimeo')
  ) {
    return 'video'
  }

  return 'meme'
}

/**
 * Helper to extract media URL from various formats
 */
export function extractMediaUrl(item, preferredResolution = 'medium') {
  // Common patterns across APIs

  // Direct URL
  if (typeof item === 'string') return item

  // GIPHY format
  if (item.images) {
    const res = preferredResolution === 'high' ? 'original' :
                preferredResolution === 'low' ? 'fixed_width_small' : 'fixed_width'
    return item.images[res]?.url || item.images.original?.url
  }

  // Tenor format
  if (item.media_formats) {
    const format = item.media_formats.gif || item.media_formats.mediumgif || item.media_formats.tinygif
    return format?.url
  }
  if (item.media) {
    const media = item.media[0]
    return media?.gif?.url || media?.mediumgif?.url
  }

  // Reddit format
  if (item.preview?.images?.[0]) {
    return item.preview.images[0].source?.url?.replace(/&amp;/g, '&')
  }

  // Generic patterns
  return item.url || item.media_url || item.image_url || item.src || null
}

export default ContentImporter
