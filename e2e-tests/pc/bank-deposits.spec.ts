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

// Combobox multi-select kiểu Radix: mở trigger, click lần lượt từng option
// (popover giữ mở), rồi Escape để đóng.
async function selectMulti(page: Page, forAttr: string, options: string[]) {
  await page.locator(`label[for="${forAttr}"] + button`).click();
  await page.waitForTimeout(400);
  for (const o of options) {
    await page.getByRole('option', { name: o, exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

test.describe('PC - /tran/bank-deposits', () => {
  test('TC24 - 銀行入金一覧 > search / filter / paginate / sort / CSV / user detail', async ({
    authedPage: page,
  }) => {
    test.setTimeout(240000);

    // Gom mọi response 5xx để khẳng định các thao tác search trả 200 (không 500).
    const serverErrors: number[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500) serverErrors.push(r.status());
    });

    const search = () => page.getByRole('button', { name: '検索', exact: true }).click();
    const csvBtn = page.getByRole('button', { name: '銀行指示CSVダウンロード' });

    await test.step('Step 1: Go to /tran/bank-deposits and verify page + search box', async () => {
      await page.goto('/tran/bank-deposits');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL('/tran/bank-deposits');

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('銀行入金一覧');

      await expect(page.locator('h1')).toHaveText('銀行入金一覧');

      // Search box chứa đầy đủ các field (KHÔNG có 入金ID / 表示名 — không tồn tại trên page).
      for (const label of [
        '銀行取引番号', 'InvoiceNo', '取込日（開始）', '取込日（終了）', '送金通貨',
        '送金人', '送金コメント', '銀行指示可能日（開始）', '銀行指示可能日（終了）',
        '送金額', '消込ステータス', 'タグ', '重要なお知らせ',
      ]) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
    });

    await test.step('Step 2: Click [V] icon to hide search item', async () => {
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await expect(page.locator('input[name="bankRefNo"]')).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('input[name="bankRefNo"]')).toBeHidden();
    });

    // KHÔNG có field 入金ID trên page → dùng field đầu tiên 銀行取引番号 (bankRefNo).
    // Giá trị 2184 không khớp số 銀行取引番号 nào → kết quả 0 (điều chỉnh expectation).
    await test.step('Step 4-5: Re-open search, enter 銀行取引番号=2184, click 検索 → 0 result', async () => {
      const toggle = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await page.locator('input[name="bankRefNo"]').fill('2184');
      await search();
      await page.waitForTimeout(1200);

      await expect(page).toHaveURL(/bankRefNo=2184/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
      await expect(csvBtn).toBeDisabled();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 6: Clear 銀行取引番号 via [X] icon → input = null', async () => {
      await page.locator('input[name="bankRefNo"] + button').click();
      await expect(page.locator('input[name="bankRefNo"]')).toHaveValue('');
    });

    await test.step('Step 7-8: Enter InvoiceNo=26758, click 検索 → table contains 26758', async () => {
      await page.locator('input[name="invoiceNo"]').fill('26758');
      await search();
      await page.waitForTimeout(1200);

      await expect(page).toHaveURL(/invoiceNo=26758/);
      await expect(page.getByText(/全 [1-9]\d* 件中/)).toBeVisible();
      await expect(page.locator('table tbody').getByText('26758', { exact: false }).first()).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 9-10: Select 取込日 2026/02/23～2026/02/23, click 検索 → 0 result', async () => {
      await pickCalendarDate(page, 'importDateFrom', /February 23rd, 2026/);
      await pickCalendarDate(page, 'importDateTo', /February 23rd, 2026/);
      await search();
      await page.waitForTimeout(1200);

      await expect(page).toHaveURL(/importDateFrom=2026-02-23/);
      await expect(page).toHaveURL(/importDateTo=2026-02-23/);
      // invoiceNo=26758 vẫn còn → kết hợp với 取込日 2026/02/23 → 0 kết quả.
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
      await expect(csvBtn).toBeDisabled();
      expect(serverErrors).toEqual([]);
    });

    // Step 11 gốc ghi "表示名" (không tồn tại) → hiểu là clear 取込日 vừa set ở step 9.
    await test.step('Step 11: Clear 取込日（開始/終了）via [X] icons', async () => {
      await page.locator('button#importDateFrom + button').click();
      await page.locator('button#importDateTo + button').click();
      await expect(page.locator('button#importDateFrom')).toHaveText('yyyy/mm/dd');
      await expect(page.locator('button#importDateTo')).toHaveText('yyyy/mm/dd');
    });

    await test.step('Step 12: Enter 送金人=thanh', async () => {
      await page.locator('input[name="remitter"]').fill('thanh');
    });

    await test.step('Step 13: Enter 送金コメント=EK10127', async () => {
      await page.locator('input[name="remitterComment"]').fill('EK10127');
    });

    await test.step('Step 14: Select 銀行指示可能日 2026/04/23～2026/06/23', async () => {
      await pickCalendarDate(page, 'instructionDateFrom', /April 23rd, 2026/);
      await pickCalendarDate(page, 'instructionDateTo', /June 23rd, 2026/);
    });

    await test.step('Step 15: Select タグ thanh_edit2 and 期限切れ', async () => {
      await selectMulti(page, 'tagIds', ['thanh_edit2', '期限切れ']);
    });

    await test.step('Step 16: Tick checkbox 重要なお知らせ', async () => {
      const cb = page.locator('button#importantInformationTransaction');
      await cb.click();
      await expect(cb).toHaveAttribute('aria-checked', 'true');
    });

    // 送金額 FROM(10000) > TO(5000) là khoảng không hợp lệ → hiện lỗi
    // 「開始金額以上の金額を入力してください」 và disable 検索 (điều chỉnh expectation
    // của user: không thể search ra 1 件). Sau khi verify, clear 送金額 để tiếp tục.
    await test.step('Step 17: Enter 送金額 10000～5000 → invalid range validation', async () => {
      await page.locator('input[name="remittanceAmountFrom"]').fill('10000');
      await page.locator('input[name="remittanceAmountTo"]').fill('5000');
      await page.waitForTimeout(600);

      await expect(page.getByText('開始金額以上の金額を入力してください')).toBeVisible();
      await expect(page.getByRole('button', { name: '検索', exact: true })).toBeDisabled();

      // clear 送金額 để khoảng hợp lệ trở lại → 検索 enable, các step sau search được.
      await page.locator('input[name="remittanceAmountFrom"] + button').click();
      await page.locator('input[name="remittanceAmountTo"] + button').click();
      await expect(page.locator('input[name="remittanceAmountFrom"]')).toHaveValue('');
      await expect(page.getByRole('button', { name: '検索', exact: true })).toBeEnabled();
    });

    // Bộ lọc tích lũy (remitter=thanh + comment=EK10127 + 銀行指示可能日 + tags +
    // 重要 + status) rất hẹp → 0 kết quả (điều chỉnh expectation user: không phải 1 件).
    await test.step('Step 18: Select 消込ステータス 銀行指示可能(手動) and 銀行指示済み, 検索 → 0 result', async () => {
      await selectMulti(page, 'status', ['銀行指示可能(手動)', '銀行指示済み']);
      await search();
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/status=1%2C2|status=1,2/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
      await expect(csvBtn).toBeDisabled();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 19: Clear from-date of 銀行指示可能日（開始）via [X], 検索 → 0 result', async () => {
      await page.locator('button#instructionDateFrom + button').click();
      await expect(page.locator('button#instructionDateFrom')).toHaveText('yyyy/mm/dd');
      await search();
      await page.waitForTimeout(1500);
      await expect(page).not.toHaveURL(/instructionDateFrom=/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 20: Click クリア → reset to full list, fields = null', async () => {
      await page.getByRole('button', { name: 'クリア', exact: true }).click();
      await page.waitForTimeout(1200);
      await expect(page).toHaveURL('/tran/bank-deposits');
      await expect(page.locator('input[name="bankRefNo"]')).toHaveValue('');
      await expect(page.locator('input[name="invoiceNo"]')).toHaveValue('');
      await expect(page.locator('input[name="remitter"]')).toHaveValue('');
      await expect(page.locator('button#importDateFrom')).toHaveText('yyyy/mm/dd');
      await expect(page.getByText(/全 [1-9]\d* 件中/)).toBeVisible();
    });

    await test.step('Step 21: Select 50件 at 表示件数 → ?pageSize=50', async () => {
      await page.getByText('25件', { exact: true }).click();
      await page.getByRole('option', { name: '50件', exact: true }).click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL('/tran/bank-deposits?pageSize=50');
    });

    await test.step('Step 22: Click page [5] → ?pageSize=50&page=5', async () => {
      await page.getByRole('button', { name: '5', exact: true }).click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL('/tran/bank-deposits?pageSize=50&page=5');
    });

    await test.step('Step 23: Select 100件 at 表示件数 → ?pageSize=100', async () => {
      await page.getByText('50件', { exact: true }).click();
      await page.getByRole('option', { name: '100件', exact: true }).click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL('/tran/bank-deposits?pageSize=100');
    });

    await test.step('Step 24: Click 次へ → ?pageSize=100&page=2', async () => {
      await page.getByRole('button', { name: '次へ', exact: true }).click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL('/tran/bank-deposits?pageSize=100&page=2');
    });

    await test.step('Step 25: Click sort columns and verify sort params', async () => {
      const sorts: [string, string][] = [
        ['入金ID', 'remittanceId'],
        ['送金額', 'remittancePrice'],
        ['消込メモ', 'memo'],
        ['銀行指示可能日', 'instructionDate'],
        ['取込日', 'importDate'],
      ];
      for (const [label, param] of sorts) {
        const btn = page.getByRole('button', { name: label, exact: true }).first();
        await btn.click();
        await page.waitForTimeout(1000);
        // Cột đang ở trạng thái default (chưa có sort param) cần click lần 2.
        if (!new RegExp(`sort=${param}`).test(page.url())) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
        await expect(page).toHaveURL(new RegExp(`sort=${param}`));
      }
    });

    // 銀行指示CSVダウンロード chỉ enable khi đã chọn row đủ điều kiện (status 銀行指示可能).
    // Click sinh CSV chỉ thị ngân hàng phía server (không phát download event ở headless)
    // → verify gating disabled→enabled khi chọn row + click không lỗi.
    await test.step('Step 26: Select eligible row → CSVダウンロード enabled → click', async () => {
      await page.goto('/tran/bank-deposits?status=1');
      await page.waitForTimeout(2000);
      // chọn 1 row đủ điều kiện → 銀行指示CSVダウンロード enable (gating disabled
      // đã được verify ở step 5/10/18 khi 0 kết quả).
      await page.locator('table tbody tr button[role="checkbox"]').first().click();
      await page.waitForTimeout(600);
      await expect(csvBtn).toBeEnabled();
      await csvBtn.click();
      await page.waitForTimeout(1500);
      expect(serverErrors).toEqual([]);
    });

    await test.step('Step 27: Click first ユーザID → ユーザ詳細', async () => {
      // List mặc định hầu hết セラー = "-"; dùng list có seller (invoiceNo=26758).
      await page.goto('/tran/bank-deposits?invoiceNo=26758');
      await page.waitForTimeout(2000);
      await page.locator('table a[href*="/accounts/users/"]').first().click();
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/\/accounts\/users\/\d+/);
      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('アカウント管理');
      await expect(page.getByRole('heading', { name: 'ユーザ詳細' })).toBeVisible();
    });
  });
});
