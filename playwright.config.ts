import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'https://hub.nfstay.com',
    ...devices['Desktop Chrome'],
  },
});
