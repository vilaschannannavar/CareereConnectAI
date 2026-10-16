import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI - Foundation & Capability Registry", () => {
  test("loads landing page and displays compliant capability matrix", async ({ page }) => {
    // Navigate to local landing page
    await page.goto("/");

    // Verify application title
    await expect(page).toHaveTitle(/CareerConnect AI/);
    await expect(page.locator("text=Zero-Scraping")).toBeVisible();

    // Navigate to integrations page
    await page.goto("/integrations");
    await expect(page.locator("text=Integrations & Capability Registry")).toBeVisible();
    await expect(page.locator("text=LinkedIn Integration")).toBeVisible();

    // Verify that direct messaging button is disabled with HonestButton
    const directSendBtn = page.getByRole("button", { name: /auto-send linkedin message/i });
    if (await directSendBtn.count() > 0) {
      await expect(directSendBtn).toBeDisabled();
    }
  });
});
