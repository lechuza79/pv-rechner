import { defineConfig, devices } from "@playwright/test";

// Playwright config for Solar Check end-to-end smoke tests.
// Goals:
//   - One test per main user flow ("does the calc/recommendation/dashboard come up?")
//   - Fast enough to run on every push (target: under 60s total)
//   - Boots its own dev server so contributors don't need to start one manually
//
// We only test against Chromium for now — the app's UI is plain inline-CSS HTML,
// behavior across browsers is dominated by the JS engine and we don't use any
// vendor-prefixed features. Adding Firefox/WebKit triples runtime for marginal value.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3045",
    trace: "on-first-retry",
    // Use a deterministic locale so toLocaleString() output matches assertions
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    // Dedicated port (3045) so this doesn't fight a manual dev server on 3000/3041
    command: "next dev -p 3045",
    url: "http://localhost:3045",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
