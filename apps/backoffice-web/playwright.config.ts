import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config pour les tests E2E backoffice-web.
 * Phase G.3 — fondations tests e2e pour atteindre 10/10.
 *
 * Usage :
 *   bun run test:e2e           # headless
 *   bun run test:e2e:ui        # avec UI interactive
 *   bun run test:e2e:headed    # navigateur visible
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Dev server lancé automatiquement si non déjà actif.
  // En CI, on suppose que le serveur est déjà démarré par un step préalable.
  webServer: process.env.CI
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3002",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
