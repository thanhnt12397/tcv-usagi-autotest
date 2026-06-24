import { Page, Locator, expect, test } from "@playwright/test";

export const clickAndCheckPath = async (
  page: Page,
  baseURL: string | undefined,
  locator: Locator,
  expectedPath: string,
  checkType?: string
) => {
  await locator.click();

  if (checkType === "contain")
    return await test.step(`expect page url to contain: ${baseURL}/${expectedPath}`, async () =>
      expect(page.url()).toContain(expectedPath));

  await test.step(`expect page to have url: ${baseURL}/${expectedPath}`, async () =>
    await expect(page).toHaveURL(expectedPath));
};
