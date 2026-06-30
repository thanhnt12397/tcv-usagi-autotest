import { test as base, expect, Page } from '@playwright/test';
import { clickLoginButtonAndVerifyNavigation } from '../helpers/login-helper';

type WorkerFixtures = { authedPage: Page };

/**
 * Worker-scoped authenticated page.
 *
 * Tạo 1 context + page duy nhất cho cả worker, login đúng 1 lần, rồi dùng chung
 * page đó cho mọi test trong worker. Nhờ workers:1 (xem playwright.config.ts),
 * mọi TC của 1 project chạy tuần tự trên cùng 1 trình duyệt → không login lại.
 */
export const test = base.extend<{}, WorkerFixtures>({
  authedPage: [async ({ browser }, use, workerInfo) => {
    // Kế thừa device profile (Desktop Chrome / Pixel 7) + storageState + baseURL
    // + ignoreHTTPSErrors từ project. browser.newContext() KHÔNG tự áp project.use,
    // nên phải spread thủ công.
    const context = await browser.newContext({ ...workerInfo.project.use });
    const page = await context.newPage();

    // Login đúng 1 lần / worker
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    if (page.url().includes('/login')) {
      await clickLoginButtonAndVerifyNavigation(page);
    }

    await use(page); // CÙNG 1 page cho mọi test trong worker
    await context.close();
  }, { scope: 'worker' }],
});

export { expect };
