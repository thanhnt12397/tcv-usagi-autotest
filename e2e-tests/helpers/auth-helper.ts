import { Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE_STATE_PATH = path.join(__dirname, '../../.auth/user.json');

/**
 * Kiểm tra xem authentication state đã tồn tại chưa
 */
export function hasAuthState(): boolean {
  return fs.existsSync(STORAGE_STATE_PATH);
}

/**
 * Lấy đường dẫn đến authentication state file
 */
export function getAuthStatePath(): string {
  return STORAGE_STATE_PATH;
}

/**
 * Kiểm tra xem trang hiện tại đã được authenticate chưa
 * (không còn ở trang Google sign-in)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('accounts.google.com') && url.includes('usagi');
}

/**
 * Chờ cho đến khi authentication hoàn tất
 */
export async function waitForAuthentication(page: Page, timeout: number = 30000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return !url.includes('accounts.google.com') && url.includes('usagi');
      },
      { timeout }
    );
  } catch (error) {
    throw new Error(`Authentication timeout: Không thể xác thực trong ${timeout}ms`);
  }
}
