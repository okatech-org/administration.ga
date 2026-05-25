/**
 * E2E Playwright — Parcours Employeur PNPE
 */
import { expect, test } from "@playwright/test";

test.describe("PNPE — Espace Employeur (auth)", () => {
  test("/employeur/tableau-de-bord répond @auth", async ({ page }) => {
    await page.goto("/employeur/tableau-de-bord");
    // Soit le dashboard si compte créé, soit le CTA d'inscription
    const dashOrCta = page.getByText(
      /Bienvenue sur le PNPE|Vérification requise|NIF/i,
    );
    await expect(dashOrCta.first()).toBeVisible({ timeout: 8000 });
  });

  test("/employeur/inscription affiche le formulaire entreprise @auth", async ({
    page,
  }) => {
    await page.goto("/employeur/inscription");
    await expect(
      page.getByRole("heading", { name: /Créer un compte entreprise/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Raison sociale/i)).toBeVisible();
  });

  test("/employeur/offres/nouvelle affiche le formulaire création @auth", async ({
    page,
  }) => {
    await page.goto("/employeur/offres/nouvelle");
    // Soit le formulaire si vérifié, soit le message "Vérification requise"
    const formOrGate = page.getByText(
      /Publier une offre|Vérification requise|Inscrivez-vous comme employeur/i,
    );
    await expect(formOrGate.first()).toBeVisible({ timeout: 8000 });
  });
});
