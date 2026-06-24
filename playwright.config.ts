import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

const {
  TARGET,
  PRODUCTION_URL,
  STAGING_URL,
  LOCAL_URL,
  RETRY_TIMES,
  NUMBER_OF_WORKERS,
  TEST_TIMEOUT,
} = process.env;

const defaultUrl = "https://usagi.tcv-dev.com";
let baseURL: string;
let ignoreHTTPSErrors = false;

if (TARGET === "production") {
  baseURL = PRODUCTION_URL || defaultUrl;
} else if (TARGET === "staging") {
  baseURL = STAGING_URL || defaultUrl;
} else {
  baseURL = LOCAL_URL || defaultUrl;
  ignoreHTTPSErrors = true;
}

// Đường dẫn đến authentication state file
const storageStatePath = path.join(__dirname, '.auth', 'user.json');
const hasAuthState = fs.existsSync(storageStatePath);

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: parseInt(RETRY_TIMES || "0"),
  // Mặc định 1 worker để mọi TC chạy tuần tự trên cùng 1 trình duyệt (login 1 lần
  // qua fixture authedPage worker-scoped). Vẫn override được qua NUMBER_OF_WORKERS.
  workers: NUMBER_OF_WORKERS ? parseInt(NUMBER_OF_WORKERS) : 1,
  reporter: [["html", { open: "never" }]],
  timeout: parseInt(TEST_TIMEOUT || "30000"),
  globalSetup: require.resolve('./auth.setup.ts'),
  use: {
    baseURL,
    ignoreHTTPSErrors,
    trace: "on-first-retry",
    // Sử dụng authentication state nếu đã tồn tại
    ...(hasAuthState && { storageState: storageStatePath }),
  },

  projects: [
    {
      name: "Chrome PC",
      use: { ...devices["Desktop Chrome"], headless: true },
      testDir: TARGET === "production" ? "./e2e-tests-production/pc": "./e2e-tests/pc",
    },
    {
      name: "Pixel 7 SP",
      use: { ...devices["Pixel 7"], headless: true },
      testDir: TARGET === "production" ? "./e2e-tests-production/sp" : "./e2e-tests/sp",
    },
  ],
});
