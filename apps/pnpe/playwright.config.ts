import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — pnpe (Pôle National de Promotion de l'Emploi)
 *
 * Usage :
 *   bun run test:e2e           # headless
 *   bun run test:e2e:ui        # interactif
 *   bun run test:e2e:headed    # navigateur visible
 *
 * Variables d'env :
 *   PLAYWRIGHT_BASE_URL       # défaut http://localhost:3008
 *   NEXT_PUBLIC_FEATURE_CALL_CENTER=1   # active le Centre d'Appels durant les tests
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",

  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3008",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testIgnore: /.*\.auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /.*\.auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/agent.json",
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3008",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_FEATURE_CALL_CENTER: "1",
          NEXT_PUBLIC_E2E_MODE: "true",
        },
      },
});
