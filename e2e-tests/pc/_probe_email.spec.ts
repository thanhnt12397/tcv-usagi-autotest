import { test } from '../fixtures/auth';

test('probe form structure', async ({ authedPage: page }) => {
  await page.goto('/accounts/users/853172?tab=basic-info');
  await page.waitForLoadState('domcontentloaded');

  const emailRow = page.locator('tr').filter({ hasText: 'メールアドレス' });
  await emailRow.getByRole('button').first().click();
  await page.waitForTimeout(300);
  
  // Get the full HTML of the edit area
  const textbox = emailRow.getByRole('textbox');
  const inputHtml = await textbox.evaluate(el => {
    let node = el;
    let depth = 0;
    while (node && depth < 5) {
      node = node.parentElement!;
      depth++;
    }
    return node?.outerHTML.substring(0, 1000) ?? 'no parent';
  });
  console.log('Parent HTML:', inputHtml);
  
  // Check input attributes
  const attrs = await textbox.evaluate(el => ({
    type: el.type,
    required: el.required,
    pattern: el.pattern,
    autocomplete: el.autocomplete,
    form: el.form?.id ?? 'no form',
    tagName: el.tagName,
  }));
  console.log('Input attrs:', JSON.stringify(attrs));
});
