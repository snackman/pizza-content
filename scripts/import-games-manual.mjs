#!/usr/bin/env node
/**
 * Manual Pizza Games Importer
 *
 * Imports a curated list of the best pizza-themed games.
 * This provides high-quality seed content with accurate metadata.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-games-manual.mjs
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-games-manual.mjs --dry-run
 *
 * Games included:
 *   - Pizza Tower (Steam) - Highly rated indie platformer
 *   - Good Pizza, Great Pizza (Steam/Mobile) - Pizza shop simulator
 *   - Papa's Pizzeria (browser) - Classic flash game series
 *   - Pizza Connection series - Business simulation
 *   - And more curated pizza games
 */

import { ContentImporter } from './lib/content-importer.mjs'
import { RateLimiter } from './lib/rate-limiter.mjs'

// Curated list of pizza games with metadata
const PIZZA_GAMES = [
  {
    title: 'Pizza Tower',
    url: 'https://store.steampowered.com/app/2231450/Pizza_Tower/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/2231450/header.jpg',
    description: 'Pizza Tower is a fast-paced 2D platformer inspired by Wario Land. Play as Peppino Spaghetti, a stressed Italian man who must scale a tower to destroy the evil Pizza Face. Features tight controls, expressive animation, and challenging gameplay.',
    platforms: ['pc', 'steam'],
    genres: ['platformer', 'indie', 'action'],
    is_viral: true, // Extremely popular indie game
    released: '2023-01-26',
    stores: ['Steam']
  },
  {
    title: 'Good Pizza, Great Pizza',
    url: 'https://store.steampowered.com/app/1101720/Good_Pizza_Great_Pizza__Cooking_Simulator_Game/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/1101720/header.jpg',
    description: 'Run your own pizza shop! Take orders, make pizzas, and grow your business. A relaxing pizza-making simulator with charming art style and quirky customers. Available on PC, iOS, and Android.',
    platforms: ['pc', 'mobile', 'steam'],
    genres: ['simulation', 'casual', 'indie'],
    is_viral: true, // Very popular mobile/PC game
    released: '2018-10-24',
    stores: ['Steam', 'App Store', 'Google Play']
  },
  {
    title: "Papa's Pizzeria",
    url: 'https://www.coolmathgames.com/0-papas-pizzeria',
    thumbnail_url: 'https://www.coolmathgames.com/sites/default/files/styles/thumbnail_lg/public/Papas%20Pizzeria.png',
    description: "The original Papa's restaurant game! Take pizza orders, add toppings, bake to perfection, and serve customers. A classic browser game that spawned an entire series of restaurant management games.",
    platforms: ['browser'],
    genres: ['simulation', 'casual', 'time-management'],
    is_viral: true, // Classic game series
    released: '2007-01-01',
    stores: ['Browser (Coolmath Games)', 'Browser (various)']
  },
  {
    title: 'Pizza Connection 3',
    url: 'https://store.steampowered.com/app/588160/Pizza_Connection_3/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/588160/header.jpg',
    description: 'Build your pizza empire! Create custom pizzas, manage restaurants, and compete against rivals. The third installment in the beloved Pizza Connection business simulation series.',
    platforms: ['pc', 'steam'],
    genres: ['simulation', 'strategy', 'management'],
    is_viral: false,
    released: '2018-03-15',
    stores: ['Steam', 'GOG']
  },
  {
    title: 'Pizza Possum',
    url: 'https://store.steampowered.com/app/2067850/Pizza_Possum/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/2067850/header.jpg',
    description: 'A chaotic arcade game about a hungry possum on a pizza heist! Dodge guards, eat everything in sight, and cause mayhem in this adorable stealth-action game.',
    platforms: ['pc', 'steam', 'nintendo'],
    genres: ['action', 'arcade', 'indie'],
    is_viral: false,
    released: '2023-09-28',
    stores: ['Steam', 'Nintendo Switch']
  },
  {
    title: 'Cooking Simulator - Pizza',
    url: 'https://store.steampowered.com/app/1474470/Cooking_Simulator__Pizza/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/1474470/header.jpg',
    description: 'DLC for Cooking Simulator focused entirely on pizza! Make authentic Italian pizzas with realistic physics. Knead dough, add toppings, and master the art of pizza making.',
    platforms: ['pc', 'steam'],
    genres: ['simulation', 'cooking'],
    is_viral: false,
    released: '2021-06-03',
    stores: ['Steam']
  },
  {
    title: 'Pizza Hero',
    url: 'https://apps.apple.com/app/pizza-hero/id954859871',
    thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/pizza-hero-icon.png/512x512bb.jpg',
    description: 'Become the ultimate pizza chef! Slide and swipe to add toppings, manage multiple orders, and keep customers happy in this fast-paced mobile pizza game.',
    platforms: ['mobile'],
    genres: ['casual', 'arcade'],
    is_viral: false,
    released: '2014-01-01',
    stores: ['App Store', 'Google Play']
  },
  {
    title: 'Freddy Fazbear\'s Pizzeria Simulator',
    url: 'https://store.steampowered.com/app/738060/Freddys_Pizzeria_Simulator/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/738060/header.jpg',
    description: 'Design and manage your own Freddy Fazbear\'s Pizza restaurant - but beware of what lurks in the shadows. A unique blend of business sim and horror from the FNAF universe. Free to play!',
    platforms: ['pc', 'steam'],
    genres: ['simulation', 'horror', 'indie'],
    is_viral: true, // Part of hugely popular FNAF series
    released: '2017-12-04',
    stores: ['Steam (Free)']
  },
  {
    title: 'Pizza Tycoon',
    url: 'https://www.gog.com/en/game/pizza_tycoon',
    thumbnail_url: 'https://images.gog-statics.com/pizza-tycoon-header.jpg',
    description: 'The classic 1994 pizza business simulation! Build restaurants, create recipes, and outsmart your competition. Features sabotage, bribery, and all the dirty tricks of the pizza trade.',
    platforms: ['pc'],
    genres: ['simulation', 'strategy', 'classic'],
    is_viral: false,
    released: '1994-01-01',
    stores: ['GOG']
  },
  {
    title: 'Pizza Express',
    url: 'https://store.steampowered.com/app/375250/Pizza_Express/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/375250/header.jpg',
    description: 'Run a pizza delivery service in space! Cook pizzas, manage your crew, and deliver to hungry aliens across the galaxy in this quirky simulation game.',
    platforms: ['pc', 'steam'],
    genres: ['simulation', 'casual', 'indie'],
    is_viral: false,
    released: '2015-09-25',
    stores: ['Steam']
  },
  {
    title: 'Slice & Dice',
    url: 'https://store.steampowered.com/app/1775490/Slice__Dice/',
    thumbnail_url: 'https://cdn.akamai.steamstatic.com/steam/apps/1775490/header.jpg',
    description: 'A tactical dice-based roguelike where you build a party of heroes (including pizza-themed characters!) to battle through dungeons. Strategic combat with charming pixel art.',
    platforms: ['pc', 'steam', 'mobile'],
    genres: ['roguelike', 'strategy', 'indie'],
    is_viral: false,
    released: '2022-07-07',
    stores: ['Steam', 'itch.io', 'Mobile']
  }
]

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        config.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Manual Pizza Games Importer

