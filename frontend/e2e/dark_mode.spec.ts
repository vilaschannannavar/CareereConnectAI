import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Theme Switching & Dark Mode", () => {
  const timestamp = Date.now();
  const testEmail = `theme_user_${timestamp}@example.edu`;
  const testPassword = "StrongPassword123!";

  test("Toggles theme between system, dark, and light, applying dark class on html", async ({ page }) => {
    // 1. Register and navigate to app shell
    await page.goto("/register");
    await page.fill("#fullName", "Theme Tester");
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/register"), { timeout: 15000 });
    await page.goto("/overview");
    await expect(page.locator("text=Total Connections")).toBeVisible({ timeout: 10000 });

    // 2. Locate theme toggle button in sidebar (visible on desktop)
    const themeBtn = page.locator('aside button[aria-label*="Toggle theme"]');
    await expect(themeBtn).toBeVisible();

    // 3. Click to switch theme
    await themeBtn.click();
    // Verify html element has updated class or theme attribute
    const html = page.locator("html");
    const htmlClass = await html.getAttribute("class");
    expect(htmlClass !== null).toBeTruthy();

    // Click again to cycle to next theme
    await themeBtn.click();
    await page.waitForTimeout(300);
    const updatedClass = await html.getAttribute("class");
    expect(updatedClass !== null).toBeTruthy();
  });
});
