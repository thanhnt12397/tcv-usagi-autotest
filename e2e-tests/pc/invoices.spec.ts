import { Page, Locator } from '@playwright/test';
import { test, expect } from '../fixtures/auth';

// Combobox kiểu Radix: mở trigger rồi click option.
async function selectComboOption(page: Page, combo: Locator, optionLabel: string) {
  await combo.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
  await page.waitForTimeout(300);
}

// Calendar react-day-picker. Mở trigger (button#id) rồi lùi tháng đến khi thấy ngày cần.
async function pickCalendarDate(page: Page, triggerId: string, dayAria: RegExp) {
  await page.locator(`button#${triggerId}`).click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 30; i++) {
    if (await page.getByRole('button', { name: dayAria }).count()) break;
    await page.getByRole('button', { name: 'Go to the Previous Month' }).click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: dayAria }).first().click({ force: true });
  await page.waitForTimeout(300);
}

const BASE = '/tran/invoices?createdDateFrom=&createdDateTo=';

test.describe('PC - /tran/invoices', () => {
  test('TC25 - Invoice一覧 > search / filter / pagination / sort / user detail', async ({
    authedPage: page,
  }) => {
    test.setTimeout(420000);

    await test.step('Step 1: Go to /tran/invoices and verify page + search items', async () => {
      await page.goto(BASE);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await expect(page).toHaveURL(BASE);

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toContainText('ホーム');
      await expect(breadcrumb).toContainText('取引管理');
      await expect(breadcrumb).toContainText('Invoice一覧');
      await expect(page.locator('h1')).toHaveText('Invoice一覧');

      // Search box chứa đủ các item label.
      for (const label of [
        'InvoiceNo', '取引ステータス', '収納代行処理実施日', 'Invoice発行日',
        'Invoice通貨', '支払通貨', '在庫有無確認', 'LocalTrade',
        'セラーID', 'セラー国', 'バイヤーID', 'バイヤー国',
      ]) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
    });

    await test.step('Step 2: Click [^] chevron to hide search items', async () => {
      const chevron = page.locator('svg.lucide-chevron-up[aria-controls][aria-expanded]');
      await expect(page.locator('input[name="invoiceNo"]')).toBeVisible();
      await chevron.first().click();
      await expect(page.locator('input[name="invoiceNo"]')).toBeHidden();
      // Mở lại để nhập các step sau.
      await chevron.first().click();
      await expect(page.locator('input[name="invoiceNo"]')).toBeVisible();
    });

    await test.step('Step 4-5: Enter InvoiceNo 26817 + 検索 → 1 result', async () => {
      const errors: number[] = [];
      page.on('response', (r) => { if (r.status() >= 500) errors.push(r.status()); });

      await page.locator('input[name="invoiceNo"]').fill('26817');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/invoiceNo=26817/);
      await expect(page.getByText('全 1 件中 1 ～ 1 件を表示')).toBeVisible();
      await expect(
        page.locator('table tbody tr').first().locator('td').first()
      ).toHaveText('26817');
      expect(errors).toEqual([]);
    });

    await test.step('Step 6: Clear InvoiceNo via [X] → input empty', async () => {
      await page.locator('input[name="invoiceNo"] + button').click();
      await expect(page.locator('input[name="invoiceNo"]')).toHaveValue('');
    });

    await test.step('Step 7-8: Select Invoice通貨 USD + 検索 → results, no 500', async () => {
      const errors: number[] = [];
      page.on('response', (r) => { if (r.status() >= 500) errors.push(r.status()); });

      await selectComboOption(page, page.locator('label[for="priceExchangeRateId"] + button'), 'USD');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/priceExchangeRateId=1/);
      await expect(page.getByText(/全 \d+ 件中 1 ～ \d+ 件を表示/)).toBeVisible();
      const totalText = await page.getByText(/全 \d+ 件中/).first().textContent();
      expect(Number(totalText!.match(/全 (\d+) 件中/)![1])).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });

    await test.step('Step 9-10: Select 収納代行処理実施日 2026/02/23～2026/02/23 + 検索 → 0 result', async () => {
      // 収納代行処理実施日 có dropdown chọn loại ngày (mặc định 選択なし) — phải chọn
      // 1 loại thì 2 ô ngày mới enable.
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '選択なし' }), '入金指示日');
      await expect(page.locator('button#statusDateFrom')).toBeEnabled();
      await pickCalendarDate(page, 'statusDateFrom', /February 23rd, 2026/);
      await pickCalendarDate(page, 'statusDateTo', /February 23rd, 2026/);
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/statusDateType=10/);
      await expect(page).toHaveURL(/statusDateFrom=2026-02-23/);
      await expect(page).toHaveURL(/statusDateTo=2026-02-23/);
      await expect(page.getByText('全 0 件中 0 ～ 0 件を表示')).toBeVisible();
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
    });

    await test.step('Step 11: Clear [X] at 収納代行処理実施日', async () => {
      // Clear 2 ô ngày của 収納代行処理実施日 (nút X là sibling ngay sau button date).
      const xFrom = page.locator('button#statusDateFrom + button');
      const xTo = page.locator('button#statusDateTo + button');
      if (await xFrom.count()) await xFrom.click().catch(() => {});
      if (await xTo.count()) await xTo.click().catch(() => {});
      await expect(page.locator('button#statusDateFrom')).toHaveText('yyyy/mm/dd');
    });

    await test.step('Step 12-18: Enter seller/buyer/date/country/status/localTrade/stock filters + 検索', async () => {
      // Chọn combo + ngày trước; mỗi lần chọn combo Radix re-render form và wipe text
      // input → nhập セラーID/バイヤーID SAU CÙNG (ngay trước 検索) để giữ giá trị.
      await pickCalendarDate(page, 'createdDateFrom', /April 23rd, 2026/);
      await pickCalendarDate(page, 'createdDateTo', /June 23rd, 2026/);
      await selectComboOption(page, page.locator('label[for="buyerCountryNumber"] + button'), 'Japan');
      await selectComboOption(page, page.locator('label[for="status"] + button'), 'B/Lコピー送付済');
      await selectComboOption(page, page.locator('label[for="localTrade"] + button'), 'Kenya');
      await selectComboOption(page, page.locator('label[for="isPIAuto"] + button'), 'なし');

      // セラーID / バイヤーID là input CHỈ NHẬN SỐ — ký tự chữ bị strip ngay khi gõ.
      // Phải dùng pressSequentially (gõ từng phím) để filter onChange chạy đúng.
      // → 'thanh' bị strip hết = '' (không lên URL); 'EK10127' → '10127'.
      await page.locator('input[name="sellerId"]').pressSequentially('thanh', { delay: 40 });
      await page.locator('input[name="buyerId"]').pressSequentially('EK10127', { delay: 40 });
      await expect(page.locator('input[name="sellerId"]')).toHaveValue('');
      await expect(page.locator('input[name="buyerId"]')).toHaveValue('10127');
      await page.getByRole('button', { name: '検索', exact: true }).click();

      await expect(page).toHaveURL(/buyerId=10127/);
      await expect(page).not.toHaveURL(/sellerId=/);
      await expect(page).toHaveURL(/createdDateFrom=2026-04-23/);
      await expect(page).toHaveURL(/createdDateTo=2026-06-23/);
      await expect(page).toHaveURL(/buyerCountryNumber=392/);
      await expect(page).toHaveURL(/status=40/);
      await expect(page).toHaveURL(/localTrade=2/);
      await expect(page).toHaveURL(/isPIAuto=false/);
      await expect(page.getByText('該当するデータがありません')).toBeVisible();
    });

    await test.step('Step 19: Clear [X] at Invoice発行日 from-date', async () => {
      await page.locator('button#createdDateFrom + button').click();
      await expect(page.locator('button#createdDateFrom')).toHaveText('yyyy/mm/dd');
    });

    await test.step('Step 20: Click クリア → reset all filters', async () => {
      await page.getByRole('button', { name: 'クリア', exact: true }).click();
      await expect(page).toHaveURL('/tran/invoices');
      await expect(page.locator('input[name="invoiceNo"]')).toHaveValue('');
      await expect(page.locator('input[name="sellerId"]')).toHaveValue('');
      await expect(page.locator('input[name="buyerId"]')).toHaveValue('');
    });

    await test.step('Step 21: Select 50件 → pageSize=50', async () => {
      // クリア (step 20) đưa list về date-range mặc định (~136 dòng = 3 trang) nên không
      // có trang [5]. Để test phân trang cần tập dữ liệu lớn → load lại BASE (date rỗng =
      // toàn bộ 25k+ dòng = >500 trang).
      await page.goto(BASE);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '25件' }), '50件');
      await page.waitForURL(/pageSize=50/);
      await expect(page.getByText('1 ～ 50 件を表示')).toBeVisible();
    });

    await test.step('Step 22: Click page [5] → page=5', async () => {
      await page.getByRole('button', { name: '5', exact: true }).first().click();
      await page.waitForURL(/pageSize=50&page=5/);
      await expect(page.getByText('201 ～ 250 件を表示')).toBeVisible();
    });

    await test.step('Step 23: Select 100件 → pageSize=100', async () => {
      await selectComboOption(page, page.getByRole('combobox').filter({ hasText: '50件' }), '100件');
      await page.waitForURL(/pageSize=100/);
    });

    await test.step('Step 24: Click 次へ → page=2', async () => {
      await page.getByRole('button', { name: '次へ', exact: true }).first().click();
      await page.waitForURL(/pageSize=100&page=2/);
    });

    await test.step('Step 25: Click sort on each column → URL sort field matches column', async () => {
      // Mỗi cột map sang 1 sort field; click header → URL ?...&sort=<field>&order=asc.
      // Dùng waitForURL vì update URL là async (đọc ngay sau click dễ bắt giá trị cũ).
      const columnSort: [string, string][] = [
        ['InvoiceNo', 'invoiceNo'],
        ['取引ステータス', 'status'],
        ['セラー', 'sellerId'],
        ['バイヤー', 'buyerId'],
        ['支払通貨', 'paymentAccount'],
        ['Invoice価格', 'totalPrice'],
        ['LocalTrade', 'localTradeId'],
        ['送金額', 'remittancePrice'],
        ['Invoice発行日', 'createdDate'],
        ['支払期日', 'moneyReceivedTerm'],
        ['在庫有無確認', 'isPIAuto'],
      ];
      for (const [col, field] of columnSort) {
        await page.getByRole('columnheader', { name: col, exact: true }).click();
        await page.waitForURL(new RegExp(`sort=${field}&order=`));
      }
    });

    await test.step('Step 26: Click first ユーザID → ユーザ詳細 opens in new tab', async () => {
      const link = page.locator('table tbody tr').first().locator('a[href^="/accounts/users/"]').first();
      const href = await link.getAttribute('href');
      const popupPromise = page.context().waitForEvent('page');
      await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      await popup.waitForTimeout(1500);

      await expect(popup).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')));
      await expect(popup.locator('h1')).toHaveText('ユーザ詳細');
      const bc = popup.getByRole('navigation', { name: 'breadcrumb' });
      await expect(bc).toContainText('アカウント管理');
      await expect(bc).toContainText('ユーザ詳細');
      await popup.close();
    });
  });
});
