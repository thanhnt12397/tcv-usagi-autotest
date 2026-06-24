import { Locator, Page, expect } from '@playwright/test';

export async function selectOptionByIndex(page: Page, selectLocator: string, optionIndex: number): Promise<string> {
  const selectElement = page.locator(selectLocator);
  await selectElement.waitFor({ state: 'visible', timeout: 10000 });

  const optionToSelect = selectElement.locator(`option:nth-child(${optionIndex})`);
  const optionValue = await optionToSelect.getAttribute('value');

  if (optionValue === null) {
    throw new Error(`Could not get the value of option index ${optionIndex} for locator '${selectLocator}'`);
  }

  await selectElement.selectOption(optionValue);

  return optionValue;
}

export async function goHomeAndVerify(page: Page, logoLocator: Locator, expectedPath: string | RegExp) {
  await logoLocator.click();
  await expect(page, `Should navigate back to base URL: ${expectedPath}`).toHaveURL(expectedPath);
}

export async function assertPageTitle(page: Page, expectedTitle: string) {
  const title = await page.title();
  await expect(title, `Title should be "${expectedTitle}"`).toBe(expectedTitle);
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}
