import type { Page } from "@playwright/test";

/**
 * Authenticate via the app's real authClient by calling
 * window.__e2eDevSignIn(email) exposed by DevAccountSwitcher.
 *
 * Requirements:
 *   - DevAccountSwitcher must be mounted (NODE_ENV=development or NEXT_PUBLIC_E2E_MODE=true)
 *   - DEV_SIGNIN_ENABLED=true on the Convex backend
 *   - The test email must exist as a Better Auth user
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).__e2eDevSignIn === "function",
    { timeout: 15_000 },
  );

  const result = await page.evaluate(async (targetEmail: string) => {
    return (window as any).__e2eDevSignIn(targetEmail);
  }, email);

  if (!result.ok) {
    throw new Error(`Dev sign-in failed: ${result.error}`);
  }

  await page.waitForTimeout(2_000);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);
}
