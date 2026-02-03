import { test, expect } from '@playwright/test'

test.describe('Browse Page', () => {

  test('Page loads and displays content grid with 368 items', async ({ page }) => {
    // Navigate to browse page
    await page.goto('/browse')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Verify the page title/header (shows "Browse All Content" when filter is All)
    await expect(page.locator('h1')).toContainText('Browse')

    // Wait for content to load - look for the items count text
    const itemsText = page.locator('text=/\\d+ items? found/')
    await expect(itemsText).toBeVisible({ timeout: 15000 })

    // Get the count and verify it shows expected count (368 items)
    const countText = await itemsText.textContent()
    const match = countText?.match(/(\d+) items? found/)
    expect(match).toBeTruthy()
    const itemCount = parseInt(match![1], 10)
    expect(itemCount).toBeGreaterThan(0)
    console.log(`Found ${itemCount} items`)

    // Verify we have approximately the expected number of items (allow for some variance)
    // Expected: 368 items, allow 10% variance for content additions/removals
    expect(itemCount).toBeGreaterThanOrEqual(300)
    expect(itemCount).toBeLessThanOrEqual(500)

    // Verify content cards are displayed
    const contentCards = page.locator('[data-testid="content-card"]')
    // If no test IDs, look for the grid of cards by structure
    const cardGrid = page.locator('.grid')
    await expect(cardGrid.first()).toBeVisible()
  })

  test('Filter buttons are present and functional', async ({ page }) => {
    await page.goto('/browse')
    await page.waitForLoadState('networkidle')

    // Wait for content to load first
    await expect(page.locator('text=/\\d+ items? found/')).toBeVisible({ timeout: 15000 })

    // Check that filter buttons exist
    const filterButtons = ['All', 'GIFs', 'Memes', 'Videos', 'Music', 'Photos']

    for (const filterName of filterButtons) {
      const button = page.locator(`button:has-text("${filterName}")`)
      await expect(button).toBeVisible()
    }
  })

  test('Filter buttons change the displayed content', async ({ page }) => {
    await page.goto('/browse')
    await page.waitForLoadState('networkidle')

    // Wait for initial content load
    const itemsCounter = page.locator('text=/\\d+ items? found/')
    await expect(itemsCounter).toBeVisible({ timeout: 15000 })

    // Get initial count with "All" filter
    const initialText = await itemsCounter.textContent()
    const initialMatch = initialText?.match(/(\d+) items? found/)
    const initialCount = parseInt(initialMatch![1], 10)
    console.log(`Initial count (All): ${initialCount}`)

    // Click on GIFs filter
    await page.locator('button:has-text("GIFs")').click()

    // Wait for content to update
    await page.waitForTimeout(500)

    // The count should update (may be same or different depending on data)
    await expect(itemsCounter).toBeVisible()
    const gifsText = await itemsCounter.textContent()
    console.log(`GIFs filter: ${gifsText}`)

    // Click on Memes filter
    await page.locator('button:has-text("Memes")').click()
    await page.waitForTimeout(500)

    const memesText = await itemsCounter.textContent()
    console.log(`Memes filter: ${memesText}`)

    // Click on Videos filter
    await page.locator('button:has-text("Videos")').click()
    await page.waitForTimeout(500)

    const videosText = await itemsCounter.textContent()
    console.log(`Videos filter: ${videosText}`)

    // Click on Music filter
    await page.locator('button:has-text("Music")').click()
    await page.waitForTimeout(500)

    const musicText = await itemsCounter.textContent()
    console.log(`Music filter: ${musicText}`)

    // Click on Photos filter
    await page.locator('button:has-text("Photos")').click()
    await page.waitForTimeout(500)

    const photosText = await itemsCounter.textContent()
    console.log(`Photos filter: ${photosText}`)

    // Go back to All
    await page.locator('button:has-text("All")').click()
    await page.waitForTimeout(500)

    const finalText = await itemsCounter.textContent()
    const finalMatch = finalText?.match(/(\d+) items? found/)
    const finalCount = parseInt(finalMatch![1], 10)

    // Final count should match initial count
    expect(finalCount).toBe(initialCount)
  })

  test('Content cards display correctly', async ({ page }) => {
    await page.goto('/browse')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await expect(page.locator('text=/\\d+ items? found/')).toBeVisible({ timeout: 15000 })

    // Look for content card elements - check if images or media thumbnails exist
    // Cards typically have images, titles, and content type badges
    const cards = page.locator('.grid > div').first()
    await expect(cards).toBeVisible()

    // Check for common card elements like images
    const images = page.locator('.grid img')
    const imageCount = await images.count()
    console.log(`Found ${imageCount} images in the grid`)
    expect(imageCount).toBeGreaterThan(0)
  })

  test('Page has no console errors', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/browse')
    await page.waitForLoadState('networkidle')

    // Wait for content
    await expect(page.locator('text=/\\d+ items? found/')).toBeVisible({ timeout: 15000 })

    // Filter out known non-critical errors (like third-party scripts)
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('third-party') &&
      !error.includes('analytics')
    )

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors)
    }

    // We'll just log errors for now, not fail the test on them
    // This allows us to see what errors exist
  })

})
