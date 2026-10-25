import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("CareerConnect AI — Axe-core Automated Accessibility Quality Gate", () => {
  test("Landing Page ('/') has zero critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CareerConnect AI/);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("Integrations Page ('/integrations') has zero critical accessibility violations", async ({ page }) => {
    await page.goto("/integrations");
    await expect(page.locator("text=Integrations & Capability Registry")).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("Privacy Policy Page ('/privacy') has zero critical accessibility violations", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("text=Privacy & Data Protection Notice")).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("Authentication Pages ('/login' & '/register') have zero critical accessibility violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign In").first()).toBeVisible();

    const loginResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const loginCritical = loginResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(loginCritical).toEqual([]);

    await page.goto("/register");
    await expect(page.locator("text=Create Account").first()).toBeVisible();

    const regResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const regCritical = regResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(regCritical).toEqual([]);
  });
});
