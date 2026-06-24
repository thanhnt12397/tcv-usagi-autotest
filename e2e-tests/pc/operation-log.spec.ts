import { Page, Locator } from '@playwright/test';
import { test, expect } from '../fixtures/auth';

// カテゴリー/表示件数 là Radix-style combobox (không phải <select> native), nên
// selectOption() không dùng được — mở trigger rồi click option trong listbox.
async function selectComboOption(page: Page, combo: Locator, optionLabel: string) {
  await combo.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
  await expect(combo).toContainText(optionLabel);
}

test.describe('PC - /system/operationlog', () => {
  test.describe.configure({ mode: 'serial' });

  test('TC13 - Check /system/operationlog > UI', async ({ authedPage: page }) => {
    await test.step('Step 1-2: Go to homepage and click システム管理', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      // Sidebar labels are visually hidden (opacity-0) until hover; click the
      // accessible button/link instead of the inner text span.
      await page.getByRole('button', { name: 'システム管理' }).click();
    });

    await test.step('Step 3: Click 操作ログ and verify page', async () => {
      await page.getByRole('link', { name: '操作ログ' }).click();
      await expect(page).toHaveURL('/system/operationlog');
      await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
      await expect(page.locator('h1')).toHaveText('操作ログ');
      for (const col of ['操作日時', '操作ユーザ', 'カテゴリー', 'アクション', 'IPアドレス', 'フロントエンドURL', 'API URL']) {
        await expect(page.getByText(col).first()).toBeVisible();
      }
    });
  });

  test('TC14 - Check /system/operationlog > Search', async ({ authedPage: page }) => {
    await page.goto('/system/operationlog');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 4-5: Enter 操作ユーザ with special chars and search', async () => {
      // Input có name=opeUserName, label[for] không khớp id (input không có id) nên
      // getByLabel/getByPlaceholder không bắt được — locate theo name.
      await page.locator('input[name="opeUserName"]').fill('875990~!@#$%^&*()_+');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/\/system\/operationlog\?.*opeUserName=875990/);
      await expect(page.getByText('条件に一致するログが見つかりません')).toBeVisible();
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
    });

    await test.step('Step 6: Clear 操作ユーザ filter', async () => {
      // Nút clear (X) là sibling ngay sau input, chỉ hiện khi input có giá trị.
      await page.locator('input[name="opeUserName"] + button').click();
    });

    await test.step('Step 7-8: Enter アクション=thanh and search', async () => {
      await page.locator('input[name="action"]').fill('thanh');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/\/system\/operationlog\?.*action=thanh/);
      await expect(page.getByText('条件に一致するログが見つかりません')).toBeVisible();
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
    });

    await test.step('Step 9-10: Select 期間 and search', async () => {
      await page.locator('#dtCreateDateFrom').fill('2026-02-25T08:04');
      await page.locator('#dtCreateDateTo').fill('2026-02-25T08:04');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/dtCreateDateFrom=2026-02-25/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
    });

    await test.step('Step 11: Clear アクション filter', async () => {
      await page.locator('input[name="action"] + button').click();
    });

    await test.step('Step 12-15: Multi-filter search', async () => {
      await page.locator('input[name="ipAddress"]').fill('1234567789000');
      await page.locator('input[name="frontendPath"]').fill('User/thanh/');
      await page.locator('input[name="apiPath"]').fill('Patch/thanh/');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/ipAddress=1234567789000/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
    });

    await test.step('Step 16: Click クリア and verify reset', async () => {
      await page.getByRole('button', { name: 'クリア' }).click();
      await expect(page).toHaveURL('/system/operationlog');
    });

    await test.step('Step 17-21: Search with valid filters and verify 2 results', async () => {
      await page.locator('input[name="opeUserName"]').fill('ngoc.t');
      await page.locator('input[name="action"]').fill('user.bank.update');
      await page.locator('input[name="ipAddress"]').fill('39.110.206.184');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/opeUserName=ngoc\.t/);
      await expect(page).toHaveURL(/action=user\.bank\.update/);
      // Số log khớp filter này tăng theo thời gian (lúc viết test là 2, nay 4) — đọc
      // tổng từ message rồi so với số dòng thay vì hardcode, tránh drift về sau.
      await expect(page.getByText(/全 \d+ 件中 1 ～ \d+ 件を表示/)).toBeVisible();
      const totalText = await page.getByText(/全 \d+ 件中/).first().textContent();
      const total = Number(totalText!.match(/全 (\d+) 件中/)![1]);
      expect(total).toBeGreaterThan(0);
      await expect(page.locator('tbody tr')).toHaveCount(total);
    });
  });

  test('TC15 - Check /system/operationlog > Pagination + 表示件数', async ({ authedPage: page }) => {
    await page.goto('/system/operationlog');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 22: Click クリア and verify reset', async () => {
      await page.getByRole('button', { name: 'クリア' }).click();
      await expect(page).toHaveURL('/system/operationlog');
    });

    await test.step('Step 23: Select 表示件数=50件', async () => {
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '件' }), '50件');
      await expect(page).toHaveURL(/pageSize=50/);
      await expect(page.getByText(/全 \d+ 件中 1 ～ 50 件を表示/)).toBeVisible();
    });

    await test.step('Step 24: Click page 3', async () => {
      await page.getByRole('button', { name: '3', exact: true }).click();
      await expect(page).toHaveURL(/pageSize=50.*page=3/);
      await expect(page.getByText(/全 \d+ 件中 101 ～/)).toBeVisible();
    });

    await test.step('Step 25: Select 表示件数=100件', async () => {
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '件' }), '100件');
      await expect(page).toHaveURL(/pageSize=100/);
      await expect(page.getByText(/全 \d+ 件中 1 ～ 100 件を表示/)).toBeVisible();
    });

    await test.step('Step 26: Click 次へ', async () => {
      await page.getByRole('button', { name: '次へ' }).click();
      await expect(page).toHaveURL(/pageSize=100.*page=2/);
      await expect(page.getByText(/全 \d+ 件中 101 ～/)).toBeVisible();
    });
  });

  test('TC16 - Check /system/operationlog > フロントエンドURL navigation', async ({ authedPage: page }) => {
    await page.goto('/system/operationlog');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 27: Click first フロントエンドURL link', async () => {
      // Log mới nhất phần lớn là /tran/... — lọc theo frontendPath để chắc chắn có
      // dòng trỏ tới /accounts/users/. Tab đích thay đổi theo log (basic-info/profile/
      // permissions...) nên không assert tab cụ thể.
      await page.locator('input[name="frontendPath"]').fill('/accounts/users/');
      await page.getByRole('button', { name: '検索' }).click();
      await expect(page).toHaveURL(/frontendPath=/);
      await page.locator('tbody td a[href*="/accounts/users/"]').first().click();
      await expect(page).toHaveURL(/\/accounts\/users\/\d+/);
      await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
      await expect(page.getByText('ユーザ詳細').first()).toBeVisible();
    });

    await test.step('Step 28: Click ユーザ一覧 in breadcrumb', async () => {
      // Cả breadcrumb lẫn sidebar đều có link ユーザ一覧 → scope vào breadcrumb cho khỏi
      // strict-mode violation.
      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await breadcrumb.getByRole('link', { name: 'ユーザ一覧' }).click();
      await expect(page).toHaveURL('/accounts/users');
    });

    await test.step('Step 29: Click ホーム in breadcrumb', async () => {
      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await breadcrumb.getByRole('link', { name: 'ホーム' }).click();
      await expect(page).toHaveURL('/');
    });
  });
});
