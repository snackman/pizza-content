import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = 'https://pizza-content.vercel.app'

test.describe('Content Submission Tool - Authentication', () => {

  test('1. Navigate to /submit redirects to login if not authenticated', async ({ page }) => {
    // Clear any existing session by clearing cookies
    await page.context().clearCookies()

    // Navigate to submit page
    await page.goto('/submit')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)

    // Should have redirect parameter
    expect(page.url()).toContain('redirectTo=%2Fsubmit')
  })

  test('2. Login page displays correctly', async ({ page }) => {
    await page.goto('/login')

    // Check page elements
    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
    await expect(page.locator('text=Send magic link instead')).toBeVisible()
    // Use .first() since there are two register links (header + form)
    await expect(page.locator('a[href="/register"]').first()).toBeVisible()
  })

  test('Register page displays correctly', async ({ page }) => {
    await page.goto('/register')

    // Check page elements
    await expect(page.locator('h1')).toContainText('Create your account')
    await expect(page.locator('#displayName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Create account')
  })

  test('Login page shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Content Submission Tool - Form UI (Requires Auth)', () => {
  // Note: These tests need authentication. They will visit the submit page
  // and test UI elements. If not authenticated, they redirect to login.

  test.beforeEach(async ({ page }) => {
    // Navigate to submit page
    await page.goto('/submit')

    // Check if we got redirected to login
    const url = page.url()
    if (url.includes('/login')) {
      // Mark test as expected behavior for unauthenticated users
      test.skip(true, 'Requires authentication - redirected to login')
    }
  })

  test('3. Form loads with header and form container', async ({ page }) => {
    // These checks happen only if we're authenticated
    await expect(page.locator('h1')).toContainText('Submit Content')
    await expect(page.locator('form')).toBeVisible()
  })

  test('4. Content type selector has all options', async ({ page }) => {
    // Check content type buttons exist
    await expect(page.locator('button:has-text("GIF")')).toBeVisible()
    await expect(page.locator('button:has-text("Meme")')).toBeVisible()
    await expect(page.locator('button:has-text("Video")')).toBeVisible()
    await expect(page.locator('button:has-text("Music")')).toBeVisible()
  })

  test('5. Source type toggle shows upload area by default', async ({ page }) => {
    // Upload File should be selected by default
    const uploadButton = page.locator('button:has-text("Upload File")')
    await expect(uploadButton).toHaveClass(/border-orange-300/)

    // Drag-drop area should be visible
    await expect(page.locator('text=Drag and drop or click to upload')).toBeVisible()
  })

  test('6. URL input mode shows URL field when selected', async ({ page }) => {
    // Click External URL button
    await page.locator('button:has-text("External URL")').click()

    // URL input should appear
    await expect(page.locator('input[type="url"]')).toBeVisible()
    await expect(page.locator('text=Supports: YouTube, TikTok, Instagram')).toBeVisible()
  })

  test('7. URL validation works with YouTube URL', async ({ page }) => {
    // Switch to URL mode
    await page.locator('button:has-text("External URL")').click()

    // Enter a valid YouTube URL
    const urlInput = page.locator('input[type="url"]')
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Wait for validation (debounced at 300ms)
    await page.waitForTimeout(500)

    // Check for YouTube badge - should show platform recognition
    await expect(page.locator('span:has-text("YouTube")')).toBeVisible()
  })

  test('8. Tag input allows adding tags', async ({ page }) => {
    // Find tag input area
    const tagInput = page.locator('input[placeholder*="Add tags"]')
    await expect(tagInput).toBeVisible()

    // Add a tag
    await tagInput.fill('pizza')
    await tagInput.press('Enter')

    // Tag should appear
    await expect(page.locator('span.bg-orange-100:has-text("pizza")')).toBeVisible()
  })

  test('9. Preview section exists and updates with title', async ({ page }) => {
    // Fill in title - this should trigger preview
    await page.fill('#title', 'Test Preview Title')

    // Preview section should show
    await expect(page.locator('h3:has-text("Preview")')).toBeVisible()

    // Preview should contain the title
    await expect(page.locator('h4:has-text("Test Preview Title")')).toBeVisible()
  })

  test('Submit button is disabled without required fields', async ({ page }) => {
    // Submit button should be disabled initially
    const submitButton = page.locator('button[type="submit"]:has-text("Submit Content")')
    await expect(submitButton).toBeDisabled()
  })

  test('Submit button enables with title and valid URL', async ({ page }) => {
    // Fill title
    await page.fill('#title', 'Test Title')

    // Switch to URL mode
    await page.locator('button:has-text("External URL")').click()

    // Enter valid YouTube URL
    await page.locator('input[type="url"]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Wait for validation
    await page.waitForTimeout(500)

    // Submit button should now be enabled
    const submitButton = page.locator('button[type="submit"]:has-text("Submit Content")')
    await expect(submitButton).toBeEnabled()
  })
})

test.describe('Content Submission Tool - Integration Tests', () => {

  test('Login redirect preserves destination', async ({ page }) => {
    // Clear cookies
    await page.context().clearCookies()

    // Try to access submit
    await page.goto('/submit')

    // Should be on login with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsubmit/)
  })

  test('Browse page is accessible without auth', async ({ page }) => {
    await page.goto('/browse')

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('Home page loads correctly', async ({ page }) => {
    await page.goto('/')

    // Basic page load check
    await expect(page).toHaveTitle(/Pizza/)
  })
})

// This test requires a real authenticated session
// It's marked with .skip but can be enabled when credentials are provided
test.describe.skip('Full Submission Flow (Auth Required)', () => {

  test('10. Complete form submission with YouTube URL', async ({ page }) => {
    // This test would require:
    // 1. A valid test account
    // 2. Environment variables for test credentials
    // 3. A pre-authentication setup

    await page.goto('/submit')

    // Fill complete form
    await page.fill('#title', 'Automated Test - Pizza Video')
    await page.fill('#description', 'This is an automated test submission')

    // Select video type
    await page.locator('button:has-text("Video")').click()

    // Switch to URL mode
    await page.locator('button:has-text("External URL")').click()

    // Enter YouTube URL
    await page.locator('input[type="url"]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.waitForTimeout(500)

    // Add tags
    const tagInput = page.locator('input[placeholder*="Add tags"]')
    await tagInput.fill('test')
    await tagInput.press('Enter')
    await tagInput.fill('automated')
    await tagInput.press('Enter')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for success
    await expect(page.locator('text=Submission Successful')).toBeVisible({ timeout: 15000 })
  })
})
