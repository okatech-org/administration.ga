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
 * Steps: documents → basicInfo → family → contacts → profession → review
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
    // Step 0: Authenticate then navigate to wizard
    // ──────────────────────────────────────────────────────────
    // Auth is now separate from the wizard — sign in first,
    // then navigate to /register which starts at Documents step.
    await page.goto("/register");
    await devSignIn(page, TEST_EMAIL);

    await page.goto("/register?type=long_stay");

    // Wizard starts directly on the Documents step (no account step)
    await expect(
      page.locator('[data-testid^="doc-upload-"]').first()
    ).toBeVisible({ timeout: 30_000 });

    // ──────────────────────────────────────────────────────────
    // Step 1: Documents
    // ──────────────────────────────────────────────────────────
    await uploadDocument(page, "identityPhoto", "test-photo.jpg");
    await uploadDocument(page, "passport", "test-document.pdf");
    await uploadDocument(page, "birthCertificate", "test-document.pdf");
    await uploadDocument(page, "addressProof", "test-document.pdf");

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 2: Basic Info (Identité)
    // ──────────────────────────────────────────────────────────
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10_000 });

    await page.locator("#firstName").fill("Jean-Test");
    await page.locator("#lastName").fill("Mba-E2E");
    await page.locator("#birthDate").fill("1990-05-15");
    await page.locator("#birthPlace").fill("Libreville");

    // Gender select
    await selectOption(page, "select-gender", /masculin|male|homme/i);

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 3: Family (Famille) — LongStay only
    // ──────────────────────────────────────────────────────────
    await expect(
      page.locator('[data-testid="select-maritalStatus"]')
    ).toBeVisible({ timeout: 10_000 });

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
    await expect(
      page.locator('[name="contactInfo.email"]')
    ).toBeVisible({ timeout: 10_000 });

    await fillByName(page, "contactInfo.email", "jean.mba.test@example.com");
    await fillByName(page, "contactInfo.phone", "+33612345678");

    // Emergency contact #1 (required — at least one)
    await fillByName(
      page,
      "contactInfo.emergencyContacts.0.lastName",
      "Obiang"
    );
    await fillByName(
      page,
      "contactInfo.emergencyContacts.0.firstName",
      "Paul"
    );
    await fillByName(
      page,
      "contactInfo.emergencyContacts.0.phone",
      "+33698765432"
    );

    // Add a second emergency contact via the "Add" button
    await page.getByRole("button", { name: /ajouter/i }).click();

    // Emergency contact #2
    await fillByName(
      page,
      "contactInfo.emergencyContacts.1.lastName",
      "Nze"
    );
    await fillByName(
      page,
      "contactInfo.emergencyContacts.1.firstName",
      "Sophie"
    );
    await fillByName(
      page,
      "contactInfo.emergencyContacts.1.phone",
      "+24177123456"
    );

    await clickNext(page);

    // ──────────────────────────────────────────────────────────
    // Step 5: Profession — LongStay only
    // ──────────────────────────────────────────────────────────
    await expect(
      page.locator('[data-testid="select-workStatus"]')
    ).toBeVisible({ timeout: 10_000 });

    await selectOption(page, "select-workStatus", /salarié|employed/i);

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
    await expect(page.getByText("Jean-Test")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Mba-E2E")).toBeVisible();

    // Accept terms
    const termsCheckbox = page.locator("#terms");
    await expect(termsCheckbox).toBeVisible({ timeout: 5_000 });
    await termsCheckbox.check({ force: true });

    // Submit
    await clickSubmit(page);

    // ──────────────────────────────────────────────────────────
    // Success screen
    // ──────────────────────────────────────────────────────────
    await expect(
      page.getByText(/demande envoyée|succès|réussi|success/i)
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("button", { name: /accéder/i })
    ).toBeVisible();
  });
});
