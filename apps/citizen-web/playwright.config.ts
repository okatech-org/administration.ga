import { defineConfig, devices } from "@playwright/test";

// ── Port aligné avec `package.json` "dev" : `next dev --port 3004` ──
// Playwright lance `bun run dev` via `webServer.command` et attend une
// réponse sur cette URL. Si le port ici diverge du port du script dev,
// Playwright timeout à 120s (cf. CI main, commit b74de41).
const BASE_URL = "http://localhost:3004";

/**
 * Playwright E2E configuration for citizen-web (Next.js).
 *
 * Run locally:   bun run test:e2e
 * With UI:       bun run test:e2e:ui
 *
 * The webServer block auto-starts `bun run dev` if no server is already
 * running on port 3004 (skipped in CI if you prefer to start it yourself).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // ── Locale forcée à fr-FR pour les tests E2E ──
    // Les assertions cherchent le texte français ("Suivant", "Confirmer",
    // "Soumettre"…). Sans ce réglage, Chromium démarre en en-US sur les
    // runners GitHub Actions, i18next-browser-languagedetector détecte
    // `navigator.language === "en-US"` → l'UI se rend en anglais et aucun
    // des selectors FR ne matche. `locale` pose navigator.language et
    // `extraHTTPHeaders` fixe l'en-tête HTTP pour toute détection côté
    // serveur ultérieure.
    locale: "fr-FR",
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
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
    timeout: 120_000,
  },
});
