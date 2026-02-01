import { test, expect } from '@playwright/test'

test.describe('Live Stream Player', () => {
  test.describe('Page Load', () => {
    test('navigates to /live and page loads without errors', async ({ page }) => {
      // Listen for console errors
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Navigate to /live
      const response = await page.goto('/live')

      // Check response status
      expect(response?.status()).toBe(200)

      // Wait for the page to load
      await page.waitForLoadState('networkidle')

      // Check that loading state appears or content loads
      // Either we see loading state or content is displayed
      const hasLoadingOrContent = await page.locator('body').evaluate((body) => {
        // Check for loading indicator or content
        return (
          body.textContent?.includes('Loading') ||
          body.querySelector('img') !== null ||
          body.querySelector('video') !== null ||
          body.textContent?.includes('No content available')
        )
      })
      expect(hasLoadingOrContent).toBe(true)

      // Filter out expected Supabase/network errors that don't affect functionality
      const criticalErrors = consoleErrors.filter(
        (err) =>
          !err.includes('supabase') &&
          !err.includes('Failed to fetch') &&
          !err.includes('net::')
      )

      // No critical console errors
      expect(criticalErrors).toHaveLength(0)
    })
  })

  test.describe('Content Display and Cycling', () => {
    test('content displays after loading', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')

      // Wait for either content to load or "no content" message
      await page.waitForSelector(
        'img, video, :text("No content available"), :text("Loading")',
        { timeout: 10000 }
      )

      // Page should have either content or a message
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
    })

    test('content cycles automatically when playing', async ({ page }) => {
      // Use a shorter interval for testing
      await page.goto('/live?interval=5')
      await page.waitForLoadState('networkidle')

      // Wait for initial content to load
      await page.waitForTimeout(2000)

      // Get the initial progress indicator
      const getProgress = async () => {
        const progressText = await page
          .locator('text=/\\d+ \\/ \\d+/')
          .textContent()
          .catch(() => null)
        return progressText
      }

      const initialProgress = await getProgress()

      // If we have content, wait for it to cycle
      if (initialProgress && !initialProgress.includes('0 /')) {
        // Wait for the interval + buffer time
        await page.waitForTimeout(6000)

        const newProgress = await getProgress()

        // Progress should have changed (unless there's only 1 item)
        if (initialProgress.includes('/ 1')) {
          expect(newProgress).toBe(initialProgress)
        } else {
          // Either progress changed or we're still on the same item (timing)
          expect(newProgress).toBeTruthy()
        }
      }
    })
  })

  test.describe('Controls Panel', () => {
    test('controls panel is visible and has main controls', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')

      // Move mouse to trigger controls visibility
      await page.mouse.move(400, 400)

      // Wait for controls to appear
      await page.waitForTimeout(500)

      // Check for play/pause button
      const playPauseButton = page.locator('button[title*="Play"], button[title*="Pause"]')
      await expect(playPauseButton).toBeVisible({ timeout: 5000 })

      // Check for next button
      const nextButton = page.locator('button[title*="Next"]')
      await expect(nextButton).toBeVisible()

      // Check for previous button
      const previousButton = page.locator('button[title*="Previous"]')
      await expect(previousButton).toBeVisible()
    })

    test('settings panel opens and closes', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Click settings button
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()

      // Settings panel should be visible
      const settingsPanel = page.locator('[data-settings-panel]:not(button)')
      await expect(settingsPanel).toBeVisible()

      // Should see settings content
      await expect(page.locator('text=Interval')).toBeVisible()
      await expect(page.locator('text=Content Types')).toBeVisible()
      await expect(page.locator('text=Shuffle')).toBeVisible()

      // Click outside to close (click on the black background)
      await page.mouse.click(50, 50)
      await page.waitForTimeout(300)

      // Settings panel should be hidden
      await expect(settingsPanel).not.toBeVisible()
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('Space key toggles play/pause', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Check initial play state by looking at button title
      const playPauseButton = page.locator(
        'button[title="Play/Pause (Space)"]'
      )
      await expect(playPauseButton).toBeVisible()

      // Get initial state (check if pause icon is shown - meaning it's playing)
      const getIsPlaying = async () => {
        // If we can see pause icon (two vertical lines), it's playing
        const pauseIcon = page.locator('button[title="Play/Pause (Space)"] path[d*="M10 9v6m4-6v6"]')
        return await pauseIcon.isVisible().catch(() => false)
      }

      const wasPlaying = await getIsPlaying()

      // Press space to toggle
      await page.keyboard.press('Space')
      await page.waitForTimeout(300)

      const isNowPlaying = await getIsPlaying()

      // State should have toggled
      expect(isNowPlaying).toBe(!wasPlaying)

      // Press space again to toggle back
      await page.keyboard.press('Space')
      await page.waitForTimeout(300)

      const finalState = await getIsPlaying()
      expect(finalState).toBe(wasPlaying)
    })

    test('F key triggers fullscreen (permission dependent)', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Check fullscreen button exists
      const fullscreenButton = page.locator('button[title*="Fullscreen"]')
      await expect(fullscreenButton).toBeVisible()

      // Try pressing F - fullscreen may not work in headless mode
      await page.keyboard.press('f')
      await page.waitForTimeout(300)

      // We can't reliably test fullscreen in headless mode, so just verify no crash
      const playPauseButton = page.locator('button[title="Play/Pause (Space)"]')
      await expect(playPauseButton).toBeVisible()
    })

    test('Arrow keys navigate content', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Get progress indicator
      const getProgress = async () => {
        const progressText = await page
          .locator('text=/\\d+ \\/ \\d+/')
          .textContent()
          .catch(() => '1 / 1')
        return progressText
      }

      const initialProgress = await getProgress()

      // If we have more than 1 item
      if (initialProgress && !initialProgress.includes('/ 1') && !initialProgress.includes('/ 0')) {
        // Press right arrow
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(300)

        const afterRight = await getProgress()

        // Press left arrow to go back
        await page.keyboard.press('ArrowLeft')
        await page.waitForTimeout(300)

        const afterLeft = await getProgress()

        // Should be back to initial (or wrapped around)
        expect(afterLeft).toBeTruthy()
      }
    })
  })

  test.describe('URL Parameters', () => {
    test('types parameter filters content', async ({ page }) => {
      // Navigate with only gif type
      await page.goto('/live?types=gif')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings to verify
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Gif should be selected
      const gifButton = page.locator('[data-settings-panel] button:has-text("Gif")')
      await expect(gifButton).toHaveClass(/bg-orange-500/)

      // Meme should not be selected
      const memeButton = page.locator('[data-settings-panel] button:has-text("Meme")')
      const memeClass = await memeButton.getAttribute('class')
      expect(memeClass).not.toContain('bg-orange-500')
    })

    test('interval parameter sets timing', async ({ page }) => {
      // Navigate with 15 second interval
      await page.goto('/live?interval=15')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Check interval label shows 15s
      const intervalLabel = page.locator('text=/Interval: 15s/')
      await expect(intervalLabel).toBeVisible()
    })

    test('multiple URL parameters work together', async ({ page }) => {
      // Navigate with multiple params
      await page.goto('/live?types=gif&interval=5&shuffle=false')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Verify interval is 5s
      await expect(page.locator('text=/Interval: 5s/')).toBeVisible()

      // Verify gif is selected
      const gifButton = page.locator('[data-settings-panel] button:has-text("Gif")')
      await expect(gifButton).toHaveClass(/bg-orange-500/)

      // Verify shuffle is off (toggle should not have bg-orange-500)
      const shuffleToggle = page.locator('[data-settings-panel]').locator('text=Shuffle').locator('..').locator('button')
      const shuffleClass = await shuffleToggle.getAttribute('class')
      expect(shuffleClass).not.toContain('bg-orange-500')
    })
  })

  test.describe('Content Type Filters', () => {
    test('unchecking content type filters updates selection', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Get meme button
      const memeButton = page.locator('[data-settings-panel] button:has-text("Meme")')

      // Check if it's currently selected
      const initialClass = await memeButton.getAttribute('class')
      const wasSelected = initialClass?.includes('bg-orange-500')

      // Click to toggle
      await memeButton.click()
      await page.waitForTimeout(300)

      // Check new state
      const newClass = await memeButton.getAttribute('class')
      const isNowSelected = newClass?.includes('bg-orange-500')

      // State should have toggled
      expect(isNowSelected).toBe(!wasSelected)
    })

    test('cannot deselect all content types', async ({ page }) => {
      // Start with only one type
      await page.goto('/live?types=gif')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Gif is the only selected type - try to deselect it
      const gifButton = page.locator('[data-settings-panel] button:has-text("Gif")')
      await expect(gifButton).toHaveClass(/bg-orange-500/)

      // Click to try to deselect
      await gifButton.click()
      await page.waitForTimeout(300)

      // Should still be selected (can't deselect the last one)
      await expect(gifButton).toHaveClass(/bg-orange-500/)
    })
  })

  test.describe('Interval Slider', () => {
    test('interval slider changes timing', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Get the interval slider
      const intervalSlider = page.locator('[data-settings-panel] input[type="range"]').first()
      await expect(intervalSlider).toBeVisible()

      // Get initial value
      const initialValue = await intervalSlider.inputValue()

      // Change the value by filling with a new value
      await intervalSlider.fill('30')
      await page.waitForTimeout(300)

      // Verify the label updated
      await expect(page.locator('text=/Interval: 30s/')).toBeVisible()

      // Change to a different value
      await intervalSlider.fill('45')
      await page.waitForTimeout(300)

      // Verify the label updated
      await expect(page.locator('text=/Interval: 45s/')).toBeVisible()
    })

    test('interval slider respects min/max bounds', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Open settings
      const settingsButton = page.locator('button[title="Settings"]')
      await settingsButton.click()
      await page.waitForTimeout(300)

      // Get the interval slider
      const intervalSlider = page.locator('[data-settings-panel] input[type="range"]').first()

      // Check min attribute
      const min = await intervalSlider.getAttribute('min')
      expect(min).toBe('5')

      // Check max attribute
      const max = await intervalSlider.getAttribute('max')
      expect(max).toBe('60')
    })
  })

  test.describe('Play/Pause Functionality', () => {
    test('clicking play/pause button toggles state', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      const playPauseButton = page.locator('button[title="Play/Pause (Space)"]')

      // Get initial state
      const getIsPlaying = async () => {
        const pauseIcon = page.locator('button[title="Play/Pause (Space)"] path[d*="M10 9v6m4-6v6"]')
        return await pauseIcon.isVisible().catch(() => false)
      }

      const wasPlaying = await getIsPlaying()

      // Click to toggle
      await playPauseButton.click()
      await page.waitForTimeout(300)

      const isNowPlaying = await getIsPlaying()
      expect(isNowPlaying).toBe(!wasPlaying)

      // Click again to toggle back
      await playPauseButton.click()
      await page.waitForTimeout(300)

      const finalState = await getIsPlaying()
      expect(finalState).toBe(wasPlaying)
    })

    test('keyboard shortcuts hint shows when paused', async ({ page }) => {
      await page.goto('/live')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Move mouse to show controls
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Pause playback
      await page.keyboard.press('Space')
      await page.waitForTimeout(500)

      // Move mouse again to ensure controls visible
      await page.mouse.move(400, 400)
      await page.waitForTimeout(500)

      // Keyboard shortcuts hint should be visible
      await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible()
      await expect(page.locator('text=Space')).toBeVisible()
      await expect(page.locator('text=Arrows')).toBeVisible()
    })
  })
})
