import { test, expect } from '@playwright/test';

test.describe('PC Homepage Tests (Production)', () => {
  test('Should load production homepage successfully', async ({ page }) => {
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
});
