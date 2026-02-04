/**
 * Pizza All Stars - Search Terms Helper
 *
 * Fetches search terms from the pizza_all_stars table to include
 * when sourcing content from external APIs.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hecsxlqeviirichoohkl.supabase.co'

/**
 * Get all search terms from Pizza All Stars
 * @returns {Promise<string[]>} Array of search terms
 */
export async function getAllStarsSearchTerms() {
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseKey) {
    console.warn('[All Stars] No Supabase key found, using default search terms')
    return getDefaultSearchTerms()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('pizza_all_stars')
      .select('name, search_terms')
      .eq('status', 'approved')

    if (error) {
      console.warn('[All Stars] Error fetching search terms:', error.message)
      return getDefaultSearchTerms()
    }

    // Collect all search terms
    const terms = new Set(['pizza']) // Always include 'pizza'

    for (const star of data || []) {
      // Add the name as a search term
      if (star.name) {
        terms.add(star.name.toLowerCase())
      }
      // Add all custom search terms
      if (star.search_terms && Array.isArray(star.search_terms)) {
        for (const term of star.search_terms) {
          if (term) terms.add(term.toLowerCase())
        }
      }
    }

    return Array.from(terms)
  } catch (error) {
    console.warn('[All Stars] Error:', error.message)
    return getDefaultSearchTerms()
  }
}

/**
 * Get default search terms (fallback when DB is unavailable)
 */
function getDefaultSearchTerms() {
  return [
    'pizza',
    'luigi primo',
    'pizza man nick',
    'tony gemignani',
    'jersey pizza boys',
    'pizza collection',
  ]
}

/**
 * Get a random subset of search terms for varied content
 * @param {number} count - Number of terms to return
 * @returns {Promise<string[]>} Random subset of search terms
 */
export async function getRandomSearchTerms(count = 5) {
  const allTerms = await getAllStarsSearchTerms()

  // Shuffle and take first N
  const shuffled = allTerms.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Build search queries that include All Stars
 * Returns an array of queries to run for comprehensive content sourcing
 * @returns {Promise<string[]>} Array of search queries
 */
export async function buildSearchQueries() {
  const terms = await getAllStarsSearchTerms()

  // Group terms into meaningful queries
  const queries = [
    'pizza', // Base query
    ...terms.filter(t => t !== 'pizza').slice(0, 10) // Top 10 all-star terms
  ]

  return [...new Set(queries)]
}
