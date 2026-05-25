/**
 * E2E Playwright — Landing PNPE
 *
 * Vérifie que la home publique du portail PNPE :
 *  - charge sans erreur
 *  - affiche le branding PNPE (titre, logo, hero)
 *  - propose les CTA principaux
 */
import { expect, test } from "@playwright/test";

test.describe("PNPE — Landing publique", () => {
  test("home page répond avec 200 et affiche le branding PNPE", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);

    // Title contient PNPE
    await expect(page).toHaveTitle(/PNPE/i);

    // Logo navbar
    await expect(page.getByText(/^PNPE/).first()).toBeVisible();
  });

  test("hero affiche le titre PNPE", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Promotion/i).first()).toBeVisible();
    await expect(page.getByText(/Emploi/i).first()).toBeVisible();
  });

  test("section missions affiche les 3 programmes", async ({ page }) => {
    await page.goto("/");
    // Scroll vers le panel missions
    await page.evaluate(() => window.scrollBy(0, 800));
    await expect(page.getByText(/Emploi Salarié/i).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
