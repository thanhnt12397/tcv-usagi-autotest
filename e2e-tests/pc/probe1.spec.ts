import { test, expect } from '@playwright/test';
import { clickLoginButtonAndVerifyNavigation } from '../helpers/login-helper';

test('probe user detail basic-info DOM', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await clickLoginButtonAndVerifyNavigation(page);
  }

  await page.goto('/accounts/users/853172?tab=basic-info');
  await page.waitForLoadState('domcontentloaded');
  console.log('=== URL after goto ===', page.url());

  await page.waitForTimeout(1000);
  console.log('=== URL after wait ===', page.url());

  // All buttons with aria-label
  const ariaButtons = await page.locator('button[aria-label]').evaluateAll((els) =>
    els.map((e) => ({ aria: e.getAttribute('aria-label'), text: e.textContent?.trim() }))
  );
  console.log('=== aria-label buttons ===', JSON.stringify(ariaButtons, null, 2));

  // password inputs count
  const pwCount = await page.locator('input[type="password"]').count();
  console.log('=== password input count ===', pwCount);

  // Surrounding HTML for key labels
  for (const label of ['メールアドレス', '契約社名', 'パスワード', '得意先Code']) {
    const html = await page.locator(`text=${label}`).first().evaluate((el) => {
      const parent = el.closest('div')?.parentElement;
      return parent ? parent.outerHTML.slice(0, 1500) : el.outerHTML;
    }).catch((e) => `ERR: ${e.message}`);
    console.log(`--- ${label} surrounding HTML ---`);
    console.log(html);
  }
});
