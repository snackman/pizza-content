import { test, expect } from '@playwright/test'

test('Debug browse page - check console and network', async ({ page }) => {
  // Collect all console messages
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') {
      consoleErrors.push(text)
      console.log('CONSOLE ERROR:', text)
    } else {
      consoleLogs.push(text)
      console.log('CONSOLE:', text)
    }
  })

  // Track network requests to Supabase
  const supabaseRequests: { url: string; status: number; body?: string }[] = []

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
      supabaseRequests.push({ url, status, body: body.substring(0, 500) })
      console.log(`SUPABASE ${status}: ${url}`)
      console.log(`BODY: ${body.substring(0, 500)}`)
    }
  })

  // Navigate to the browse page
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
  console.log('Supabase requests:', supabaseRequests.length)

  for (const req of supabaseRequests) {
    console.log(`  ${req.status} ${req.url}`)
  }

  // Take a screenshot for reference
  await page.screenshot({ path: 'tests/browse-debug.png', fullPage: true })
  console.log('Screenshot saved to tests/browse-debug.png')
})
