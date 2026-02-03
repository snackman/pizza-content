import { test, expect } from '@playwright/test'

// Test against localhost
test.use({ baseURL: 'http://localhost:3000' })

test('Debug local browse page', async ({ page }) => {
  // Collect all console messages
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') {
      consoleErrors.push(text)
      console.log('CONSOLE ERROR:', text)
    } else {
      consoleLogs.push(`[${msg.type()}] ${text}`)
      console.log(`CONSOLE [${msg.type()}]:`, text)
    }
  })

  // Track network requests to Supabase
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('supabase')) {
      const status = response.status()
      let body = ''
      try {
        body = await response.text()
      } catch (e) {
        body = 'Could not read body'
      }
      console.log(`SUPABASE ${status}: ${url}`)
      console.log(`BODY: ${body.substring(0, 1000)}`)
    }
  })

  // Navigate to the browse page
  console.log('Navigating to http://localhost:3000/browse')
  await page.goto('/browse')

  // Wait for network to settle
  await page.waitForLoadState('networkidle')

  // Wait a bit more for any delayed requests
  await page.waitForTimeout(3000)

  // Check what the page shows
  const itemsText = page.locator('text=/\\d+ items? found/')
  const isItemsVisible = await itemsText.isVisible()

  if (isItemsVisible) {
    const text = await itemsText.textContent()
    console.log('Items counter:', text)
  } else {
    console.log('Items counter not visible')
  }

  // Check if loading spinner is shown
  const loadingSpinner = page.locator('text=Loading content...')
  const isLoading = await loadingSpinner.isVisible()
  console.log('Is loading spinner visible:', isLoading)

  // Check if "No content found" is shown
  const noContent = page.locator('text=No content found')
  const isNoContent = await noContent.isVisible()
  console.log('Is "No content found" visible:', isNoContent)

  // Print summary
  console.log('\n=== SUMMARY ===')
  console.log('Console errors:', consoleErrors.length)
  consoleErrors.forEach(e => console.log('  -', e))

  // Take a screenshot for reference
  await page.screenshot({ path: 'tests/browse-local.png', fullPage: true })
  console.log('Screenshot saved to tests/browse-local.png')
})
