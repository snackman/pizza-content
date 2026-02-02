import { test, expect } from '@playwright/test'

test('check Reddit content images', async ({ page }) => {
  // Go to the site (or check database directly)
  await page.goto('http://localhost:3000')

  // Wait for content to load
  await page.waitForTimeout(2000)

  // Check if any images fail to load
  const brokenImages: string[] = []

  // Get all image elements
  const images = await page.locator('img').all()

  for (const img of images) {
    const src = await img.getAttribute('src')
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)

    if (naturalWidth === 0 && src) {
      brokenImages.push(src)
    }
  }

  console.log('Total images:', images.length)
  console.log('Broken images:', brokenImages.length)
  brokenImages.forEach(src => console.log('  -', src))

  // This test is informational - log results
  if (brokenImages.length > 0) {
    console.log('\n⚠️ Found broken images!')
  }
})

test('check Reddit URLs in database via API', async ({ request }) => {
  // Query the content API for Reddit content
  const response = await request.get('http://localhost:3000/api/content?source=reddit&limit=10')

  if (response.ok()) {
    const data = await response.json()
    console.log('Reddit content count:', data.length || 0)

    // Check each URL
    for (const item of (data || [])) {
      console.log(`\nChecking: ${item.title?.slice(0, 50)}...`)
      console.log(`  URL: ${item.url}`)

      try {
        const imgResponse = await request.get(item.url)
        console.log(`  Status: ${imgResponse.status()}`)

        if (!imgResponse.ok()) {
          console.log(`  ❌ BROKEN IMAGE`)
        }
      } catch (e) {
        console.log(`  ❌ ERROR: ${e}`)
      }
    }
  } else {
    console.log('API not available, checking database directly...')
  }
})
