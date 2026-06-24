import { test, expect } from '@playwright/test';
import {
  navigateToLoginPage,
  verifyLoginPageLoaded,
  clickLoginButtonAndVerifyNavigation
} from '../helpers/login-helper';

/**
 * Ví dụ về cách viết test case theo các steps
 *
 * Các helper functions có sẵn:
 * 1. navigateToLoginPage(page) - Navigate đến trang login và chờ authentication
 * 2. verifyLoginPageLoaded(page) - Verify trang login đã load thành công
 * 3. clickLoginButtonAndVerifyNavigation(page, expectedUrl?) - Click button và verify navigation
 * 4. performLoginFlow(page, expectedUrl?) - Thực hiện toàn bộ flow login
 */

test.describe('PC Login Examples', () => {

  // Ví dụ 1: Sử dụng từng helper function riêng lẻ
  test('Example 1: Step by step login flow', async ({ page }) => {
    await test.step('Step 1: Navigate to login page', async () => {
      await navigateToLoginPage(page);
    });

    await test.step('Step 2: Verify page loaded', async () => {
      await verifyLoginPageLoaded(page);
    });

    await test.step('Step 3: Click login button', async () => {
      await clickLoginButtonAndVerifyNavigation(page);
    });
  });

  // Ví dụ 2: Sử dụng helper function tổng hợp
  /*  test('Example 2: Complete login flow in one step', async ({ page }) => {
    await test.step('Perform complete login flow', async () => {
      await performLoginFlow(page);
    });
  });*/

  // Ví dụ 3: Custom URL sau khi login
  test('Example 3: Login with custom expected URL', async ({ page }) => {
    await test.step('Login and navigate to custom URL', async () => {
      await navigateToLoginPage(page);
      await verifyLoginPageLoaded(page);

      // Custom URL mong muốn
      const customUrl = 'https://usagi.tcv-dev.com/dashboard';
      await clickLoginButtonAndVerifyNavigation(page, customUrl);
    });
  });

  // Ví dụ 4: Thêm các verification steps sau khi login
   /*  test('Example 4: Login and verify dashboard elements', async ({ page }) => {
    await test.step('Perform login', async () => {
      await performLoginFlow(page);
    });

    await test.step('Verify dashboard elements', async () => {
      // Thêm các verification cho dashboard sau khi login
      // Ví dụ:
      // await expect(page.locator('header')).toBeVisible();
      // await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });*/

  // Ví dụ 5: Viết test case với các steps chi tiết hơn
  test('Example 5: Detailed step-by-step test', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await navigateToLoginPage(page);
    });

    await test.step('Verify login page elements', async () => {
      await verifyLoginPageLoaded(page);

      // Verify các elements cụ thể trên trang login
      const loginButton = page.locator('body > div.bg-card > div.space-y-4 > button');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('ダッシュボードにログイン');
    });

    await test.step('Click login button and verify navigation', async () => {
      await clickLoginButtonAndVerifyNavigation(page);
    });

    await test.step('Verify homepage after login', async () => {
      await expect(page).toHaveURL('https://usagi.tcv-dev.com/');

      // Thêm các verification khác cho homepage
      const title = await page.title();
      expect(title).toBeTruthy();
      console.log('Homepage title:', title);
    });
  });
});
