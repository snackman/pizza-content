/**
 * Auto-Tagger
 *
 * Extracts relevant tags from content titles, descriptions, and metadata.
 * Uses keyword matching and pattern recognition.
 */

// Pizza-related keywords that should become tags
const PIZZA_KEYWORDS = [
  // Pizza types
  'pepperoni', 'margherita', 'hawaiian', 'supreme', 'veggie', 'meat lovers',
  'cheese', 'deep dish', 'thin crust', 'stuffed crust', 'new york', 'chicago',
  'neapolitan', 'sicilian', 'detroit', 'california', 'greek', 'flatbread',

  // Toppings
  'mushroom', 'olive', 'onion', 'pepper', 'sausage', 'bacon', 'ham',
  'pineapple', 'anchovy', 'jalapeno', 'spinach', 'tomato', 'basil',
  'garlic', 'mozzarella', 'parmesan', 'ricotta', 'feta',

  // Pizza-related terms
  'slice', 'pie', 'crust', 'dough', 'sauce', 'oven', 'delivery',
  'pizzeria', 'pizzaiolo', 'pizza party', 'pizza night', 'pizza time',
  'pizza box', 'pizza cutter', 'pizza stone', 'pizza peel',

  // Emotions/reactions
  'delicious', 'yummy', 'tasty', 'perfect', 'amazing', 'best',
  'worst', 'fail', 'win', 'epic', 'legendary', 'cursed', 'blessed',

  // Content types
  'meme', 'funny', 'viral', 'trending', 'satisfying', 'asmr',
  'recipe', 'tutorial', 'review', 'mukbang', 'eating', 'cooking',

  // Brands (common ones)
  'dominos', 'pizza hut', 'papa johns', 'little caesars', 'costco',
  'digiorno', 'totinos', 'red baron', 'tombstone',

  // Events/occasions
  'birthday', 'party', 'weekend', 'friday', 'game day', 'super bowl',
  'movie night', 'date night', 'hangover', 'midnight', 'late night'
]

// Patterns to detect and tag
const PATTERNS = [
  { pattern: /\bcrime(s)?\b/i, tag: 'pizza-crimes' },
  { pattern: /\bfail(s|ed|ure)?\b/i, tag: 'fail' },
  { pattern: /\bwin(s|ner)?\b/i, tag: 'win' },
  { pattern: /\bwtf\b/i, tag: 'wtf' },
  { pattern: /\bomg\b/i, tag: 'omg' },
  { pattern: /\bfood\s*porn\b/i, tag: 'food-porn' },
  { pattern: /\bhomemade\b/i, tag: 'homemade' },
  { pattern: /\bdiy\b/i, tag: 'diy' },
  { pattern: /\brestaurant\b/i, tag: 'restaurant' },
  { pattern: /\bfrozen\b/i, tag: 'frozen-pizza' },
  { pattern: /\bcheesy\b/i, tag: 'cheesy' },
  { pattern: /\bcrispy\b/i, tag: 'crispy' },
  { pattern: /\bodd|weird|strange|unusual\b/i, tag: 'unusual' },
  { pattern: /\bitalian?\b/i, tag: 'italian' },
  { pattern: /\bantipasto\b/i, tag: 'italian' },
  { pattern: /\bgif\b/i, tag: 'animated' },
  { pattern: /\b(cat|dog|pet)(s)?\b/i, tag: 'pets' },
  { pattern: /\bkid(s)?\b/i, tag: 'kids' },
  { pattern: /\bcelebrit(y|ies)\b/i, tag: 'celebrity' },
  { pattern: /\bvegan\b/i, tag: 'vegan' },
  { pattern: /\bvegetarian\b/i, tag: 'vegetarian' },
  { pattern: /\bgluten\s*free\b/i, tag: 'gluten-free' },
  { pattern: /\bketo\b/i, tag: 'keto' },
  { pattern: /\bhealthy\b/i, tag: 'healthy' }
]

export class AutoTagger {
  constructor(options = {}) {
    this.maxTags = options.maxTags || 8
    this.includeSource = options.includeSource !== false
    this.customKeywords = options.customKeywords || []

    // Combine default and custom keywords
    this.keywords = [...PIZZA_KEYWORDS, ...this.customKeywords]
    this.patterns = [...PATTERNS]
  }

  /**
   * Extract tags from text content
   */
  extractTags(text, options = {}) {
    if (!text) return ['pizza']

    const tags = new Set(['pizza']) // Always include 'pizza' tag
    const lowerText = text.toLowerCase()

    // Check keywords
    for (const keyword of this.keywords) {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i')
      if (regex.test(lowerText)) {
        tags.add(keyword.toLowerCase().replace(/\s+/g, '-'))
      }
    }

    // Check patterns
    for (const { pattern, tag } of this.patterns) {
      if (pattern.test(text)) {
        tags.add(tag)
      }
    }

    // Add source platform tag if provided
    if (this.includeSource && options.platform) {
      tags.add(options.platform.toLowerCase())
    }

    // Add content type tag if provided
    if (options.type) {
      tags.add(options.type.toLowerCase())
    }

    // Limit tags
    const tagArray = Array.from(tags).slice(0, this.maxTags)

    return tagArray
  }

  /**
   * Extract tags from multiple fields
   */
  extractFromContent(content) {
    const fields = [
      content.title,
      content.description,
      content.alt_text,
      content.caption,
      ...(content.keywords || [])
    ].filter(Boolean)

    const combinedText = fields.join(' ')
    return this.extractTags(combinedText, {
      platform: content.platform || content.source_platform,
      type: content.type
    })
  }

  /**
   * Merge existing tags with auto-generated tags
   */
  mergeTags(existingTags, newTags) {
    const merged = new Set([...existingTags, ...newTags])
    return Array.from(merged).slice(0, this.maxTags)
  }

  /**
   * Add a custom keyword for tagging
   */
  addKeyword(keyword) {
    this.keywords.push(keyword)
  }

  /**
   * Add a custom pattern for tagging
   */
  addPattern(pattern, tag) {
    this.patterns.push({ pattern, tag })
  }

  /**
   * Escape special regex characters in a string
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export default AutoTagger
