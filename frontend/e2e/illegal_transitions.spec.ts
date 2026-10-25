import { test, expect } from "@playwright/test";

test.describe("CareerConnect AI — State Machine & Legal Workflow Integrity", () => {
  const timestamp = Date.now();
  const testEmail = `statemachine_${timestamp}@example.edu`;
  const testPassword = "StrongPassword123!";

  test("Enforces legal progression: rejects skip-transitions with 409 and /send with 501", async ({ page }) => {
    // 1. Register candidate using page.request (cookie jar is automatically preserved)
    const regRes = await page.request.post("http://127.0.0.1:8000/api/v1/auth/register", {
      data: {
        email: testEmail,
        password: testPassword,
        full_name: "State Machine Tester",
      },
    });
    expect(regRes.ok()).toBeTruthy();
    const { csrf_token } = await regRes.json();

    // 2. Create contact
    const contactRes = await page.request.post("http://127.0.0.1:8000/api/v1/contacts", {
      headers: {
        "X-CSRF-Token": csrf_token,
      },
      data: {
        first_name: "Morgan",
        last_name: "Vance",
        company: "Stripe",
        position: "Infrastructure Architect",
        profile_url: "https://linkedin.com/in/morgan-vance",
      },
    });
    expect(contactRes.ok()).toBeTruthy();
    const contact = await contactRes.json();

    // 3. Generate initial draft (Status: Draft) using Template C
    const draftRes = await page.request.post("http://127.0.0.1:8000/api/v1/messages/generate", {
      headers: {
        "X-CSRF-Token": csrf_token,
      },
      data: {
        contact_id: contact.id,
        template_code: "C",
        tone: "conversational",
        allow_referral_override: true,
      },
    });
    expect(draftRes.ok()).toBeTruthy();
    const draft = await draftRes.json();
    expect(draft.status).toBe("Draft");

    // 4. Test Illegal Transition: Draft -> User-confirmed sent (must return 409 Conflict)
    const illegalTransRes = await page.request.post(`http://127.0.0.1:8000/api/v1/messages/${draft.id}/transition`, {
      headers: {
        "X-CSRF-Token": csrf_token,
      },
      data: {
        target_state: "User-confirmed sent",
      },
    });
    expect(illegalTransRes.status()).toBe(409);
    const errData = await illegalTransRes.json();
    expect(errData.detail).toContain("Illegal state transition");

    // 5. Test 501 Policy Guard on /send
    const forbiddenSendRes = await page.request.post(`http://127.0.0.1:8000/api/v1/messages/${draft.id}/send`, {
      headers: {
        "X-CSRF-Token": csrf_token,
      },
    });
    expect(forbiddenSendRes.status()).toBe(501);
    const sendErr = await forbiddenSendRes.json();
    expect(sendErr.detail).toContain("Direct programmatic messaging requires an approved LinkedIn Enterprise Partner integration");
  });
});
