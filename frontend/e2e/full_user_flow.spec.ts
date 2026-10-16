import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — Synthetic End-to-End User Flow", () => {
  const timestamp = Date.now();
  const testEmail = `synthetic_student_${timestamp}@example.edu`;
  const testPassword = "StrongPassword123!";

  test("Complete E2E: Register -> Upload Resume -> Import CSV -> Analyze -> Generate -> Approve -> Copy -> Mark Sent", async ({ page, context }) => {
    // Grant clipboard permissions so navigator.clipboard.writeText doesn't fail in headless Chrome
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // 1. Register with synthetic credentials
    await page.goto("/register");
    await expect(page).toHaveTitle(/CareerConnect AI/);

    await page.fill("#fullName", "Synthetic Student");
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);

    await page.click('button[type="submit"]');

    // Wait for registration request and redirect away from /register
    await page.waitForURL((url) => !url.pathname.includes("/register"), { timeout: 15000 });
    await page.goto("/overview");
    await expect(page.locator("text=Total Connections")).toBeVisible({ timeout: 10000 });

    // 2. Upload Resume & Confirm Profile in /settings
    await page.goto("/settings");
    await expect(page.locator("text=Resume Document & Private Storage")).toBeVisible();

    // Prepare synthetic valid PDF bytes (%PDF-1.4 header)
    const syntheticPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF"
    );

    // Set file input
    await page.setInputFiles('input#resume-file-input', {
      name: "synthetic_resume.pdf",
      mimeType: "application/pdf",
      buffer: syntheticPdfBuffer,
    });

    await page.click('button:has-text("Upload & Extract")');
    await expect(page.locator("text=synthetic_resume.pdf")).toBeVisible({ timeout: 15000 });

    // Confirm profile form
    await page.fill('input[placeholder*="Distributed Systems Engineer"]', "Software Engineer, Backend Developer");
    await page.fill('input[placeholder*="Tesla, Stripe"]', "Cyberdyne Systems, Acme Tech");
    await page.fill('input[placeholder*="React, PostgreSQL"]', "Python, TypeScript, FastAPI, PostgreSQL");
    await page.click('button:has-text("Save Profile & Preferences")');
    await expect(page.locator("text=saved successfully")).toBeVisible({ timeout: 10000 });

    // 3. Import Connections CSV in /connections
    await page.goto("/connections");
    await expect(page.locator("text=Connections Directory")).toBeVisible();

    // Open import modal
    const importModalBtn = page.locator('button:has-text("Import Connections.csv")').first();
    await importModalBtn.click();

    const syntheticCsvContent =
      "Notes:\n" +
      "This file contains your 1st-degree connections export from LinkedIn.\n" +
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n" +
      "Sarah,Connor,https://www.linkedin.com/in/sarah-connor,sarah@cyberdyne.com,Cyberdyne Systems,Engineering Recruiter,12 Oct 2026\n" +
      "John,Doe,https://www.linkedin.com/in/john-doe,,Acme Tech,Senior Staff Engineer,10 Oct 2026\n";

    await page.setInputFiles('input#csv-file-input', {
      name: "Connections.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(syntheticCsvContent, "utf-8"),
    });

    // Preview should appear in modal
    await expect(page.locator("text=Validation Summary")).toBeVisible({ timeout: 10000 });
    const confirmImportBtn = page.locator('button:has-text("Confirm & Import")');
    await confirmImportBtn.click();

    // Confirm contacts loaded
    await expect(page.locator("text=Sarah Connor")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Cyberdyne Systems").first()).toBeVisible();

    // 4. Scoring & Classification in /shortlist
    await page.goto("/shortlist");
    await expect(page.locator("text=Target Shortlist & Match Scoring")).toBeVisible();
    await expect(page.locator("text=Sarah Connor")).toBeVisible({ timeout: 10000 });

    // Click "Score Connections" to batch evaluate
    const scoreBtn = page.locator('button:has-text("Score Connections")');
    await scoreBtn.click();
    await page.waitForTimeout(3000);

    // Expect score and explanation button to appear
    await expect(page.locator("button:has-text('Explain Score')").first()).toBeVisible({ timeout: 15000 });

    // 5. Message Studio: Generate -> Review -> Approve -> Copy -> Mark Sent in /messages
    await page.goto("/messages");
    await expect(page.locator("h1:has-text('Message Studio')")).toBeVisible();

    // Wait for contacts to populate in dropdown
    const contactSelect = page.locator("select").first();
    await expect(contactSelect).toBeVisible();

    // Click Generate Outreach Draft
    await page.click('button:has-text("Generate Outreach Draft")');

    // Verify Details Used transparency panel and message body rendered
    await expect(page.locator("text=Details Used for Personalization")).toBeVisible({ timeout: 15000 });

    // Progression: Mark Reviewed
    await page.click('button:has-text("Mark Reviewed")');
    await expect(page.locator("text=Reviewed").first()).toBeVisible({ timeout: 10000 });

    // Progression: Approve Draft
    await page.click('button:has-text("Approve Draft")');
    await expect(page.locator("text=Approved").first()).toBeVisible({ timeout: 10000 });

    // Copy Message (Copying is not sending)
    await page.click('button:has-text("Copy Message")');
    await expect(page.locator("text=Copied!").or(page.locator("text=clipboard"))).toBeVisible({ timeout: 5000 });

    // Move to Awaiting Send
    await page.click('button:has-text("Move to Awaiting Send")');
    await expect(page.locator("text=Awaiting Manual Send").first()).toBeVisible({ timeout: 10000 });

    // Mark Sent by You
    await page.click('button:has-text("Mark Sent by You")');
    await expect(page.locator("text=Marked Sent By You").first()).toBeVisible({ timeout: 10000 });

    // 6. Verify in Outreach Tracker (/tracker)
    await page.goto("/tracker");
    await expect(page.getByRole("heading", { name: "Outreach Tracker" })).toBeVisible();
    await expect(page.locator("text=Acme Tech").or(page.locator("text=Cyberdyne Systems"))).toBeVisible({ timeout: 10000 });
  });
});
