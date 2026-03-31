import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://hub.nfstay.com',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
