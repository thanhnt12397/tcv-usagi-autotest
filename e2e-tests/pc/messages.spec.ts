import { test, expect } from '../fixtures/auth';

test.describe('PC - /tran/messages/{sid}', () => {
  test('TC19 - message detail > op-comment validation + seller message display', async ({
    authedPage: page,
  }) => {
    test.setTimeout(120000);

    await test.step('Step 1: Go to /tran/offers with date filter', async () => {
      await page.goto('/tran/offers?registerDateFrom=2026-06-17&registerDateTo=2026-06-24');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1')).toHaveText('オファー一覧');
    });

    await test.step('Step 2: Click SID 76380 → offer detail', async () => {
      await page.getByRole('link', { name: '76380', exact: true }).click();
      await expect(page).toHaveURL('/tran/offers/76380');
      await expect(page.locator('h1')).toHaveText('オファー詳細');
    });

    await test.step('Step 3: Click [メッセージ詳細を見る →] → verify message detail page', async () => {
      await page.getByRole('link', { name: 'メッセージ詳細を見る →' }).click();
      await expect(page).toHaveURL('/tran/messages/76380');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('メッセージ詳細');

      const h1 = page.locator('h1');
      await expect(h1).toContainText('メッセージ詳細');
      await expect(h1).toContainText('SID: 76380');
      await expect(h1).toContainText('Invoice No: 26815');

      // Display items: メッセージ and 運用者コメント
      await expect(page.getByText('メッセージ', { exact: true })).toBeVisible();
      await expect(page.getByText('運用者コメント', { exact: true })).toBeVisible();
    });

    await test.step('Step 4: Click [運用者コメント] → comment input shown', async () => {
      await page.getByRole('button', { name: '運用者コメント' }).click();
      await expect(page.locator('textarea[placeholder="コメントを入力"]')).toBeVisible();
    });

    await test.step('Step 5-6: Empty input + 送信 → required-field validation', async () => {
      // "Enter text: null" = leave the comment empty, then submit.
      await page.locator('textarea[placeholder="コメントを入力"]').fill('');
      await page.getByRole('button', { name: '送信' }).click();
      await expect(page.getByText('運用者コメントを入力してください。', { exact: true })).toBeVisible();
    });

    // Steps 7-8 in the spec describe sending the price-block text, but the expectation
    // (name セラー(代理), fixed date 2026/06/25 01:35, status 未読) matches the seller
    // message already present in the thread — a fresh 送信 would create an operator
    // comment dated today and never match. Per decision, verify the existing message
    // instead of mutating dev data.
    await test.step('Step 7-8: Verify seller message (price block) is displayed', async () => {
      const content = [
        '-- Calculate Your TOTAL PRICE --',
        'Displayed Total Price: US$101,808',
        'Details: C&F, Pre-ship inspection',
        'Country: Kenya',
        'Nearest port: MOMBASA',
      ];
      for (const line of content) {
        await expect(page.getByText(line, { exact: false }).first()).toBeVisible();
      }
      // special-char suffix only present on the seller (代理) message
      await expect(
        page.getByText('~!@#$%^&*()}""":L<MNBVCX', { exact: false }).first()
      ).toBeVisible();

      // meta block grouped with the expected timestamp 2026/06/25 01:35
      const metaBlock = page
        .getByText('2026/06/25 01:35', { exact: false })
        .first()
        .locator('xpath=ancestor::div[2]');
      await expect(metaBlock).toContainText('セラー(代理)');
      await expect(metaBlock).toContainText('suzuki_seller_d9');
      await expect(metaBlock).toContainText('(代理: thanhnt)');
      await expect(metaBlock).toContainText('2026/06/25 01:35');
      await expect(metaBlock).toContainText('未読');
    });
  });
});
