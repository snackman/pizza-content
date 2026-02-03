import { test, expect } from '@playwright/test'

test('Debug browse page - detailed check', async ({ page }) => {
  // Navigate to the browse page
  await page.goto('/browse')

  // Wait for network to settle
  await page.waitForLoadState('networkidle')

  // Wait for content to load
  await expect(page.locator('text=/\\d+ items? found/')).toBeVisible({ timeout: 15000 })

  // Count the actual content cards in the grid
  const gridCards = page.locator('.grid > div')
  const cardCount = await gridCards.count()
  console.log(`Grid cards count: ${cardCount}`)

  // Check if cards have images
  const images = page.locator('.grid img')
  const imageCount = await images.count()
  console.log(`Images in grid: ${imageCount}`)

  // Check items counter
  const itemsText = await page.locator('text=/\\d+ items? found/').textContent()
  console.log(`Items text: ${itemsText}`)

  // Verify cards are visible and have content
  expect(cardCount).toBeGreaterThan(0)
  expect(imageCount).toBeGreaterThan(0)

  // Check first card details
  const firstCard = gridCards.first()
  const firstCardVisible = await firstCard.isVisible()
  console.log(`First card visible: ${firstCardVisible}`)

  // Take full page screenshot
  await page.screenshot({ path: 'tests/browse-detailed.png', fullPage: true })
})

test('Check if content cards render correctly', async ({ page }) => {
  await page.goto('/browse')
  await page.waitForLoadState('networkidle')

  // Wait for items counter
  await expect(page.locator('text=/\\d+ items? found/')).toBeVisible({ timeout: 15000 })

  // Get HTML of the grid area
  const gridHTML = await page.locator('.grid').first().innerHTML()
  console.log('Grid HTML length:', gridHTML.length)
  console.log('Grid HTML preview:', gridHTML.substring(0, 1000))
})
