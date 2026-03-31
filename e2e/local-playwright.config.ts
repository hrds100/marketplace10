import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "on",
    trace: "retain-on-failure",
  },
  reporter: "list",
  retries: 0,
  workers: 1,
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
