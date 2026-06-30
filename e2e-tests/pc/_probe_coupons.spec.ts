import { test, expect } from '../fixtures/auth';

test('probe coupons row click', async ({ authedPage: page }) => {
  test.setTimeout(120000);
  await page.goto('/prom/coupons/master');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const row = page.locator('table tbody tr').first();
  console.log('ROW full text=', (await row.innerText()).replace(/\n/g, ' | '));
  // any clickable element in row?
  console.log('row buttons=', await row.getByRole('button').count());
  console.log('row links=', await row.getByRole('link').count());

  // click name cell
  await row.locator('td').nth(1).click();
  await page.waitForTimeout(1200);
  console.log('AFTER NAME CLICK url=', page.url(), 'dialog=', await page.getByRole('dialog').count());

  // click whole row
  await row.click();
  await page.waitForTimeout(1200);
  console.log('AFTER ROW CLICK url=', page.url(), 'dialog=', await page.getByRole('dialog').count());
  console.log('H1=', await page.locator('h1').first().textContent());
});
