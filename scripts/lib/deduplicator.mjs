/**
 * Deduplicator
 *
 * Checks if content already exists in the database based on source_url.
 * Caches results to minimize database queries.
 */

export class Deduplicator {
  constructor(supabase) {
    this.supabase = supabase
    this.cache = new Set()
    this.cacheLoaded = false
  }

  /**
   * Load all existing source_urls into cache
   */
  async loadCache() {
    if (this.cacheLoaded) return

    console.log('[Deduplicator] Loading existing source URLs...')

    const { data, error } = await this.supabase
      .from('content')
      .select('source_url')
      .not('source_url', 'is', null)

    if (error) {
      console.error('[Deduplicator] Error loading cache:', error.message)
      throw error
    }

    for (const row of data || []) {
      if (row.source_url) {
        this.cache.add(this.normalizeUrl(row.source_url))
      }
    }

    console.log(`[Deduplicator] Loaded ${this.cache.size} existing URLs`)
    this.cacheLoaded = true
  }

  /**
   * Normalize URL for comparison
   * Removes trailing slashes, normalizes protocols, etc.
   */
  normalizeUrl(url) {
    if (!url) return null

    try {
      const parsed = new URL(url)
      // Normalize to lowercase hostname
      parsed.hostname = parsed.hostname.toLowerCase()
      // Remove trailing slash from pathname
      if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
        parsed.pathname = parsed.pathname.slice(0, -1)
      }
      // Sort query parameters for consistency
      parsed.searchParams.sort()
      return parsed.toString()
    } catch {
      // If URL parsing fails, just lowercase and trim
      return url.toLowerCase().trim()
    }
  }

  /**
   * Check if a URL already exists
   */
  async exists(sourceUrl) {
    if (!sourceUrl) return false

    await this.loadCache()

    const normalizedUrl = this.normalizeUrl(sourceUrl)
    return this.cache.has(normalizedUrl)
  }

  /**
   * Check multiple URLs at once
   * Returns a Set of URLs that already exist
   */
  async existsBatch(sourceUrls) {
    await this.loadCache()

    const existing = new Set()
    for (const url of sourceUrls) {
      if (url && this.cache.has(this.normalizeUrl(url))) {
        existing.add(url)
      }
    }
    return existing
  }

  /**
   * Add a URL to the cache (after successful import)
   */
  addToCache(sourceUrl) {
    if (sourceUrl) {
      this.cache.add(this.normalizeUrl(sourceUrl))
    }
  }

  /**
   * Filter out duplicate items from a list
   * Returns only items that don't exist in the database
   */
  async filterNew(items, getSourceUrl) {
    await this.loadCache()

    const newItems = []
    for (const item of items) {
      const sourceUrl = typeof getSourceUrl === 'function'
        ? getSourceUrl(item)
        : item[getSourceUrl || 'source_url']

      if (!sourceUrl || !this.cache.has(this.normalizeUrl(sourceUrl))) {
        newItems.push(item)
      }
    }
    return newItems
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache() {
    this.cache.clear()
    this.cacheLoaded = false
  }
}

export default Deduplicator
