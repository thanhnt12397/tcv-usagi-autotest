import { test, expect } from '../fixtures/auth';

test('debug step13 toast', async ({ authedPage: page }) => {
  const allRequests: string[] = [];
  page.on('request', req => {
    allRequests.push(`${req.method()} ${req.url()}`);
  });

  await page.goto('/accounts/users/853172?tab=basic-info');
  await page.waitForLoadState('domcontentloaded');

  await page.locator('tr').filter({ hasText: '得意先Code' }).getByRole('button').first().click();
  await page.locator('tr').filter({ hasText: '得意先Code' }).getByRole('textbox').fill('TC20230106002');

  // inspect 保存 button fully
  const btnInfo = await page.locator('tr').filter({ hasText: '契約社名' }).getByRole('button', { name: '保存' }).evaluate(btn => {
    const parentForm = btn.closest('form');
    // walk up DOM to find any form ancestor
    let el: Element | null = btn;
    const ancestors: string[] = [];
    while (el && ancestors.length < 6) {
      ancestors.push(el.tagName + (el.id ? '#'+el.id : '') + (el.className ? '.'+[...el.classList].join('.').substring(0,30) : ''));
      el = el.parentElement;
    }
    return {
      type: (btn as HTMLButtonElement).type,
      form: parentForm ? 'found' : 'no-form',
      outerHTML: btn.outerHTML,
      ancestors,
    };
  });
  console.log('保存 button outerHTML:', btnInfo.outerHTML);
  console.log('保存 button ancestors:', btnInfo.ancestors);
  console.log('保存 button form:', btnInfo.form);

  await page.locator('tr').filter({ hasText: '契約社名' }).getByRole('button', { name: '保存' }).click();
  await page.waitForTimeout(2000);

  // reload and check if value was actually saved
  await page.goto('/accounts/users/853172?tab=basic-info');
  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: '/tmp/debug_after_reload.png' });

  const codeRow = page.locator('tr').filter({ hasText: '得意先Code' });
  console.log('得意先Code row text after reload:', await codeRow.innerText());
});
