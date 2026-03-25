import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './suites',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['./helpers/reporter.ts'],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://hub.nfstay.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
