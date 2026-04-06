import { test, expect } from "@playwright/test";

test.describe("Registration — Smoke tests", () => {
  test("displays the three profile type cards on /register", async ({
    page,
  }) => {
    await page.goto("/register");

    // Three profile cards should be visible
    await expect(
      page.locator('[data-testid="profile-card-long_stay"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="profile-card-short_stay"]')
    ).toBeVisible();
    // Foreigner cards use visa sub-types — check for at least one foreigner card
    // or look for the foreigner section
    await expect(page.getByText(/étranger|foreigner/i).first()).toBeVisible();
  });

  test("selecting LongStay card redirects to sign-up when not authenticated", async ({
    page,
  }) => {
    await page.goto("/register?type=long_stay");

    // Not authenticated → should redirect to /sign-up with redirect param
    await page.waitForURL(/\/sign-up.*redirect/, { timeout: 15_000 });
    expect(page.url()).toContain("redirect");
    expect(page.url()).toContain("register");

    // The sign-up form should be visible
    await expect(
      page.getByRole("heading", { name: /créer un compte/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
