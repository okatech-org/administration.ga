import type { Page } from "@playwright/test";

/**
 * Authenticate via the dev-only passwordless sign-in flow.
 *
 * Two-step process matching DevAccountSwitcher:
 *   1. POST /api/dev/sign-in → { email, tempPassword }
 *   2. Call authClient.signIn.email() inside the browser context
 *      → crossDomainClient stores tokens in localStorage
 *
 * Only works when DEV_SIGNIN_ENABLED=true on the Convex backend
 * and the frontend proxy allows it (DEV mode or VITE_E2E_MODE=true).
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  // ── Step 1: Get temp credentials via the dev proxy ──
  const devResponse = await page.request.post("/api/dev/sign-in", {
    data: { email },
  });

  if (!devResponse.ok()) {
    throw new Error(
      `Dev sign-in failed (${devResponse.status()}): ${await devResponse.text()}`
    );
  }

  const { tempPassword, error } = await devResponse.json();

  if (error || !tempPassword) {
    throw new Error(`Dev sign-in returned error: ${error || "no tempPassword"}`);
  }

  // ── Step 2: Sign in through Better Auth inside the browser context ──
  // We execute in-page so the Origin header is set correctly and
  // crossDomainClient stores tokens in localStorage automatically.
  const signInResult = await page.evaluate(
    async ({ email, password }) => {
      // Use fetch to call the local SSR proxy which forwards to Convex
      // with the correct Origin header
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          ok: false,
          error: data?.message || `HTTP ${res.status}`,
          setCookie: res.headers.get("set-cookie") || "",
        };
      }

      // Store session data in localStorage for crossDomainClient
      const setCookie = res.headers.get("set-cookie") || "";
      return { ok: true, data, setCookie };
    },
    { email, password: tempPassword }
  );

  if (!signInResult.ok) {
    throw new Error(`Better Auth sign-in failed: ${signInResult.error}`);
  }

  // ── Step 3: Reload to let the auth provider pick up tokens ──
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);
}
