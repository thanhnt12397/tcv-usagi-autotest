import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

const {
  TARGET,
  PRODUCTION_URL,
  STAGING_URL,
  LOCAL_URL,
} = process.env;

const defaultUrl = "https://usagi.tcv-dev.com";
let baseURL: string;

if (TARGET === "production") {
  baseURL = PRODUCTION_URL || defaultUrl;
} else if (TARGET === "staging") {
  baseURL = STAGING_URL || defaultUrl;
} else {
  baseURL = LOCAL_URL || defaultUrl;
}

async function setupAuth() {
  const storageStatePath = path.join(__dirname, '.auth', 'user.json');
  const authDir = path.dirname(storageStatePath);

  // Tạo thư mục .auth nếu chưa tồn tại
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Kiểm tra xem đã có authentication state chưa
  if (fs.existsSync(storageStatePath)) {
    console.log('✓ Authentication state đã tồn tại, bỏ qua setup');
    console.log(`📍 File: ${storageStatePath}`);
    console.log('💡 Nếu muốn setup lại, hãy xóa file trên và chạy lại script này');
    return;
  }

  console.log('🔐 Bắt đầu setup Google authentication...');
  console.log(`📍 URL: ${baseURL}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    // Tăng timeout cho context
    actionTimeout: 300000, // 5 phút
    navigationTimeout: 300000, // 5 phút
  });
  const page = await context.newPage();
  // Set timeout cho page
  page.setDefaultTimeout(300000); // 5 phút
  page.setDefaultNavigationTimeout(300000); // 5 phút

  try {
    // Điều hướng đến trang chủ
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    
    console.log('⏳ Đang chờ đăng nhập Google...');
    console.log('📝 Vui lòng đăng nhập Google trong trình duyệt đã mở');
    console.log('⏸️  Chờ tự động cho đến khi đăng nhập thành công (tối đa 5 phút)...');

    // Chờ người dùng đăng nhập thủ công
    // Kiểm tra xem đã redirect về trang usagi chưa (không còn ở Google sign-in)
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return !url.includes('accounts.google.com') && url.includes('usagi');
      },
      { timeout: 300000 } // 5 phút timeout
    );

    // Đợi thêm một chút để đảm bảo trang đã load hoàn toàn
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      // Ignore nếu timeout, có thể trang không có network idle
    });

    console.log('✓ Đăng nhập thành công!');
    console.log(`📍 URL hiện tại: ${page.url()}`);

    // Lưu authentication state
    await context.storageState({ path: storageStatePath });
    console.log(`✓ Đã lưu authentication state vào: ${storageStatePath}`);
    console.log('✅ Setup authentication hoàn tất! Bây giờ bạn có thể chạy tests mà không cần đăng nhập lại.');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình setup authentication:', error);
    console.error('💡 Hãy đảm bảo bạn đã đăng nhập Google thành công trong trình duyệt');
    throw error;
  } finally {
    await browser.close();
  }
}

// Export như globalSetup cho Playwright
async function globalSetup() {
  await setupAuth();
}

export default globalSetup;
export { setupAuth };