Imports a curated list of ${PIZZA_GAMES.length} pizza-themed games.

Usage:
  node scripts/import-games-manual.mjs [options]

Options:
  --dry-run     Show what would be imported without saving
  --help, -h    Show this help message

Environment:
  SUPABASE_SERVICE_KEY    Required. Supabase service role key.

Games included:
${PIZZA_GAMES.map(g => `  - ${g.title} (${g.platforms.join(', ')})`).join('\n')}
`)
        process.exit(0)
    }
  }

  return config
}

// Transform manual game entry to content format
function transformGame(game) {
  // Build tags from platforms and genres
  const tags = ['pizza', 'game', ...game.platforms, ...game.genres]

  // Add store availability
  if (game.stores.some(s => s.toLowerCase().includes('free'))) {
    tags.push('free')
  }

  // Build description with store info
  let description = game.description
  if (game.stores && game.stores.length > 0) {
    const storeInfo = `\n\nAvailable on: ${game.stores.join(', ')}`
    if (description.length + storeInfo.length <= 500) {
      description += storeInfo
    }
  }

  return {
    type: 'game',
    title: game.title,
    url: game.url,
    thumbnail_url: game.thumbnail_url,
    source_url: game.url,
    source_platform: 'manual',
    description: description,
    is_viral: game.is_viral,
    tags: [...new Set(tags)].slice(0, 10) // Dedupe and limit
  }
}

// Main import function
async function main() {
  const config = parseArgs()

  console.log('\n=== Manual Pizza Games Importer ===\n')
  console.log(`Games to import: ${PIZZA_GAMES.length}`)
  if (config.dryRun) console.log('DRY RUN MODE - No data will be saved\n')

  const importer = new ContentImporter({
    platform: 'manual',
    sourceIdentifier: 'curated-pizza-games',
    displayName: 'Curated Pizza Games',
    rateLimiter: new RateLimiter({ requestsPerMinute: 60 }), // No API limits for manual data
    dryRun: config.dryRun
  })

  try {
    await importer.run(
      // Fetch function - just returns our curated list
      async () => PIZZA_GAMES,
      // Transform function
      transformGame
    )
  } catch (error) {
    console.error('[Manual Games] Error:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import Complete ===\n')
  console.log('Imported games are now available at:')
  console.log('  - /games (Games Library)')
  console.log('  - /browse?type=game (Browse with filter)')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
