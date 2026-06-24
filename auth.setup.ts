import { chromium, FullConfig } from '@playwright/test';
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

async function globalSetup(config: FullConfig) {
  const storageStatePath = path.join(__dirname, '.auth', 'user.json');
  
  // Kiểm tra xem đã có authentication state chưa
  if (fs.existsSync(storageStatePath)) {
    console.log('✓ Authentication state đã tồn tại, sử dụng state đã lưu');
    return;
  }

  // Nếu chưa có authentication state, cảnh báo người dùng
  console.warn('⚠️  Chưa có authentication state!');
  console.warn('💡 Hãy chạy lệnh sau để setup authentication:');
  console.warn('   npm run test:setup-auth');
  console.warn('   hoặc');
  console.warn('   npx playwright test --global-setup=setup-auth.ts');
  console.warn('');
  console.warn('⚠️  Tests sẽ chạy nhưng có thể yêu cầu đăng nhập thủ công.');
}

export default globalSetup;
