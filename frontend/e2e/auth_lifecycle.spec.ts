import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Authentication Lifecycle", () => {
  const timestamp = Date.now();
  const testEmail = `auth_cycle_${timestamp}@example.edu`;

  test("Forgot Password Request -> Token Reset View -> Direct Navigation", async ({ page }) => {
    // 1. Visit Login page and click Forgot password link
    await page.goto("/login");
    await expect(page.locator("text=Sign In").first()).toBeVisible({ timeout: 10000 });

    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    // 2. Verify Forgot Password page
    await page.waitForURL((url) => url.pathname.includes("/forgot-password"));
    await expect(page.locator("text=Reset Your Password")).toBeVisible();

    // 3. Request password reset email
    await page.fill("#email", testEmail);
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Request Received")).toBeVisible({ timeout: 10000 });

    // 4. Navigate to reset password page with token
    await page.goto("/reset-password?token=mock_sample_reset_token_12345");
    await expect(page.locator("text=Set New Password")).toBeVisible();
    await expect(page.locator("#newPassword")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });
});
