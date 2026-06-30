import { Page, expect } from '@playwright/test';
import { waitForAuthentication, isAuthenticated } from './auth-helper';

/**
 * Navigate đến trang login và chờ authentication
 */
export async function navigateToLoginPage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Chờ authentication nếu cần
  if (!(await isAuthenticated(page))) {
    await waitForAuthentication(page);
  }
}

/**
 * Verify trang login đã load thành công
 */
export async function verifyLoginPageLoaded(page: Page) {
  await expect(page).toHaveURL(/.*usagi.*/);

  const title = await page.title();
  expect(title).toBeTruthy();
}

/**
 * Click button "ダッシュボードにログイン" và verify navigation đến homepage
 */
export async function clickLoginButtonAndVerifyNavigation(page: Page, expectedUrl: string = 'https://usagi.tcv-dev.com/') {
  // Step 1: Click button "ダッシュボードにログイン"
  const loginButton = page.locator('body > div.bg-card > div.space-y-4 > button');

  // Verify button visible và có đúng text trước khi click
  await loginButton.waitFor({ state: 'visible', timeout: 10000 });
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toContainText('ダッシュボードにログイン');

  // Chờ IAP session thiết lập xong (background request) trước khi click,
  // nếu không route guard ở '/' sẽ bounce ngược về '/login'.
  await page.waitForLoadState('networkidle').catch(() => {});

  // Click button và chờ navigation đến URL mong muốn
  await Promise.all([
    page.waitForURL(expectedUrl, { timeout: 30000 }),
    loginButton.click()
  ]);

  // Chờ trang load hoàn tất
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // Ignore nếu timeout, có thể trang không có network idle
  });

  // Step 2: Check result - verify trang hiển thị URL mong muốn
  await expect(page).toHaveURL(expectedUrl);
}
