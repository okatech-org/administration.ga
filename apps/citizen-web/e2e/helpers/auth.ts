import type { Page } from "@playwright/test";

/**
 * Authenticate via the dev-only passwordless sign-in endpoint.
 *
 * The app uses `crossDomainClient()` which stores auth tokens in
 * localStorage (key: `better-auth_cookie`) instead of relying on
 * HTTP cookies. We call the dev endpoint via Playwright's API context
 * (to capture Set-Cookie headers) then inject the tokens into
 * localStorage in the format crossDomainClient expects.
 *
 * Only works when the Vite dev server is running (import.meta.env.DEV === true).
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  // Call via Playwright API context to capture response headers
  const response = await page.request.post("/api/dev/sign-in", {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(
      `Dev sign-in failed (${response.status()}): ${await response.text()}`
    );
  }

  // Parse Set-Cookie header to extract session_token and convex_jwt
  const setCookie = response.headers()["set-cookie"] || "";
  const cookieStore: Record<string, { value: string; expires: string | null }> = {};

  // Split on ", " but be careful with cookie values containing ", "
  // Better approach: split by known cookie name prefixes
  const cookieRegex = /(better-auth\.[^=]+)=([^;]+);\s*Max-Age=(\d+)/g;
  let match;
  while ((match = cookieRegex.exec(setCookie)) !== null) {
    const [, name, value, maxAge] = match;
    cookieStore[name] = {
      value: decodeURIComponent(value),
      expires: new Date(Date.now() + Number(maxAge) * 1000).toISOString(),
    };
  }

  // Inject cookies into localStorage in the format crossDomainClient expects
  await page.evaluate((store) => {
    localStorage.setItem("better-auth_cookie", JSON.stringify(store));
    // Also clear any stale session cache
    localStorage.removeItem("better-auth_session_data");
  }, cookieStore);

  // Reload to let the auth provider pick up the new tokens from localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);
}
