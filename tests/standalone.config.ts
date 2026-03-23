import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', timeout: 120000, use: { headless: true, viewport: { width: 1440, height: 900 } } });
