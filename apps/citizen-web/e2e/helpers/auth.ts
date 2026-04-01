import type { Page } from "@playwright/test";

/**
 * Authenticate via the app's real authClient by calling
 * window.__e2eDevSignIn(email) exposed by DevAccountSwitcher.
 *
 * This is the most reliable approach because it uses the exact same
 * code path as the DevAccountSwitcher UI button:
 *   1. POST /api/dev/sign-in → { email, tempPassword }
 *   2. authClient.signIn.email({ email, password: tempPassword })
 *      with crossDomainClient handling token storage
 *
 * Requirements:
 *   - DevAccountSwitcher must be mounted (DEV or VITE_E2E_MODE=true)
 *   - DEV_SIGNIN_ENABLED=true on the Convex backend
 *   - The test email must exist as a Better Auth user
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  // Wait for the app to mount and expose the sign-in function
  await page.waitForFunction(
    () => typeof (window as any).__e2eDevSignIn === "function",
    { timeout: 15_000 },
  );

  // Call the real authClient sign-in flow via the exposed function
  const result = await page.evaluate(async (targetEmail: string) => {
    return (window as any).__e2eDevSignIn(targetEmail);
  }, email);

  if (!result.ok) {
    throw new Error(`Dev sign-in failed: ${result.error}`);
  }

  // Wait for the auth state to propagate through React
  await page.waitForTimeout(2_000);

  // Reload to ensure all route guards pick up the new auth state
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);
}
