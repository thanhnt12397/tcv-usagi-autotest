import { test, expect } from '@playwright/test';
import { waitForAuthentication, isAuthenticated } from '../helpers/auth-helper';
import {
  navigateToLoginPage,
  verifyLoginPageLoaded,
  clickLoginButtonAndVerifyNavigation,
} from '../helpers/login-helper';

test.describe('PC Login Tests', () => {
  test('Should load login page successfully' , async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await navigateToLoginPage(page);
    });

    await test.step('Verify page is loaded', async () => {
      await verifyLoginPageLoaded(page);
    });

    await test.step('Click button "ダッシュボードにログイン"', async () => {
      await clickLoginButtonAndVerifyNavigation(page);
    });
  });


  test('Should have main content visible', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    await test.step('Wait for page to be fully loaded', async () => {
      await page.waitForLoadState('networkidle');
    });

    // Add more specific tests based on Usagi homepage structure
    // Example:
    // await test.step('Verify main elements', async () => {
    //   await expect(page.locator('header')).toBeVisible();
    //   await expect(page.locator('main')).toBeVisible();
    //   await expect(page.locator('footer')).toBeVisible();
    // });
  });
});
