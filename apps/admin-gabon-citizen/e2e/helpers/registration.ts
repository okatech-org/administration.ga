import { type Page, expect } from "@playwright/test";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");

/** Click the "Suivant" (Next) button and wait for the step transition. */
export async function clickNext(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /suivant/i });
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  await btn.click();
  await page.waitForTimeout(400);
}

/** Click the "Soumettre" (Submit) button on the review step. */
export async function clickSubmit(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /soumettre/i });
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  await btn.click();
}

/**
 * Upload a fixture file into a DocumentUploadZone identified by data-testid.
 * If a crop modal appears (for identity photos), it auto-confirms.
 */
export async function uploadDocument(
  page: Page,
  docKey: string,
  fixture: string
): Promise<void> {
  const zone = page.locator(`[data-testid="doc-upload-${docKey}"]`);
  await expect(zone).toBeVisible({ timeout: 5_000 });

  const fileInput = zone.locator('input[type="file"]');
  await fileInput.setInputFiles(path.join(FIXTURES_DIR, fixture));

  const confirmBtn = page.getByRole("button", { name: /confirmer/i });
  try {
    await confirmBtn.waitFor({ state: "visible", timeout: 2_000 });
    await confirmBtn.click();
  } catch {
    // No crop modal — fine for PDFs
  }

  await page.waitForTimeout(500);
}

/**
 * Open a select component identified by data-testid and pick an option.
 */
export async function selectOption(
  page: Page,
  testId: string,
  optionText: string | RegExp
): Promise<void> {
  const trigger = page.locator(`[data-testid="${testId}"] [role="combobox"]`);
  const fallback = page.locator(`[data-testid="${testId}"][role="combobox"]`);
  const target = (await trigger.count()) > 0 ? trigger : fallback;

  await target.click();

  const option = page.getByRole("option", {
    name: optionText instanceof RegExp ? optionText : new RegExp(optionText, "i"),
  });
  await expect(option).toBeVisible({ timeout: 3_000 });
  await option.click();

  await page.waitForTimeout(200);
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
