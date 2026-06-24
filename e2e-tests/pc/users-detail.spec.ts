import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth';

async function clickFieldEdit(page: Page, fieldLabel: string) {
  await page.locator('tr').filter({ hasText: fieldLabel }).getByRole('button').first().click();
}

test.describe('PC - Users Detail', () => {
  test.describe.configure({ mode: 'serial' });

  test('TC07 - Users detail > tab=basic-info', async ({ authedPage: page }) => {
    await page.goto('/accounts/users/853172?tab=basic-info');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Step 1: Verify all basic-info fields displayed', async () => {
      await expect(page.getByRole('heading', { name: 'ユーザ詳細' })).toBeVisible();
      for (const field of [
        'ユーザID', '表示名', 'アカウントロール', '国', 'メールアドレス',
        '電話番号', 'メール認証状態', 'ステータス', '生年月日', '得意先Code',
        '契約社名', '会社名', 'アカウント', '登録日時', '最終ログイン', 'メモ', 'パスワード',
      ]) {
        await expect(page.locator('tr').filter({ hasText: field }).first()).toBeVisible();
      }
    });

    await test.step('Step 2: Click edit icon at メールアドレス', async () => {
      await clickFieldEdit(page, 'メールアドレス');
    });

    await test.step('Step 3: Click キャンセル - verify email unchanged', async () => {
      await page.getByRole('button', { name: 'キャンセル' }).click();
      await expect(
        page.locator('tr').filter({ hasText: 'メールアドレス' })
          .getByText('hiromitsu.kurachi+test202407@zigexn.co.jp')
      ).toBeVisible();
    });

    await test.step('Step 4: Click edit icon at メールアドレス again', async () => {
      await clickFieldEdit(page, 'メールアドレス');
    });

    await test.step('Step 5: Enter email thanhnt@zigexn.vn', async () => {
      await page.locator('tr').filter({ hasText: 'メールアドレス' })
        .getByRole('textbox').fill('thanhnt@zigexn.vn');
    });

    await test.step('Step 6: Click 保存 - confirm dialog appears', async () => {
      const dialogPromise = page.waitForEvent('dialog');
      // do not await click — native dialog blocks page until handled
      page.locator('tr').filter({ hasText: 'メールアドレス' })
        .getByRole('button', { name: '保存' }).click();
      const dialog = await dialogPromise;
      expect(dialog.message()).toBe('メールアドレスを変更してもよろしいですか？');

      await test.step('Step 7: Click OK on dialog - verify duplicate email error', async () => {
        await dialog.accept();
        await expect(
          page.getByText('このメールアドレスは既に使用されています。別のメールアドレスを入力してください。')
        ).toBeVisible();
      });
    });

    await test.step('Step 8: Click edit icon at 契約社名', async () => {
      await clickFieldEdit(page, '契約社名');
    });

    await test.step('Step 9: Click キャンセル - verify nothing changed, click edit icon at 得意先Code', async () => {
      await page.locator('tr').filter({ hasText: '契約社名' }).getByRole('button', { name: 'キャンセル' }).click();
      await expect(
        page.locator('tr').filter({ hasText: '契約社名' }).getByRole('button', { name: 'キャンセル' })
      ).not.toBeVisible();
      await clickFieldEdit(page, '得意先Code');
    });

    await test.step('Step 10: Enter 得意先Code with value exceeding 100 chars', async () => {
      await page.locator('tr').filter({ hasText: '得意先Code' })
        .getByRole('textbox').fill('TC20230106001TC20230106001TC20230106001TC20230106001TC20230106001TC20230106001TC20230106001TC20230106001');
    });

    await test.step('Step 11: Click 保存 - verify max length error', async () => {
      // 保存 button is in 契約社名 row (combined edit form for 契約社名 + 得意先Code)
      await page.locator('tr').filter({ hasText: '契約社名' })
        .getByRole('button', { name: '保存' }).click();
      await expect(page.getByText('最大100文字')).toBeVisible();
    });

    await test.step('Step 12: キャンセル, click edit at 得意先Code, fill TC20230106001', async () => {
      await page.locator('tr').filter({ hasText: '契約社名' }).getByRole('button', { name: 'キャンセル' }).click();
      await clickFieldEdit(page, '得意先Code');
      await page.locator('tr').filter({ hasText: '得意先Code' })
        .getByRole('textbox').fill('TC20230106001');
    });

    await test.step('Step 13: Click 保存 - confirm dialog appears', async () => {
      const dialogPromise = page.waitForEvent('dialog');
      // do not await click — native dialog blocks page until handled
      page.locator('tr').filter({ hasText: '契約社名' })
        .getByRole('button', { name: '保存' }).click();
      const dialog = await dialogPromise;

      await test.step('Step 14: Verify dialog text', async () => {
        expect(dialog.message()).toBe('得意先Code・契約社名を変更してもよろしいですか?');
      });

      await test.step('Step 15: Click OK - verify success toast', async () => {
        await dialog.accept();
        await expect(page.getByText('契約社名 + 得意先Code を編集しました。')).toBeVisible();
      });
    });

    await test.step('Step 16: Click パスワードを変更する button', async () => {
      await page.locator('tr').filter({ hasText: 'パスワード' })
        .getByRole('button', { name: /パスワードを変更する/ }).click();
    });

    await test.step('Step 17: Click キャンセル button', async () => {
      await page.locator('tr').filter({ hasText: 'パスワード' })
        .getByRole('button', { name: 'キャンセル' }).click();
    });

    await test.step('Step 18: Click パスワードを変更する button again, fill both password fields with >20 chars', async () => {
      await page.locator('tr').filter({ hasText: 'パスワード' })
        .getByRole('button', { name: /パスワードを変更する/ }).click();
      const passwordRow = page.locator('tr').filter({ hasText: 'パスワード' });
      await passwordRow.getByRole('textbox').nth(0).fill('t123456@123t123456@123');
      await passwordRow.getByRole('textbox').nth(1).fill('t123456@123t123456@123');
    });

    await test.step('Step 19: Click 変更 - verify password length error', async () => {
      await page.locator('tr').filter({ hasText: 'パスワード' })
        .getByRole('button', { name: '変更' }).click();
      await expect(page.getByText('パスワードは4〜20文字で入力してください')).toBeVisible();
    });

    await test.step('Step 20: Refill both password fields with valid password t123456@123', async () => {
      const passwordRow = page.locator('tr').filter({ hasText: 'パスワード' });
      await passwordRow.getByRole('textbox').nth(0).fill('t123456@123');
      await passwordRow.getByRole('textbox').nth(1).fill('t123456@123');
    });

    await test.step('Step 21: Click 変更 - verify success toast', async () => {
      await page.locator('tr').filter({ hasText: 'パスワード' })
        .getByRole('button', { name: '変更' }).click();
      await expect(page.getByText('パスワード を編集しました。')).toBeVisible({ timeout: 10000 });
    });
  });

  test('TC08 - Users detail > tab=permissions (display)', async ({ authedPage: page }) => {
    await page.goto('/accounts/users/854352?tab=permissions');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Verify permissions table columns + 追加', async () => {
      for (const col of ['サービス', 'プラン名', 'サービス開始日', 'サービス終了日', '認証日', '有効/無効', '編集']) {
        await expect(page.getByText(col).first()).toBeVisible();
      }
      await expect(page.getByRole('button', { name: '追加' })).toBeVisible();
    });
  });

  test('TC09 - Users detail > tab=profile (display)', async ({ authedPage: page }) => {
    await page.goto('/accounts/users/853172?tab=profile');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Verify profile fields visible', async () => {
      for (const field of ['会社名', '住所', '市区町村', '都道府県', '郵便番号', '国', '電話番号',
        '携帯電話', 'FAX', 'メールアドレス', 'ウェブサイトURL', '担当者', '営業時間', '言語',
        '紹介タイトル', 'お客様へのメッセージ', '設立年', '法人格', '資本金', '年間売上高',
        '従業員数', '支払条件', '業種分類', '公開設定', 'ロゴ', 'バナー', '写真']) {
        await expect(page.getByText(field).first()).toBeVisible();
      }
      await expect(page.getByRole('button', { name: '編集' })).toBeVisible();
    });

    await test.step('Click PRページのプレビュー - verify URL (read-only)', async () => {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.getByText('PRページのプレビュー').click(),
      ]);
      await expect(newPage).toHaveURL(/tcv-dev\.com\/pr\/853172/);
      await newPage.close();
    });
  });

  test('TC10 - Users detail > tab=bank (display)', async ({ authedPage: page }) => {
    await page.goto('/accounts/users/838331?tab=bank');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Verify 日本円口座 is default sub-tab with bank fields', async () => {
      const jpyTab = page.getByRole('tab', { name: '日本円口座' });
      await expect(jpyTab).toHaveAttribute('aria-selected', 'true');
      for (const field of ['銀行名', '銀行支店名', '口座種別', '口座名義', '口座名義(カナ)', '口座番号', '銀行住所(国)']) {
        await expect(page.getByText(field).first()).toBeVisible();
      }
    });

    await test.step('Switch to 米ドル口座 sub-tab', async () => {
      const usdTab = page.getByRole('tab', { name: '米ドル口座' });
      await usdTab.click();
      await expect(usdTab).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('Switch back to 日本円口座', async () => {
      const jpyTab = page.getByRole('tab', { name: '日本円口座' });
      await jpyTab.click();
      await expect(jpyTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('銀行名').first()).toBeVisible();
    });
  });

  test('TC11 - Users detail > tab=plans (display)', async ({ authedPage: page }) => {
    await page.goto('/accounts/users/853172?tab=plans');
    await page.waitForLoadState('domcontentloaded');

    await test.step('Verify plans table columns', async () => {
      for (const col of ['プラン名', '請求パターン', '月額基本料金', '成約手数料率', '定額手数料', '適用開始日']) {
        await expect(page.getByText(col).first()).toBeVisible();
      }
    });
  });
});
