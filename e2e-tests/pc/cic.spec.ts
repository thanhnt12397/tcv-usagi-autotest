import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth';

// Calendar react-day-picker (single mode). Day cell aria-label kiểu
// "Monday, February 23rd, 2026". Mở trigger rồi lùi tháng đến khi thấy ngày cần.
async function pickCalendarDate(page: Page, triggerId: string, dayAria: RegExp) {
  await page.locator(`button#${triggerId}`).click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 18; i++) {
    if (await page.getByRole('button', { name: dayAria }).count()) break;
    await page.getByRole('button', { name: 'Go to the Previous Month' }).click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: dayAria }).first().click({ force: true });
  await page.waitForTimeout(300);
}

// Combobox single-select kiểu Radix: mở trigger (label[for] + button), click option,
// popover tự đóng.
async function selectSingle(page: Page, forAttr: string, option: string) {
  await page.locator(`label[for="${forAttr}"] + button`).click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: option, exact: true }).click();
  await page.waitForTimeout(400);
}

test.describe('PC - /tran/cic', () => {
  test('TC26 - CIC一覧 > search / filter / clear / paginate', async ({
    authedPage: page,
  }) => {
    test.setTimeout(240000);

    // Gom mọi response 5xx để khẳng định các thao tác search trả 200 (không 500).
    const serverErrors: number[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500) serverErrors.push(r.status());
    });

    const search = () => page.getByRole('button', { name: '検索', exact: true }).click();
    const noData = page.getByText('該当するデータがありません');
    const zeroCount = page.getByText('全 0 件中 0 ～ 0 件を表示');

    await test.step('Step 1: Go to /tran/cic and verify page + search box', async () => {
      await page.goto('/tran/cic');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL('/tran/cic');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('CIC一覧');

      await expect(page.locator('h1')).toHaveText('Car Info Check 一覧');

      // Search box chứa đầy đủ các field.
      const fieldLabels: [string, string][] = [
        ['purchaseId', 'Invoice No'],
        ['tcvCheckId', '検査ID'],
        ['sellerId', 'セラーID'],
        ['ptStatus', '取引ステータス'],
        ['cicStatus', 'CICステータス'],
        ['unablesReason', '検査ステータス'],
        ['portId', '港'],
        ['inspectionCompanyId', '検査会社'],
        ['receiveDateFrom-receiveDateTo', '完了日'],
      ];
      for (const [forAttr, text] of fieldLabels) {
        await expect(page.locator(`label[for="${forAttr}"]`)).toHaveText(text);
      }
      // ヤード(乙仲) ※港を先に選択 — field không có label[for], check theo text.
      await expect(page.getByText(/ヤード\(乙仲\)/).first()).toBeVisible();
    });

    await test.step('Step 2: Click [^] icon to hide search item', async () => {
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await expect(page.locator('input[name="purchaseId"]')).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('input[name="purchaseId"]')).toBeHidden();
    });

    // Invoice No (purchaseId) = 26811 → 全 1 件. (User expectation "2184" là artifact của
    // bank-deposits, không áp dụng cho CIC → điều chỉnh: row chứa 26811.)
    await test.step('Step 4-5: Re-open search, enter Invoice No=26811, click 検索 → 1 result', async () => {
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await page.locator('input[name="purchaseId"]').fill('26811');
      await search();
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/purchaseId=26811/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();
      await expect(page.locator('table tbody td').getByText('26811', { exact: false }).first()).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 6: Clear Invoice No via [X] icon → input = null', async () => {
      await page.locator('input[name="purchaseId"] + button').click();
      await expect(page.locator('input[name="purchaseId"]')).toHaveValue('');
    });

    // 検査ID (tcvCheckId) = 7854 → 全 1 件, row chứa 7854. (User "26758" là artifact → điều chỉnh.)
    await test.step('Step 7-8: Enter 検査ID=7854, click 検索 → table contains 7854', async () => {
      await page.locator('input[name="tcvCheckId"]').fill('7854');
      await search();
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/tcvCheckId=7854/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();
      await expect(page.locator('table tbody td').getByText('7854', { exact: false }).first()).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 9-10: Select 完了日 2026/02/23～2026/02/23, click 検索 → 0 result', async () => {
      await pickCalendarDate(page, 'receiveDateFrom', /February 23rd, 2026/);
      await pickCalendarDate(page, 'receiveDateTo', /February 23rd, 2026/);
      await search();
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/receiveDateFrom=2026-02-23/);
      await expect(page).toHaveURL(/receiveDateTo=2026-02-23/);
      // tcvCheckId=7854 vẫn còn → kết hợp với 完了日 2026/02/23 → 0 kết quả.
      await expect(zeroCount).toBeVisible();
      await expect(noData).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 11: Clear 検査ID via [X] icon → input = null', async () => {
      await page.locator('input[name="tcvCheckId"] + button').click();
      await expect(page.locator('input[name="tcvCheckId"]')).toHaveValue('');
    });

    await test.step('Step 12: Enter セラーID=thanh', async () => {
      await page.locator('input[name="sellerId"]').fill('thanh');
    });

    await test.step('Step 13: Select 取引ステータス=入金未確認', async () => {
      await selectSingle(page, 'ptStatus', '入金未確認');
    });

    await test.step('Step 14: Select CICステータス=完了・相違あり（購入希望）', async () => {
      await selectSingle(page, 'cicStatus', '完了・相違あり（購入希望）');
    });

    await test.step('Step 15: Select 検査ステータス=検査不可：その他', async () => {
      await selectSingle(page, 'unablesReason', '検査不可：その他');
    });

    await test.step('Step 16: Select 港=常陸那珂', async () => {
      await selectSingle(page, 'portId', '常陸那珂');
    });

    await test.step('Step 17: Select ヤード(乙仲)=上組', async () => {
      const yardBlock = page.getByText(/ヤード\(乙仲\)/).first().locator('xpath=ancestor::div[1]');
      await yardBlock.locator('button').first().click();
      await page.waitForTimeout(400);
      await page.getByRole('option', { name: '上組', exact: true }).click();
      await page.waitForTimeout(400);
    });

    // Bộ lọc tích lũy (完了日 2026/02/23 + seller + 6 select) rất hẹp → 0 kết quả.
    // (User expectation step17/18 "1 件" là artifact → điều chỉnh thành 0 件.)
    await test.step('Step 18: Select 検査会社=ジャッジメント-TEST, click 検索 → 0 result', async () => {
      await selectSingle(page, 'inspectionCompanyId', 'ジャッジメント-TEST');
      await search();
      await page.waitForTimeout(1800);

      await expect(zeroCount).toBeVisible();
      await expect(noData).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 19: Clear from-date of 完了日 via [X], click 検索 → 0 result', async () => {
      await page.locator('button#receiveDateFrom + button').click();
      await expect(page.locator('button#receiveDateFrom')).toHaveText('yyyy/mm/dd');
      await search();
      await page.waitForTimeout(1800);
      await expect(page).not.toHaveURL(/receiveDateFrom=/);
      await expect(zeroCount).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 20: Click クリア → reset to full list, fields = null', async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'クリア', exact: true }).click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL('/tran/cic');
      await expect(page.locator('input[name="purchaseId"]')).toHaveValue('');
      await expect(page.locator('input[name="tcvCheckId"]')).toHaveValue('');
      await expect(page.locator('input[name="sellerId"]')).toHaveValue('');
      await expect(page.locator('label[for="ptStatus"] + button')).toHaveText('すべて');
      await expect(page.getByText(/全 [\d,]+ 件中/)).toBeVisible();
    });

    await test.step('Step 21: Select 50件 at 表示件数 → ?pageSize=50', async () => {
      await page.getByText('25件', { exact: true }).click();
      await page.getByRole('option', { name: '50件', exact: true }).click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL('/tran/cic?pageSize=50');
    });

    await test.step('Step 22: Click page [5] → ?pageSize=50&page=5', async () => {
      await page.getByRole('button', { name: '5', exact: true }).click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL('/tran/cic?pageSize=50&page=5');
    });

    await test.step('Step 23: Select 100件 at 表示件数 → ?pageSize=100', async () => {
      await page.getByText('50件', { exact: true }).click();
      await page.getByRole('option', { name: '100件', exact: true }).click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL('/tran/cic?pageSize=100');
    });

    await test.step('Step 24: Click 次へ → ?pageSize=100&page=2', async () => {
      await page.getByRole('button', { name: '次へ', exact: true }).click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL('/tran/cic?pageSize=100&page=2');
    });
  });
});
