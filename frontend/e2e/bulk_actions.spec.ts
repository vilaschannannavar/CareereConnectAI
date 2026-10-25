import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Connections Directory & Bulk Actions", () => {
  const timestamp = Date.now();
  const testEmail = `bulk_test_${timestamp}@example.edu`;
  const testPassword = "StrongPassword123!";

  test("Import contacts, filter by search, and perform bulk selection", async ({ page }) => {
    // 1. Register account
    await page.goto("/register");
    await page.fill("#fullName", "Bulk Test Student");
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/register"), { timeout: 15000 });
    await page.goto("/overview");
    await expect(page.locator("text=Total Connections")).toBeVisible({ timeout: 10000 });

    // 2. Navigate to /connections and import synthetic contacts
    await page.goto("/connections");
    await expect(page.locator("text=Connections Directory")).toBeVisible({ timeout: 10000 });

    const importModalBtn = page.locator('button:has-text("Import Connections.csv")').first();
    await importModalBtn.click();

    const syntheticCsvContent =
      "Notes:\n" +
      "This file contains your 1st-degree connections export from LinkedIn.\n" +
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n" +
      "Alice,Smith,https://www.linkedin.com/in/alice-smith,alice@acme.com,Acme Corp,Principal Architect,01 Oct 2026\n" +
      "Bob,Jones,https://www.linkedin.com/in/bob-jones,bob@beta.com,Beta Systems,Staff Engineer,02 Oct 2026\n" +
      "Charlie,Brown,https://www.linkedin.com/in/charlie-brown,charlie@charlie.com,Charlie AI,Lead Developer,03 Oct 2026\n";

    await page.setInputFiles('input#csv-file-input', {
      name: "Connections.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(syntheticCsvContent, "utf-8"),
    });

    await expect(page.locator("text=Validation Summary")).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Confirm & Import")');

    // Verify all 3 contacts loaded
    await expect(page.locator("text=Alice Smith")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Bob Jones")).toBeVisible();
    await expect(page.locator("text=Charlie Brown")).toBeVisible();

    // 3. Search and filter contacts
    const searchInput = page.getByPlaceholder("Search name, company, role...");
    await searchInput.fill("Beta");
    await searchInput.press("Enter");
    await expect(page.locator("text=Bob Jones")).toBeVisible();
    await expect(page.locator("text=Alice Smith")).toBeHidden();

    // Clear search filter
    await searchInput.fill("");
    await searchInput.press("Enter");
    await expect(page.locator("text=Alice Smith")).toBeVisible();

    // 4. Select contact checkboxes
    const checkboxes = page.getByRole("checkbox");
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(1);

    // Click first item checkbox
    await checkboxes.nth(1).click();
    // Bulk action toolbar should be visible
    await expect(page.locator("text=contact selected")).toBeVisible();
  });
});
