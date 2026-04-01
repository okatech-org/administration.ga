import type { Page } from "@playwright/test";

/**
 * Authenticate via the dev-only passwordless sign-in flow.
 *
 * Two-step process matching DevAccountSwitcher:
 *   1. POST /api/dev/sign-in → { email, tempPassword }
 *   2. POST to Better Auth sign-in endpoint with the temp credentials
 *      → session cookies/tokens set via crossDomain localStorage
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

  // ── Step 2: Sign in through Better Auth (email/password) ──
  // This mirrors what authClient.signIn.email() does in the browser.
  // The crossDomain plugin stores tokens in localStorage.
  const signInResponse = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email,
      password: tempPassword,
    },
  });

  if (!signInResponse.ok()) {
    throw new Error(
      `Better Auth sign-in failed (${signInResponse.status()}): ${await signInResponse.text()}`
    );
  }

  const signInData = await signInResponse.json();

  // ── Step 3: Inject session into localStorage for crossDomainClient ──
  // crossDomainClient stores cookies in localStorage under "better-auth_cookie"
  const setCookie = signInResponse.headers()["set-cookie"] || "";
  const cookieStore: Record<string, { value: string; expires: string | null }> = {};

  // Parse Set-Cookie headers for better-auth cookies
  const cookieRegex = /(better-auth\.[^=]+)=([^;]+);[^M]*Max-Age=(\d+)/g;
  let match;
  while ((match = cookieRegex.exec(setCookie)) !== null) {
    const [, name, value, maxAge] = match;
    cookieStore[name] = {
      value: decodeURIComponent(value),
      expires: new Date(Date.now() + Number(maxAge) * 1000).toISOString(),
    };
  }

  // If we got cookies from Set-Cookie, inject them
  if (Object.keys(cookieStore).length > 0) {
    await page.evaluate((store) => {
      localStorage.setItem("better-auth_cookie", JSON.stringify(store));
      localStorage.removeItem("better-auth_session_data");
    }, cookieStore);
  }

  // Also store the session token if returned in JSON body
  if (signInData?.token || signInData?.session?.token) {
    const token = signInData.token || signInData.session.token;
    await page.evaluate((t) => {
      // Store in the format crossDomainClient expects
      const existing = localStorage.getItem("better-auth_cookie");
      const store = existing ? JSON.parse(existing) : {};
      store["better-auth.session_token"] = {
        value: t,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem("better-auth_cookie", JSON.stringify(store));
    }, token);
  }

  // ── Step 4: Reload to pick up auth state ──
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);
}
