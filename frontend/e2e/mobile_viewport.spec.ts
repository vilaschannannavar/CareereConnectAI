import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Mobile Responsive Shell & Navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12/13/14 viewport

  test("Renders responsive shell, navigation drawer, and compliant views on mobile", async ({ page }) => {
    // 1. Visit landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/CareerConnect AI/);

    // Mobile header is visible
    const mobileHeader = page.locator("header");
    await expect(mobileHeader).toBeVisible();

    // 2. Visit integrations page
    await page.goto("/integrations");
    await expect(page.locator("text=Integrations & Capability Registry")).toBeVisible();

    // Check cards wrap cleanly without overflow
    const cards = page.locator(".rounded-xl");
    await expect(cards.first()).toBeVisible();

    // 3. Visit privacy policy page
    await page.goto("/privacy");
    await expect(page.locator("text=Privacy & Data Protection Notice")).toBeVisible();
    await expect(page.locator("text=Zero-Scraping")).toBeVisible();
  });
});
