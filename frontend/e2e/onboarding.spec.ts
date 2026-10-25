import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Guided 5-Step Onboarding Wizard", () => {
  const timestamp = Date.now();
  const testEmail = `onboarding_student_${timestamp}@example.edu`;
  const testPassword = "StrongPassword123!";

  test("Guides student through all 5 onboarding steps to shortlist", async ({ page }) => {
    // 1. Register new user
    await page.goto("/register");
    await page.fill("#fullName", "Onboarding Student");
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to /overview
    await page.waitForURL((url) => !url.pathname.includes("/register"), { timeout: 15000 });
    await page.goto("/overview");
    await expect(page.locator("text=Total Connections")).toBeVisible({ timeout: 10000 });

    // Navigate to onboarding wizard
    await page.goto("/onboarding");
    await expect(page.locator("h1:has-text('Welcome to CareerConnect AI')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Resume Upload")).toBeVisible();

    // Step 1: Upload Resume
    const syntheticPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF"
    );

    await page.setInputFiles('input[type="file"]', {
      name: "synthetic_onboarding_resume.pdf",
      mimeType: "application/pdf",
      buffer: syntheticPdfBuffer,
    });

    await page.click('button:has-text("Upload & Extract")');
    // Once uploaded, Next: Confirm Profile button appears
    const nextBtn = page.locator('button:has-text("Next: Confirm Profile")');
    await expect(nextBtn).toBeVisible({ timeout: 15000 });
    await nextBtn.click();

    // Step 2: Confirm Goals
    await expect(page.locator("text=Step 2: Confirm Your Career Goals")).toBeVisible({ timeout: 15000 });
    await page.fill('input[placeholder*="Software Engineer"]', "Software Engineer, Full Stack Developer");
    await page.click('button:has-text("Save & Continue")');

    // Step 3: Scoring Preferences
    await expect(page.locator("text=Step 3: Scoring & Tone Preferences")).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Continue")');

    // Step 4: CSV Import
    await expect(page.locator("text=Import LinkedIn Connections")).toBeVisible({ timeout: 15000 });
    const syntheticCsvContent =
      "Notes:\n" +
      "This file contains your 1st-degree connections export from LinkedIn.\n" +
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n" +
      "Alex,Morgan,https://www.linkedin.com/in/alex-morgan,alex@innovatetech.com,InnovateTech,Engineering Director,15 Oct 2026\n";

    await page.setInputFiles('input[type="file"]', {
      name: "Connections.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(syntheticCsvContent, "utf-8"),
    });

    const confirmImportBtn = page.locator('button:has-text("Confirm & Import")');
    await expect(confirmImportBtn).toBeVisible({ timeout: 10000 });
    await confirmImportBtn.click();

    const proceedBtn = page.locator('button:has-text("Proceed to Batch Analysis")');
    await expect(proceedBtn).toBeVisible({ timeout: 15000 });
    await proceedBtn.click();

    // Step 5: Review & Launch
    await expect(page.locator("text=Ready to Analyze")).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Run Batch Scoring")');

    const finishBtn = page.locator('button:has-text("Finish & Open Shortlist")');
    await expect(finishBtn).toBeVisible({ timeout: 15000 });
    await finishBtn.click();

    // Student lands on shortlist
    await page.waitForURL((url) => url.pathname.includes("/shortlist"), { timeout: 15000 });
    await expect(page.locator("text=Target Shortlist & Match Scoring")).toBeVisible();
  });
});
