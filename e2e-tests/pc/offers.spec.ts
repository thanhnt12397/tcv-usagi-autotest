import { Page, Locator } from '@playwright/test';
import { test, expect } from '../fixtures/auth';

// Combobox kiểu Radix (không phải <select> native): mở trigger rồi click option.
async function selectComboOption(page: Page, combo: Locator, optionLabel: string) {
  await combo.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
  await expect(combo).toContainText(optionLabel);
}

// Calendar react-day-picker (single mode). Day cell có aria-label kiểu
// "Saturday, April 25th, 2026". Mở trigger rồi lùi tháng đến khi thấy ngày cần.
async function pickCalendarDate(page: Page, triggerId: string, dayAria: RegExp) {
  await page.locator(`button#${triggerId}`).click();
  await page.waitForTimeout(400); // chờ popover mở xong (animation)
  for (let i = 0; i < 18; i++) {
    if (await page.getByRole('button', { name: dayAria }).count()) break;
    await page.getByRole('button', { name: 'Go to the Previous Month' }).click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300); // chờ slide tháng ổn định
  // rdp có animation liên tục → force click tránh "element is not stable".
  await page.getByRole('button', { name: dayAria }).first().click({ force: true });
  await page.waitForTimeout(300);
}

test.describe('PC - /tran/offers', () => {
  test('TC17 - Check /tran/offers > UI + toggle search item', async ({ authedPage: page }) => {
    test.setTimeout(120000);
    await test.step('Step 1: Go to /tran/offers with date filter and verify page', async () => {
      await page.goto('/tran/offers?registerDateFrom=2026-06-17&registerDateTo=2026-06-24');
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL('/tran/offers?registerDateFrom=2026-06-17&registerDateTo=2026-06-24');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('オファー一覧');

      await expect(page.locator('h1')).toHaveText('オファー一覧');
    });

    await test.step('Step 2: Click [V] icon to hide search item', async () => {
      // Khung tìm kiếm là Radix Collapsible; nút [V] là icon chevron (lucide-chevron-up)
      // có aria-controls/aria-expanded. Click → collapse, các field tìm kiếm bị ẩn.
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await expect(page.locator('input[name="sid"]')).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('input[name="sid"]')).toBeHidden();
    });

    await test.step('Step 3-4: Re-open search, enter SID=76382 and click 検索', async () => {
      // Mở lại khung tìm kiếm (đã collapse ở step 2) để nhập SID.
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await page.locator('input[name="sid"]').fill('76382');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/sid=76382/);
      await expect(page).toHaveURL(/registerDateFrom=2026-06-17/);
      await expect(page).toHaveURL(/registerDateTo=2026-06-24/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();
    });

    await test.step('Step 5: Clear SID via [X] icon', async () => {
      // Nút clear (X) là sibling ngay sau input, chỉ hiện khi input có giá trị.
      await page.locator('input[name="sid"] + button').click();
      await expect(page.locator('input[name="sid"]')).toHaveValue('');
    });

    await test.step('Step 6-7: Enter 車両ID (over-long) and search, expect validation error not 500', async () => {
      // Thu thập mọi response 5xx trong lúc search để khẳng định không có error 500.
      const serverErrors: number[] = [];
      page.on('response', (r) => {
        if (r.status() >= 500) serverErrors.push(r.status());
      });

      await page.locator('input[name="carItemId"]').fill('1111111111111111111111111111111111111');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/carItemId=1111111111111111111111111111111111111/);
      await expect(page).toHaveURL(/registerDateFrom=2026-06-17/);
      await expect(page).toHaveURL(/registerDateTo=2026-06-24/);

      await expect(
        page.getByText("The value '1.1111111111111112e+36' is not valid for CarItemId.")
      ).toBeVisible();

      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 8: Clear [X] at 申込日 and 車両ID fields', async () => {
      // Clear-X chỉ xoá hiển thị field (không tự search) — verified khi probe. Vì
      // step 8 không bấm 検索 nên chỉ assert field đã được xoá, không assert URL/kết quả.
      await page.locator('button#registerDateFrom + button').click();
      await page.locator('button#registerDateTo + button').click();
      await page.locator('input[name="carItemId"] + button').click();
      await expect(page.locator('button#registerDateFrom')).toHaveText('yyyy/mm/dd');
      await expect(page.locator('button#registerDateTo')).toHaveText('yyyy/mm/dd');
      await expect(page.locator('input[name="carItemId"]')).toHaveValue('');
    });

    await test.step('Step 9: Select 申込日 2026-04-25 ～ 2026-04-24 → invalid range', async () => {
      await pickCalendarDate(page, 'registerDateFrom', /April 25th, 2026/);
      await pickCalendarDate(page, 'registerDateTo', /April 24th, 2026/);
      await expect(page.getByText('開始日以降の日付を入力してください')).toBeVisible();
      await expect(page.getByRole('button', { name: '検索', exact: true })).toBeDisabled();
    });

    await test.step('Step 10: Re-select 申込日 To 2026-04-25 and search → no result', async () => {
      await pickCalendarDate(page, 'registerDateTo', /April 25th, 2026/);
      const searchBtn = page.getByRole('button', { name: '検索', exact: true });
      await expect(searchBtn).toBeEnabled();
      await searchBtn.click();
      await expect(page).toHaveURL(/registerDateFrom=2026-04-25/);
      await expect(page).toHaveURL(/registerDateTo=2026-04-25/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('条件に一致するオファーが見つかりません')).toBeVisible();
    });

    await test.step('Step 11: Click クリア → reset filters', async () => {
      await page.getByRole('button', { name: 'クリア', exact: true }).click();
      await expect(page).toHaveURL('/tran/offers');
    });

    await test.step('Step 12-16: Enter buyer/seller/country/PI filters and search → BuyerId invalid, no 500', async () => {
      // クリア trigger refetch + re-render form async, wipe giá trị nhập ngay sau đó
      // (flaky). Load lại trang sạch (tương đương trạng thái sau クリア) để nhập ổn định.
      await page.goto('/tran/offers');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const serverErrors: number[] = [];
      page.on('response', (r) => {
        if (r.status() >= 500) serverErrors.push(r.status());
      });

      await page.locator('input[name="buyerId"]').fill('1234567789000');
      await page.locator('input[name="sellerId"]').fill('2222');
      await selectComboOption(page, page.locator('label[for="buyerCountryNumber"] + button'), 'Japan');
      await selectComboOption(page, page.locator('label[for="isPIAuto"] + button'), '有り');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/buyerId=1234567789000/);
      await expect(page).toHaveURL(/sellerId=2222/);
      await expect(page).toHaveURL(/buyerCountryNumber=392/);
      await expect(page).toHaveURL(/isPIAuto=true/);
      await expect(
        page.getByText("The value '1234567789000' is not valid for BuyerId.")
      ).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 17: Click クリア → reset filters', async () => {
      await page.getByRole('button', { name: 'クリア', exact: true }).click();
      await expect(page).toHaveURL('/tran/offers');
    });

    await test.step('Step 18-20: Select メーカー / モデル / 取引進捗', async () => {
      // Load lại trang sạch để chọn combo ổn định (tránh wipe do re-render sau クリア).
      await page.goto('/tran/offers');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      await selectComboOption(page, page.locator('label[for="idMake"] + button'), 'ABARTH');
      await selectComboOption(page, page.locator('label[for="idModel"] + button'), 'ABARTH OTHERS');
      await selectComboOption(page, page.locator('label[for="messageStatus"] + button'), 'PI発行(期限切れ)');
    });

    await test.step('Step 21: Clear [X] at 申込日 (already empty after クリア)', async () => {
      // Sau クリア, 申込日 đã rỗng → nút X có thể không hiển thị; clear nếu có.
      const xFrom = page.locator('button#registerDateFrom + button');
      if (await xFrom.count()) await xFrom.click().catch(() => {});
    });

    await test.step('Step 22: Click 検索 → verify maker/model/status filters', async () => {
      await page.getByRole('button', { name: '検索', exact: true }).click();
      await expect(page).toHaveURL(/idMake=136/);
      await expect(page).toHaveURL(/idModel=51115/);
      await expect(page).toHaveURL(/messageStatus=piExpired/);
      await expect(page.getByText(/全 \d+ 件中 1 ～ \d+ 件を表示/)).toBeVisible();
      const totalText = await page.getByText(/全 \d+ 件中/).first().textContent();
      const total = Number(totalText!.match(/全 (\d+) 件中/)![1]);
      expect(total).toBeGreaterThan(1);
    });
  });

  test('TC18 - /tran/offers/{sid} detail > message display flow', async ({ authedPage: page }) => {
    test.setTimeout(120000);

    await test.step('Step 1: Go to /tran/offers with date filter', async () => {
      await page.goto('/tran/offers?registerDateFrom=2026-06-17&registerDateTo=2026-06-24');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1')).toHaveText('オファー一覧');
    });

    await test.step('Step 2: Click SID 76380 → verify offer detail page', async () => {
      await page.getByRole('link', { name: '76380', exact: true }).click();

      await expect(page).toHaveURL('/tran/offers/76380');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('オファー一覧');
      await expect(breadcrumb).toContainText('オファー詳細');

      await expect(page.locator('h1')).toHaveText('オファー詳細');

      await expect(page.getByText('申込情報', { exact: true })).toBeVisible();
      await expect(page.getByText('セラー情報', { exact: true })).toBeVisible();
      await expect(page.getByText('バイヤー情報', { exact: true })).toBeVisible();
      await expect(page.getByText('車両情報', { exact: true })).toBeVisible();
    });

    await test.step('Step 3: Click [メッセージを表示] → show メッセージ詳細 item', async () => {
      await page.getByRole('button', { name: 'メッセージを表示' }).click();
      await expect(page.getByText('メッセージ詳細', { exact: true })).toBeVisible();
    });

    await test.step('Step 4: Click [メッセージ詳細画面へ] → go to messages page', async () => {
      await page.getByRole('link', { name: 'メッセージ詳細画面へ' }).click();
      await expect(page).toHaveURL('/tran/messages/76380');
    });
  });
});
