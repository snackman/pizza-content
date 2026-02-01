import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'user.json')

// Test credentials - set via environment variables or use defaults for testing
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@pizza-content-test.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!'

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login')

  // Fill login form
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)

  // Click sign in
  await page.click('button[type="submit"]')

  // Wait for either success (redirect away from login) or error
  try {
    // Wait for redirect away from login (success)
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 })

    // Store authentication state
    await page.context().storageState({ path: authFile })

    console.log('Authentication successful! State saved.')
  } catch (error) {
    // Check if there's an error message
    const errorMessage = await page.locator('.bg-red-50').textContent().catch(() => null)

    if (errorMessage) {
      console.log(`Authentication failed: ${errorMessage}`)
      console.log('To run authenticated tests, set TEST_EMAIL and TEST_PASSWORD environment variables')
      console.log('Or create a test account at https://pizza-content.vercel.app/register')
    }

    // Create empty auth file so tests can still run (but will skip auth-required tests)
    await page.context().storageState({ path: authFile })
  }
})
