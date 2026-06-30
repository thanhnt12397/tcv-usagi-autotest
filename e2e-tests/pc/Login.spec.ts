import { test, expect } from '@playwright/test';
import { waitForAuthentication, isAuthenticated } from '../helpers/auth-helper';

test.describe('PC Login Tests', () => {
  test('Should load login page successfully' , async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Wait for authentication if needed', async () => {
      // Nếu chưa được authenticate (vẫn ở trang Google sign-in), chờ authentication
      if (!(await isAuthenticated(page))) {
        await waitForAuthentication(page);
      }
    });
    await test.step('Verify page title: ログイン', async () => {

      await expect(page).toHaveURL('https://usagi.tcv-dev.com/login');

      // Verify page title - có thể là "ログイン" hoặc "usagi" tùy theo trang
      const title = await page.title();
      expect(title).toBeTruthy();

      // Verify title có chứa "ログイン" hoặc "usagi" (tùy theo implementation)
      if (!title.includes('ログイン') && !title.includes('usagi')) {
        throw new Error(`Expected title to contain "ログイン" or "usagi" but got "${title}"`);
      }
    });

    await test.step('Step 1: Click button "ダッシュボードにログイン"', async () => {
      // Tìm button với locator
      const loginButton = page.locator('body > div.bg-card > div.space-y-4 > button');

      // Verify button visible và có text đúng
      await loginButton.waitFor({ state: 'visible', timeout: 10000 });
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('ダッシュボードにログイン');

      // Chờ IAP session thiết lập xong (background request) trước khi click,
      // nếu không route guard ở '/' sẽ bounce ngược về '/login'.
      await page.waitForLoadState('networkidle').catch(() => {});

      // Click button và chờ navigation
      const expectedUrl = 'https://usagi.tcv-dev.com/';
      await Promise.all([
        page.waitForURL(expectedUrl, { timeout: 30000 }),
        loginButton.click()
      ]);
    });

    await test.step('Verify display URL https://usagi.tcv-dev.com/', async () => {
      const expectedUrl = 'https://usagi.tcv-dev.com/';

      // Chờ navigation đến URL mong muốn bằng waitForURL() (đã chờ ở step trước)
      // Chờ trang load hoàn tất
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        // Ignore nếu timeout
      });

      // Verify URL sau khi click
      await expect(page).toHaveURL(expectedUrl);
    });
  });
});
