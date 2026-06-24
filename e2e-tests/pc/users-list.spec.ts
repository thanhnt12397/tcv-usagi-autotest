import { Page, Locator } from '@playwright/test';
import { test, expect } from '../fixtures/auth';
import { clickLoginButtonAndVerifyNavigation } from '../helpers/login-helper';

// Date filters render as shadcn/react-day-picker calendar popovers (button shows
// "yyyy/mm/dd" until a date is picked); pick by data-day cell after navigating
// the Month/Year selects, since typing into the trigger button is not possible.
async function pickDate(page: Page, trigger: Locator, isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  const monthName = new Date(`${isoDate}T00:00:00`).toLocaleString('en-US', { month: 'short' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Choose the Month').selectOption({ label: monthName });
  await dialog.getByLabel('Choose the Year').selectOption(year);
  await dialog.locator(`[data-day="${isoDate}"] button`).click();
  await dialog.waitFor({ state: 'hidden' });
  // Confirm the form state actually committed before the caller moves on (e.g.
  // clicks 検索) — under load the dialog can close a tick before React re-renders.
  await expect(trigger).toContainText(`${year}/${month}/${day}`);
}

// ステータス/ロール/国 are custom Radix-style comboboxes (not native <select>),
// so selectOption() doesn't apply — open the trigger and click the listbox option.
async function selectComboOption(page: Page, combo: Locator, optionLabel: string) {
  await combo.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
  // Same race as pickDate: under load the listbox can close before React commits
  // the new value — wait until the trigger visibly reflects the picked option.
  await expect(combo).toContainText(optionLabel);
}

test.describe('PC - Function Users - Users List', () => {
  // TC03 logs in and lands on /accounts/users; TC04-06 continue in the SAME
  // page/session (serial mode + shared page) so they don't need to repeat the
  // Google IAP → ダッシュボードにログイン → ReturnUrl redirect dance.
  test.describe.configure({ mode: 'serial' });

  test('TC03 - Check Users list > UI', async ({ authedPage: page }) => {
    await test.step('Go to homepage', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      if (page.url().includes('/login')) {
        await clickLoginButtonAndVerifyNavigation(page);
      }
    });

    await test.step('Navigate: アカウント管理 > ユーザ一覧', async () => {
      // Sidebar labels are visually hidden (opacity-0) until hover; click the
      // accessible button/link instead of the inner text span.
      await page.getByRole('button', { name: 'アカウント管理' }).click();
      await page.getByRole('link', { name: 'ユーザ一覧' }).click();
    });

    await test.step('Verify URL, breadcrumb, H1, search title', async () => {
      await expect(page).toHaveURL('/accounts/users');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('アカウント管理');
      await expect(breadcrumb).toContainText('ユーザ一覧');

      await expect(page.locator('h1')).toHaveText('ユーザ一覧');
      await expect(page.getByText('検索条件')).toBeVisible();
    });

    await test.step('Verify search box contains expected fields', async () => {
      for (const text of ['ユーザID', 'メールアドレス', 'ステータス', 'すべて', 'ロール', '表示名', '電話番号', '国', '最終ログイン日時', '登録日時']) {
        await expect(page.getByText(text).first()).toBeVisible();
      }
    });
  });

  test('TC04 - Check Users list > Search', async ({ authedPage: page }) => {
    await page.goto('/accounts/users');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 4: Enter ユーザID=875990 and search', async () => {
      await page.getByPlaceholder('ユーザID').or(page.getByLabel('ユーザID')).fill('875990');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/\/accounts\/users\?.*id=875990/);
      await expect(page.getByRole('cell', { name: '875990' }).first()).toBeVisible();
    });

    await test.step('Step 6: Clear ユーザID', async () => {
      await page.locator('input[placeholder="ユーザIDを入力"] + button').click();
      await expect(page.getByPlaceholder('ユーザID').or(page.getByLabel('ユーザID'))).toHaveValue('');
    });

    await test.step('Step 7-8: Enter 表示名=thanh and search', async () => {
      await page.getByPlaceholder('表示名').or(page.getByLabel('表示名')).fill('thanh');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/\/accounts\/users\?.*displayName=thanh/);
      await expect(page.getByRole('cell', { name: /thanh/i }).first()).toBeVisible();
    });

    await test.step('Step 9-10: Select 最終ログイン日時 range and search', async () => {
      const dateButtons = page.locator('button:has(svg.lucide-calendar)');
      await pickDate(page, dateButtons.nth(0), '2026-02-23');
      await pickDate(page, dateButtons.nth(1), '2026-02-23');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/lastLoginAtFrom=2026-02-23.*lastLoginAtTo=2026-02-23/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
    });

    await test.step('Step 11: Clear 表示名', async () => {
      await page.locator('input[placeholder="表示名を入力"] + button').click();
      await expect(page.getByPlaceholder('表示名')).toHaveValue('');
    });

    await test.step('Step 12-19: Multi-filter search', async () => {
      // Reset filters first — Step 9-10 left a 最終ログイン日時 range applied that
      // would otherwise combine with the new criteria and zero out the match.
      await page.getByRole('button', { name: 'クリア' }).click();
      await expect(page).toHaveURL('/accounts/users');

      const emailInput = page.getByLabel('メールアドレス').or(page.getByPlaceholder('メールアドレス'));
      const phoneInput = page.getByLabel('電話番号').or(page.getByPlaceholder('電話番号'));
      await emailInput.fill('thanhnt@zigexn.vn');
      await phoneInput.fill('0981861865');
      // Same race as pickDate/selectComboOption: confirm values committed before
      // 検索 fires, otherwise the form can submit on stale (empty) state under load.
      await expect(emailInput).toHaveValue('thanhnt@zigexn.vn');
      await expect(phoneInput).toHaveValue('0981861865');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/email=thanhnt%40zigexn.vn/);
      await expect(page).toHaveURL(/phone=0981861865/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();

      // This account is the test runner's own login, so 最終ログイン日時 is "today"
      // and shifts every run — read the live value instead of hardcoding a date.
      const lastLoginCell = await page.getByRole('row').nth(1).getByRole('cell').nth(6).textContent();
      const lastLoginDate = lastLoginCell!.trim().slice(0, 10).replace(/\//g, '-');

      const filterCombos = page.getByRole('combobox');
      await selectComboOption(page, filterCombos.nth(0), '有効');     // ステータス
      await selectComboOption(page, filterCombos.nth(1), 'バイヤー'); // ロール
      await selectComboOption(page, filterCombos.nth(2), 'Viet Nam'); // 国

      const dateButtons = page.locator('button:has(svg.lucide-calendar)');
      await pickDate(page, dateButtons.nth(0), lastLoginDate);
      await pickDate(page, dateButtons.nth(1), lastLoginDate);
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/email=thanhnt%40zigexn.vn/);
      await expect(page).toHaveURL(/phone=0981861865/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();
      await expect(page.getByRole('button', { name: 'CSVダウンロード' })).not.toBeDisabled();
    });

    await test.step('Step 18: Add 登録日時 filter', async () => {
      const dateButtons = page.locator('button:has(svg.lucide-calendar)');
      await pickDate(page, dateButtons.nth(2), '2026-02-23');
      await pickDate(page, dateButtons.nth(3), '2026-02-23');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/registeredAtFrom=2026-02-23/);
      await expect(page.getByText('条件に一致するユーザが見つかりません')).toBeVisible();
    });

    await test.step('Step 19: Clear from date of 登録日時', async () => {
      await page.locator('#registeredAtFrom + button').click();
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).not.toHaveURL(/registeredAtFrom/);
    });
  });

  test('TC05 - Check Users list > Pagination + 表示件数', async ({ authedPage: page }) => {
    await page.goto('/accounts/users');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 20: Click クリア and verify reset', async () => {
      await page.getByRole('button', { name: 'クリア' }).click();
      await expect(page).toHaveURL('/accounts/users');
    });

    await test.step('Step 21: Select 表示件数=50件', async () => {
      // 表示件数 is the same Radix-style combobox pattern as ステータス/ロール/国 — not a native <select>.
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '件' }), '50件');
      await expect(page).toHaveURL(/pageSize=50/);
    });

    await test.step('Step 22: Click page 5', async () => {
      await page.getByRole('button', { name: '5', exact: true }).click();
      await expect(page).toHaveURL(/pageSize=50.*page=5/);
    });

    await test.step('Step 23: Select 表示件数=100件', async () => {
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '件' }), '100件');
      // App omits "page=1" from the URL when resetting to the first page (only non-default pages get a param).
      await expect(page).toHaveURL(/pageSize=100(&page=1)?$/);
    });

    await test.step('Step 24: Click 次へ', async () => {
      await page.getByRole('button', { name: '次へ' }).click();
      await expect(page).toHaveURL(/pageSize=100.*page=2/);
    });
  });

  test('TC06 - Check Users list > Sort + CSVダウンロード', async ({ authedPage: page }) => {
    await page.goto('/accounts/users');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 25: Click sort on each column', async () => {
      for (const col of ['ユーザID', '表示名', 'ステータス', '国', '最終ログイン日時', 'ロール', '登録日時']) {
        await page.getByText(col).first().click();
        await page.waitForLoadState('domcontentloaded');
      }
    });

    await test.step('Step 26: Download CSV', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'CSVダウンロード' }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    });

    await test.step('Step 27: Click first ユーザID link and verify detail page', async () => {
      await page.goto('/accounts/users');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('row').nth(1).getByRole('link').first().click();
      await expect(page).toHaveURL(/\/accounts\/users\/\d+/);
      await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'ユーザ詳細' })).toBeVisible();
    });
  });
});
