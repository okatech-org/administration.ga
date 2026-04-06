import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Detect whether local HTTPS certs exist (same check as vite.config.ts)
const certsDir = path.resolve(import.meta.dirname, "../../.certs");
const hasLocalCerts =
  fs.existsSync(path.join(certsDir, "localhost+2.pem")) &&
  fs.existsSync(path.join(certsDir, "localhost+2-key.pem"));

const protocol = hasLocalCerts ? "https" : "http";
const BASE_URL = `${protocol}://localhost:3000`;

/**
 * Playwright E2E configuration for citizen-web.
 *
 * Run locally:   bun run test:e2e
 * With UI:       bun run test:e2e:ui
 *
 * The webServer block auto-starts `bun run dev` if no server is already
 * running on port 3000 (skipped in CI if you prefer to start it yourself).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000, // Multi-step registration flow can be slow
  expect: { timeout: 10_000 },
  fullyParallel: false, // Steps are sequential in registration tests
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker — tests share backend state
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    ignoreHTTPSErrors: true, // Dev server uses self-signed certs
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // Vite + Convex can take a while to boot
    ignoreHTTPSErrors: true,
  },
});
