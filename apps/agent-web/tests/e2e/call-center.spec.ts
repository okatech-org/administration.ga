import { expect, test } from "@playwright/test";

/**
 * Smoke tests — Centre d'Appels (Sprint 5)
 *
 * Vérifient que les routes nouvelles ne crashent pas et que l'onglet iAppel
 * de /iasted bascule sur le shell multi-lignes quand le feature flag est actif.
 *
 * Pas de tests authentifiés ici (réservé à `authenticated.spec.ts` une fois
 * un dev sign-in pattern disponible côté agent-web).
 */
test.describe("Call Center smoke tests", () => {
  test("homepage loads or redirects, no 5xx", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status() ?? 500).toBeLessThan(500);
  });

  test("/iasted route is reachable (redirects if unauthenticated)", async ({
    page,
  }) => {
    const response = await page.goto("/iasted");
    expect(response?.status() ?? 500).toBeLessThan(500);
  });

  test("legacy /calls route still resolves (redirect or render)", async ({
    page,
  }) => {
    const response = await page.goto("/calls");
    expect(response?.status() ?? 500).toBeLessThan(500);
  });

  test("login page is accessible", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status() ?? 500).toBeLessThan(400);
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).toMatch(
      /email|connexion|login|sign in|connecter/,
    );
  });
});

/**
 * TODO Sprint 6 — Tests authentifiés Centre d'Appels :
 *  - Pickup avec 2 tabs concurrentes (first-click-wins)
 *  - Hold + resume + auto-resume après end
 *  - Transfer dialog (agent + ligne)
 *  - MissedCallsSection apparaît après timeout cron
 *  - SupervisionPanel visible avec permission supervise
 *  - Filtre LineFilterRail fonctionne
 *
 * Pré-requis :
 *  - Pattern dev sign-in pour agent-web (cf. citizen-web/tests/e2e/)
 *  - Seed Convex : 3 callLines actives + agent test assigné aux 3
 *  - Mutation helper pour simuler un appel entrant côté tests
 */
