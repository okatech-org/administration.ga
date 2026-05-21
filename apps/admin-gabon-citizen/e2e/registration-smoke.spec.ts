import { test, expect } from "@playwright/test";

test.describe("Registration — Smoke tests", () => {
  test("displays the three profile type cards on /register", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(
      page.locator('[data-testid="profile-card-long_stay"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="profile-card-short_stay"]')
    ).toBeVisible();
    await expect(page.getByText(/étranger|foreigner/i).first()).toBeVisible();
  });

  test("selecting LongStay card redirects to sign-up when not authenticated", async ({
    page,
  }) => {
    await page.goto("/register?type=long_stay");

    await page.waitForURL(/\/sign-up.*redirect/, { timeout: 15_000 });
    expect(page.url()).toContain("redirect");
    expect(page.url()).toContain("register");

    await expect(
      page.getByRole("heading", { name: /créer un compte/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
