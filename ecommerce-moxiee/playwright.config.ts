import { defineConfig, devices } from "@playwright/test";

// Run with: npm run test:e2e
// These tests spin up the actual dev server, so a working .env with real
// Supabase credentials is required (see CLIENT_README.md). They exercise
// the storefront's critical paths end-to-end in a real browser.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
