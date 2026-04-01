import type { Page } from "@playwright/test";

/**
 * Authenticate via the dev-only sign-in proxy.
 *
 * The proxy at /api/dev/sign-in now performs the complete auth flow
 * server-side (tempPassword + Better Auth signIn) and returns session
 * cookies directly. The E2E helper just needs to:
 *   1. POST to the proxy
 *   2. Parse Set-Cookie and store in localStorage for crossDomainClient
 *   3. Reload to pick up the auth state
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  // ── Step 1: Call the complete dev sign-in proxy ──
  const response = await page.request.post("/api/dev/sign-in", {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(
      `Dev sign-in failed (${response.status()}): ${await response.text()}`
    );
  }

  // ── Step 2: Parse response for session data ──
  const data = await response.json().catch(() => null);

  // Parse Set-Cookie headers and inject into localStorage
  // crossDomainClient stores auth cookies in localStorage
  const setCookie = response.headers()["set-cookie"] || "";
  const cookieStore: Record<string, { value: string; expires: string | null }> = {};

  // Extract better-auth cookies from Set-Cookie header
  const cookieRegex = /(better-auth\.[^=]+)=([^;]+)/g;
  let match;
  while ((match = cookieRegex.exec(setCookie)) !== null) {
    const [, name, value] = match;
    cookieStore[name] = {
      value: decodeURIComponent(value),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Also try to get session token from response body
  if (data?.token || data?.session?.token) {
    const token = data.token || data.session.token;
    cookieStore["better-auth.session_token"] = {
      value: token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Inject into localStorage for crossDomainClient
  if (Object.keys(cookieStore).length > 0) {
    await page.evaluate((store) => {
      localStorage.setItem("better-auth_cookie", JSON.stringify(store));
      localStorage.removeItem("better-auth_session_data");
    }, cookieStore);
  }

  // ── Step 3: Reload to pick up auth state ──
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3_000);
}
