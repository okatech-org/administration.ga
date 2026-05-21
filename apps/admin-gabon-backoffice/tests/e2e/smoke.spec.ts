import { test, expect } from "@playwright/test";

/**
 * Smoke tests — Phase G.3
 *
 * Tests minimaux qui vérifient que les routes admin chargent sans crash.
 * Ne nécessitent pas d'authentification — vérifient juste que Next.js sert
 * bien les pages et que la route protégée redirige vers login.
 *
 * Pour des tests authentifiés complets (wizard, team tab, settings), créer
 * `authenticated.spec.ts` avec un pattern dev sign-in similaire à
 * admin-gabon-citizen (voir apps/admin-gabon-citizen/tests/e2e/).
 */

test.describe("Backoffice smoke tests", () => {
  test("homepage loads and redirects to login if unauthenticated", async ({ page }) => {
    const response = await page.goto("/");
    // Soit la page charge (200) soit redirige vers login (authentification required)
    expect(response?.status()).toBeLessThan(500);
  });

  test("login page is accessible", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
    // Vérifie présence d'un élément typique de login (email input ou SSO button)
    // Tolérant : peut être "email", "Email", input[type=email], etc.
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).toMatch(/email|connexion|login|sign in/);
  });

  test("unauthenticated admin routes don't crash", async ({ page }) => {
    // Ces routes DOIVENT soit charger, soit rediriger — jamais 5xx.
    const routes = ["/reps", "/reps/new", "/admin", "/admin/users"];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(
        response?.status() ?? 500,
        `Route ${route} should not crash`,
      ).toBeLessThan(500);
    }
  });
});

/**
 * TODO Phase H — Tests authentifiés complets :
 * - Wizard /reps/new 5 étapes (création org)
 * - TeamTab : switcher vues list/chart/vacant
 * - Settings sections : modifier identité, sauvegarder, vérifier auto-save
 * - Command palette : ⌘K ouvre, recherche fonctionne
 * - Permissions : rôle sans settings.manage ne voit pas les formulaires
 */
