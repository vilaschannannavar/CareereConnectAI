import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Vilas R C/.gemini/antigravity-ide/brain/945316c7-52a2-41d2-8f15-206fa1b21f9f/screenshots";
const BASE_URL = "http://localhost:3000";

async function runAudit() {
  console.log("Launching Chromium for Phase A audit...");
  const browser = await chromium.launch({ headless: true });

  const testEmail = `audit_student_${Date.now()}@example.edu`;
  const testPassword = "Password123!";

  // 1. Audit Desktop
  console.log("\n=== Starting Desktop Audit (1440x900) ===");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await desktopContext.newPage();

  // Landing
  console.log("1. Visiting Landing Page...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_landing_desktop.png"), fullPage: true });

  // Register
  console.log("2. Visiting Register Page...");
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_register_desktop.png") });

  // Perform Registration
  await page.fill("#fullName", "Alex Chen (Audit Student)");
  await page.fill("#email", testEmail);
  await page.fill("#password", testPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Login check
  console.log("3. Visiting Login Page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_login_desktop.png") });
  // Log in if needed
  if (page.url().includes("/login")) {
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // Overview
  console.log("4. Visiting Overview Page...");
  await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_overview_desktop.png") });

  // Settings & Resume Upload
  console.log("5. Visiting Settings Page & Uploading Resume...");
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "05_settings_before_upload_desktop.png") });

  // Upload synthetic resume
  const resumePath = "C:/CareerConnect AI/sample_resume.pdf";
  if (fs.existsSync(resumePath)) {
    await page.setInputFiles("input#resume-file-input", resumePath);
    await page.click('button:has-text("Upload & Extract")');
    await page.waitForTimeout(4000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "05_settings_after_upload_desktop.png") });

  // Save profile preferences
  try {
    const roleInput = page.locator('input[placeholder*="Distributed Systems Engineer"]');
    if (await roleInput.isVisible()) {
      await roleInput.fill("Software Engineer, Backend Developer");
      await page.fill('input[placeholder*="Tesla, Stripe"]', "Google, Meta, Apple, Cyberdyne Systems");
      await page.fill('input[placeholder*="React, PostgreSQL"]', "Python, TypeScript, FastAPI, PostgreSQL");
      await page.click('button:has-text("Save Profile & Preferences")');
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    console.log("Preference save notice:", e.message);
  }

  // Connections & CSV Import
  console.log("6. Visiting Connections Page & Importing CSV...");
  await page.goto(`${BASE_URL}/connections`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_connections_empty_desktop.png") });

  const importBtn = page.locator('button:has-text("Import Connections.csv")').first();
  if (await importBtn.isVisible()) {
    await importBtn.click();
    await page.waitForTimeout(1000);

    const csvPath = "C:/CareerConnect AI/sample_Connections.csv";
    await page.setInputFiles("input#csv-file-input", csvPath);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_connections_preview_modal_desktop.png") });

    const confirmBtn = page.locator('button:has-text("Confirm & Import")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_connections_imported_desktop.png") });

  // Shortlist & Scoring
  console.log("7. Visiting Shortlist Page & Scoring...");
  await page.goto(`${BASE_URL}/shortlist`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "07_shortlist_before_scoring_desktop.png") });

  const scoreBtn = page.locator('button:has-text("Score Connections")');
  if (await scoreBtn.isVisible()) {
    await scoreBtn.click();
    await page.waitForTimeout(4000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "07_shortlist_scored_desktop.png") });

  const explainBtn = page.locator("button:has-text('Explain Score')").first();
  if (await explainBtn.isVisible()) {
    await explainBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "07_shortlist_explain_drawer_desktop.png") });
  }

  // Messages
  console.log("8. Visiting Message Studio Page...");
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "08_messages_desktop.png") });

  const generateBtn = page.locator('button:has-text("Generate Outreach Draft")');
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "08_messages_generated_desktop.png") });
  }

  // Tracker
  console.log("9. Visiting Tracker Page...");
  await page.goto(`${BASE_URL}/tracker`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "09_tracker_desktop.png") });

  // Integrations
  console.log("10. Visiting Integrations Page...");
  await page.goto(`${BASE_URL}/integrations`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "10_integrations_desktop.png") });

  // Privacy
  console.log("11. Visiting Privacy Page...");
  await page.goto(`${BASE_URL}/privacy`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "11_privacy_desktop.png") });

  // 404 Page
  console.log("12. Visiting 404 Route...");
  await page.goto(`${BASE_URL}/page-that-does-not-exist`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "12_not_found_desktop.png") });

  // 2. Audit Mobile (390x844 - iPhone 14 / modern standard mobile)
  console.log("\n=== Starting Mobile Audit (390x844) ===");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: await desktopContext.storageState(),
  });
  const mobilePage = await mobileContext.newPage();

  const mobileRoutes = [
    { name: "01_landing_mobile.png", path: "/" },
    { name: "02_register_mobile.png", path: "/register" },
    { name: "03_login_mobile.png", path: "/login" },
    { name: "04_overview_mobile.png", path: "/overview" },
    { name: "05_settings_mobile.png", path: "/settings" },
    { name: "06_connections_mobile.png", path: "/connections" },
    { name: "07_shortlist_mobile.png", path: "/shortlist" },
    { name: "08_messages_mobile.png", path: "/messages" },
    { name: "09_tracker_mobile.png", path: "/tracker" },
    { name: "10_integrations_mobile.png", path: "/integrations" },
    { name: "11_privacy_mobile.png", path: "/privacy" },
    { name: "12_not_found_mobile.png", path: "/page-that-does-not-exist" },
  ];

  for (const route of mobileRoutes) {
    console.log(`Mobile: Visiting ${route.path}...`);
    await mobilePage.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, route.name) });
  }

  await browser.close();
  console.log("\nAudit run completed! All screenshots captured in:", ARTIFACT_DIR);
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
