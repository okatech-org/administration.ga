import { test, expect } from "@playwright/test";
import { devSignIn } from "./helpers/auth";
import {
  clickNext,
  clickSubmit,
  uploadDocument,
  selectOption,
  fillByName,
} from "./helpers/registration";

/**
 * Full LongStay consular registration flow.
 *
 * Steps: account → documents → basicInfo → family → contacts → profession → review
 *
 * Prerequisites:
 *   - Dev server running (`bun run dev`)
 *   - Convex backend accessible
 *   - DEV_SIGNIN_ENABLED=true (for passwordless dev sign-in)
 *   - The test email must exist as a Better Auth user (created via DevAccountSwitcher
 *     or a previous sign-up). If not, the dev sign-in will fail.
 */

// Test account — use the pre-configured dev account
const TEST_EMAIL = "itoutouberny@gmail.com";

test.describe("LongStay Registration — Full Flow", () => {
  test("completes the full registration wizard", async ({ page }) => {
    // ──────────────────────────────────────────────────────────
    // Step 0: Navigate & authenticate
    // ──────────────────────────────────────────────────────────
    // First authenticate, then navigate to the registration wizard
    // This ensures cookies are set before the wizard loads
    await page.goto("/register");
    await devSignIn(page, TEST_EMAIL);

    // Now navigate to the wizard with auth already active
    await page.goto("/register?type=long_stay");

    // Wait for the wizard to detect auth and advance past the account step.
    // It may show a loading spinner ("Votre compte est en cours de création...")
    // then advance to the documents step.
    // We wait for either doc upload zones OR the basicInfo firstName field.
    await expect(
      page
        .locator('[data-testid^="doc-upload-"]')
        .first()
        .or(page.locator("#firstName"))
    ).toBeVisible({ timeout: 30_000 });

    // ──────────────────────────────────────────────────────────
    // Step 1: Documents
    // ──────────────────────────────────────────────────────────
    const isDocStep = (await page.locator('[data-testid^="doc-upload-"]').count()) > 0;

    if (isDocStep) {
      // Upload test fixtures to each document zone
      await uploadDocument(page, "identityPhoto", "test-photo.jpg");
      await uploadDocument(page, "passport", "test-document.pdf");
      await uploadDocument(page, "birthCertificate", "test-document.pdf");
      await uploadDocument(page, "addressProof", "test-document.pdf");

      await clickNext(page);
    }

    // ──────────────────────────────────────────────────────────
    // Step 2: Basic Info (Identité)
    // ──────────────────────────────────────────────────────────
    // Wait for the basic info form to appear
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10_000 });

    await page.locator("#firstName").fill("Jean-Test");
    await page.locator("#lastName").fill("Mba-E2E");
    await page.locator("#birthDate").fill("1990-05-15");
    await page.locator("#birthPlace").fill("Libreville");

    // Gender select (MultiSelect with data-testid)
    await selectOption(page, "select-gender", /masculin|male|homme/i);

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 3: Family (Famille) — LongStay only
    // ──────────────────────────────────────────────────────────
    // Wait for the family step
    await expect(
      page.locator('[data-testid="select-maritalStatus"]')
    ).toBeVisible({ timeout: 10_000 });

    // Select "Célibataire" (Single)
    await selectOption(page, "select-maritalStatus", /célibataire|single/i);

    // Father info
    await fillByName(page, "familyInfo.fatherLastName", "Mba");
    await fillByName(page, "familyInfo.fatherFirstName", "Pierre");

    // Mother info
    await fillByName(page, "familyInfo.motherLastName", "Ndong");
    await fillByName(page, "familyInfo.motherFirstName", "Marie");

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 4: Contacts
    // ──────────────────────────────────────────────────────────
    // Wait for the contact fields
    await expect(
      page.locator('[name="contactInfo.email"]')
    ).toBeVisible({ timeout: 10_000 });

    await fillByName(page, "contactInfo.email", "jean.mba.test@example.com");
    await fillByName(page, "contactInfo.phone", "+33612345678");

    // Emergency contact — Residence (required)
    await fillByName(
      page,
      "contactInfo.emergencyResidenceLastName",
      "Obiang"
    );
    await fillByName(
      page,
      "contactInfo.emergencyResidenceFirstName",
      "Paul"
    );
    await fillByName(
      page,
      "contactInfo.emergencyResidencePhone",
      "+33698765432"
    );

    // Emergency contact — Homeland (required for LongStay)
    await fillByName(
      page,
      "contactInfo.emergencyHomelandLastName",
      "Nze"
    );
    await fillByName(
      page,
      "contactInfo.emergencyHomelandFirstName",
      "Sophie"
    );
    await fillByName(
      page,
      "contactInfo.emergencyHomelandPhone",
      "+24177123456"
    );

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 5: Profession — LongStay only
    // ──────────────────────────────────────────────────────────
    await expect(
      page.locator('[data-testid="select-workStatus"]')
    ).toBeVisible({ timeout: 10_000 });

    // Select "Employed" / "Salarié"
    await selectOption(page, "select-workStatus", /salarié|employed/i);

    // Fill employer and profession (conditionally visible)
    const employerField = page.locator('[name="professionalInfo.employer"]');
    if (await employerField.isVisible()) {
      await employerField.fill("ACME Corp");
      await page
        .locator('[name="professionalInfo.profession"]')
        .fill("Ingénieur");
    }

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 6: Review & Submit
    // ──────────────────────────────────────────────────────────
    // Verify some of our entered data appears in the review summary
    await expect(page.getByText("Jean-Test")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Mba-E2E")).toBeVisible();

    // Accept terms
    const termsCheckbox = page.locator("#terms");
    await expect(termsCheckbox).toBeVisible({ timeout: 5_000 });
    await termsCheckbox.check({ force: true });

    // Submit the registration
    await clickSubmit(page);

    // ──────────────────────────────────────────────────────────
    // Success screen
    // ──────────────────────────────────────────────────────────
    // Wait for the submission progress to complete and success message
    await expect(
      page.getByText(/demande envoyée|succès|réussi|success/i)
    ).toBeVisible({ timeout: 30_000 });

    // The "Accéder à mon Espace" button should be present
    await expect(
      page.getByRole("button", { name: /accéder/i })
    ).toBeVisible();
  });
});
