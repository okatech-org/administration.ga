/**
 * E2E Playwright — Parcours Demandeur d'Emploi
 *
 * Vérifie les écrans authentifiés (avec @auth tag pour réutiliser le
 * storageState créé par tests/e2e/global-setup.ts).
 *
 * Note : ces tests requièrent DEV_SIGNIN_ENABLED=true sur Convex pour que
 * le helper window.__e2eDevSignIn() fonctionne (cf global-setup.ts).
 */
import { expect, test } from "@playwright/test";

test.describe("PNPE — Espace Demandeur (auth)", () => {
  test("/demandeur/inscription affiche le formulaire NIP + antenne @auth", async ({
    page,
  }) => {
    await page.goto("/demandeur/inscription");
    await expect(
      page.getByRole("heading", { name: /Inscription Demandeur/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/NIP/i)).toBeVisible();
    await expect(page.getByLabel(/Antenne de rattachement/i)).toBeVisible();
  });

  test("/demandeur/offres affiche le catalogue @auth", async ({ page }) => {
    await page.goto("/demandeur/offres");
    await expect(
      page.getByRole("heading", { name: /Offres d'emploi/i }),
    ).toBeVisible();
  });

  test("/demandeur/candidatures affiche le kanban @auth", async ({ page }) => {
    await page.goto("/demandeur/candidatures");
    await expect(
      page.getByRole("heading", { name: /Mes candidatures/i }),
    ).toBeVisible();
  });

  test("/demandeur/cv affiche l'upload CV @auth", async ({ page }) => {
    await page.goto("/demandeur/cv");
    await expect(
      page.getByRole("heading", { name: /Mon CV/i }),
    ).toBeVisible();
  });
});
