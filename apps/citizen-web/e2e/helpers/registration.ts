import { type Page, expect } from "@playwright/test";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/** Click the "Suivant" (Next) button and wait for the step transition. */
export async function clickNext(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /suivant/i });
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  await btn.click();
  // Give the step transition a moment to settle
  await page.waitForTimeout(400);
}

/** Click the "Soumettre" (Submit) button on the review step. */
export async function clickSubmit(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /soumettre/i });
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  await btn.click();
}

// ---------------------------------------------------------------------------
// Document upload
// ---------------------------------------------------------------------------

/**
 * Upload a fixture file into a DocumentUploadZone identified by data-testid.
 * If a crop modal appears (for identity photos), it auto-confirms.
 *
 * @param page     Playwright page
 * @param docKey   The document key (e.g. "identityPhoto", "passport")
 * @param fixture  Fixture filename in e2e/fixtures/ (e.g. "test-photo.jpg")
 */
export async function uploadDocument(
  page: Page,
  docKey: string,
  fixture: string
): Promise<void> {
  const zone = page.locator(`[data-testid="doc-upload-${docKey}"]`);
  await expect(zone).toBeVisible({ timeout: 5_000 });

  // DocumentUploadZone has a hidden <input type="file"> — Playwright can
  // interact with it even if it's not visible.
  const fileInput = zone.locator('input[type="file"]');
  await fileInput.setInputFiles(path.join(FIXTURES_DIR, fixture));

  // If a crop modal appears (identity photos), confirm it
  const confirmBtn = page.getByRole("button", { name: /confirmer/i });
  try {
    await confirmBtn.waitFor({ state: "visible", timeout: 2_000 });
    await confirmBtn.click();
  } catch {
    // No crop modal — that's fine for PDFs
  }

  // Wait for the file to be processed
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Custom select components (MultiSelect / CountrySelect)
// ---------------------------------------------------------------------------

/**
 * Open a MultiSelect/CountrySelect identified by data-testid and pick an
 * option by visible text.
 *
 * These components use a Popover + Command (cmdk) pattern:
 *   trigger (role="combobox") → popover → option (role="option")
 */
export async function selectOption(
  page: Page,
  testId: string,
  optionText: string | RegExp
): Promise<void> {
  const trigger = page.locator(`[data-testid="${testId}"] [role="combobox"]`);

  // Fallback: if the data-testid is directly on the combobox wrapper
  const fallback = page.locator(`[data-testid="${testId}"][role="combobox"]`);
  const target = (await trigger.count()) > 0 ? trigger : fallback;

  await target.click();

  // Wait for the popover to open
  const option = page.getByRole("option", {
    name: optionText instanceof RegExp ? optionText : new RegExp(optionText, "i"),
  });
  await expect(option).toBeVisible({ timeout: 3_000 });
  await option.click();

  // For single select, the popover closes automatically.
  // Small delay to let the state update.
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// Form fill helpers
// ---------------------------------------------------------------------------

/** Fill a text/date input by its ID attribute. */
export async function fillById(
  page: Page,
  id: string,
  value: string
): Promise<void> {
  const input = page.locator(`#${id}`);
  await input.fill(value);
}

/** Fill a text input by its name attribute. */
export async function fillByName(
  page: Page,
  name: string,
  value: string
): Promise<void> {
  const input = page.locator(`[name="${name}"]`);
  await input.fill(value);
}
