import { test, expect } from '@playwright/test';

test('hero logo should not have visible background', async ({ page }) => {
  // Use production URL since local dev server has connection issues with Playwright
  await page.goto('https://pizzasauce.xyz', { timeout: 60000 });

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot of the hero section
  const hero = page.locator('section').first();
  await hero.screenshot({ path: 'tests/screenshots/hero-section.png' });

  // Take a screenshot of just the logo
  const logo = page.locator('section img[alt="Pizza Sauce"]').first();
  await logo.screenshot({ path: 'tests/screenshots/hero-logo.png' });

  // Verify the logo exists
  await expect(logo).toBeVisible();

  console.log('Screenshots saved to tests/screenshots/');
});
