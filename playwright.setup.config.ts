import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  globalSetup: require.resolve('./setup-auth.ts'),
  testMatch: /setup-auth\.spec\.ts$/,
  timeout: 360000, // 6 phút để đảm bảo có đủ thời gian cho setup
  use: {
    // Tăng timeout cho các action
    actionTimeout: 300000, // 5 phút
    navigationTimeout: 300000, // 5 phút
  },
});
