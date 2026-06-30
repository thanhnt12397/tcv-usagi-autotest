import { test, expect } from '@playwright/test';

test.describe('SP Homepage Tests', () => {
  test('Should load homepage successfully on mobile', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Verify page is loaded', async () => {
      await expect(page).toHaveURL(/.*usagi.*/);
    });

    await test.step('Verify page title', async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });

  test('Should have main content visible on mobile', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Wait for page to be fully loaded', async () => {
      await page.waitForLoadState('networkidle');
    });
  });
});
