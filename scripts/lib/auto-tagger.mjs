/**
 * Auto-tagger - Extracts tags from content titles and metadata
 */

// Pizza-related keywords to detect
const PIZZA_KEYWORDS = {
  // Styles
  styles: ['neapolitan', 'new york', 'chicago', 'detroit', 'sicilian', 'roman', 'grandma', 'pan', 'deep dish', 'thin crust', 'stuffed crust'],

  // Toppings
  toppings: ['pepperoni', 'mushroom', 'sausage', 'olive', 'onion', 'pepper', 'anchovy', 'pineapple', 'ham', 'bacon', 'jalapeno', 'tomato', 'basil', 'mozzarella', 'cheese', 'margherita'],

  // Actions/Themes
  themes: ['making', 'eating', 'delivery', 'party', 'slice', 'box', 'oven', 'dough', 'sauce', 'toppings', 'baking', 'cooking', 'homemade'],

  // Meme themes
  memes: ['fail', 'win', 'funny', 'cursed', 'blursed', 'wholesome', 'relatable', 'mood'],

  // Reactions
  reactions: ['happy', 'sad', 'excited', 'hungry', 'delicious', 'yummy', 'gross', 'weird']
};

// Flatten all keywords for quick lookup
const ALL_KEYWORDS = new Set(Object.values(PIZZA_KEYWORDS).flat());

/**
 * Extract tags from a title string
 */
export function extractTagsFromTitle(title) {
  if (!title) return ['pizza'];

  const tags = new Set(['pizza']);
  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(PIZZA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        tags.add(keyword.replace(/\s+/g, '-'));
      }
    }
  }

  // Extract hashtags if present
  const hashtagRegex = /#(\w+)/g;
  let match;
  while ((match = hashtagRegex.exec(title)) !== null) {
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags).slice(0, 10);
}

/**
 * Extract tags from filename
 */
export function extractTagsFromFilename(filename) {
  if (!filename) return ['pizza'];

  const tags = new Set(['pizza']);

  const name = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

  for (const keyword of ALL_KEYWORDS) {
    if (name.includes(keyword)) {
      tags.add(keyword.replace(/\s+/g, '-'));
    }
  }

  return Array.from(tags).slice(0, 10);
}

/**
 * Merge and deduplicate tags
 */
export function mergeTags(...tagArrays) {
  const merged = new Set();

  for (const tags of tagArrays) {
    if (Array.isArray(tags)) {
      tags.forEach(tag => merged.add(tag.toLowerCase().trim()));
    }
  }

  return Array.from(merged).slice(0, 10);
}

/**
 * Suggest content type based on URL/extension
 */
export function suggestContentType(url) {
  if (!url) return 'meme';

  const lower = url.toLowerCase();

  if (lower.match(/\.(gif|gifv)$/)) return 'gif';
  if (lower.match(/\.(mp4|webm|mov)$/)) return 'video';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
  if (lower.includes('giphy.com') || lower.includes('tenor.com')) return 'gif';

  return 'meme';
}

export default {
  extractTagsFromTitle,
  extractTagsFromFilename,
  mergeTags,
  suggestContentType,
  PIZZA_KEYWORDS
};
