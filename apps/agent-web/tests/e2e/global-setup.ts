/**
 * Global Setup — Sprint 6 Playwright authenticated tests
 *
 * Exécuté une fois avant la suite E2E :
 *  1. Vérifie que `DEV_SIGNIN_ENABLED` est positionné côté Convex.
 *  2. Lance un navigateur headless.
 *  3. Navigate vers la homepage (monte E2ESignInBridge via layout root).
 *  4. Appelle `window.__e2eDevSignIn(TEST_AGENT_EMAIL)` → session cookie créée.
 *  5. Sauve `storageState` dans `tests/e2e/.auth/agent.json`.
 *
 * Les tests tagués `@auth` réutilisent ce storage via le project `authenticated`
 * de `playwright.config.ts`.
 */

import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TEST_AGENT_EMAIL =
  process.env.E2E_TEST_AGENT_EMAIL ?? "test-agent@consulat.ga";

export default async function globalSetup(config: FullConfig) {
  if (process.env.DEV_SIGNIN_ENABLED !== "true") {
    console.warn(
      "\n[globalSetup] DEV_SIGNIN_ENABLED != 'true' — skipping authenticated fixture. " +
        "Authenticated tests (@auth) will be ignored.\n",
    );
    return;
  }

  const storagePath = "tests/e2e/.auth/agent.json";
  mkdirSync(dirname(storagePath), { recursive: true });

  const baseURL =
    (config.projects[0]?.use.baseURL as string | undefined) ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://localhost:3003";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { waitUntil: "networkidle" });

    // Attend que E2ESignInBridge mount le helper (useEffect côté client)
    await page.waitForFunction(
      () => typeof window.__e2eDevSignIn === "function",
      { timeout: 10_000 },
    );

    const result = await page.evaluate(async (email) => {
      return await window.__e2eDevSignIn!(email);
    }, TEST_AGENT_EMAIL);

    if (!result.ok) {
      throw new Error(
        `[globalSetup] Dev sign-in failed for ${TEST_AGENT_EMAIL}: ${result.error}`,
      );
    }

    // Attend un poil pour que la session cookie soit bien posée
    await page.waitForTimeout(500);
    await context.storageState({ path: storagePath });

    console.log(
      `\n[globalSetup] Authenticated session saved for ${TEST_AGENT_EMAIL} → ${storagePath}\n`,
    );
  } finally {
    await browser.close();
  }
}
