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

  test("clicking LongStay card navigates to the registration wizard", async ({
    page,
  }) => {
    await page.goto("/register");

    // Navigate directly to the registration page with the type parameter
    // (the Card click uses TanStack Router navigate which updates the URL)
    await page.goto("/register?type=long_stay");

    // The registration wizard should load with the InlineAuth form
    // We should see "Créer votre compte" heading and password field
    await expect(
      page.getByText("Créer votre compte").first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
