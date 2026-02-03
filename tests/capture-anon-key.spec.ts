import { test, expect } from '@playwright/test'

// Test against production to capture the anon key
test('Capture Supabase anon key from production', async ({ page }) => {
  // Track network requests to Supabase
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('supabase')) {
      const headers = request.headers()
      console.log('SUPABASE REQUEST:', url)
      console.log('APIKEY:', headers['apikey'])
      console.log('AUTHORIZATION:', headers['authorization'])
    }
  })

  // Navigate to the browse page
  await page.goto('/browse')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
})
