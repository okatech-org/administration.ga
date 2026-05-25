/**
 * E2E Playwright — Parcours Conseiller PNPE
 */
import { expect, test } from "@playwright/test";

test.describe("PNPE — Espace Conseiller (auth)", () => {
  test("/conseiller/file-d-attente affiche le sélecteur d'antenne @auth", async ({
    page,
  }) => {
    await page.goto("/conseiller/file-d-attente");
    await expect(
      page.getByRole("heading", { name: /File d'attente/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Antenne/i)).toBeVisible();
  });

  test("/conseiller/offres-a-valider liste les offres @auth", async ({ page }) => {
    await page.goto("/conseiller/offres-a-valider");
    await expect(
      page.getByRole("heading", { name: /Offres à valider/i }),
    ).toBeVisible();
  });

  test("/conseiller/mes-demandeurs affiche les filtres @auth", async ({ page }) => {
    await page.goto("/conseiller/mes-demandeurs");
    await expect(
      page.getByRole("heading", { name: /Mes Demandeurs d'Emploi/i }),
    ).toBeVisible();
  });
});
