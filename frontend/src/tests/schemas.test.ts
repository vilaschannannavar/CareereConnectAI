import { describe, it, expect } from "vitest";
import {
  ContactSchema,
  MessageDraftSchema,
  UserSchema,
  JobOpeningSchema,
} from "@/lib/schemas";

const VALID_UUID_1 = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "123e4567-e89b-12d3-a456-426614174001";

describe("Frontend Zod Schemas Validation", () => {
  it("validates valid Contact objects and rejects invalid ones", () => {
    const validContact = {
      id: VALID_UUID_1,
      user_id: VALID_UUID_2,
      first_name: "Sarah",
      last_name: "Connor",
      full_name: "Sarah Connor",
      company: "Cyberdyne Systems",
      position: "Head of Security",
      profile_url: "https://www.linkedin.com/in/sarah-connor",
      connected_on: "2024-01-15T00:00:00Z",
      created_at: "2024-01-15T00:00:00Z",
    };

    const parsed = ContactSchema.safeParse(validContact);
    expect(parsed.success).toBe(true);

    const invalidContact = { first_name: 123 };
    const invalidParsed = ContactSchema.safeParse(invalidContact);
    expect(invalidParsed.success).toBe(false);
  });

  it("validates MessageDraftSchema with permitted state strings", () => {
    const validDraft = {
      id: VALID_UUID_1,
      contact_id: VALID_UUID_2,
      template_code: "A",
      tone: "formal",
      subject: "Inquiry regarding team",
      body: "Hello Sarah, I noticed your work at Cyberdyne...",
      status: "Approved",
      character_count: 45,
      character_limit_warning: false,
      created_at: "2024-01-15T00:00:00Z",
    };

    const parsed = MessageDraftSchema.safeParse(validDraft);
    expect(parsed.success).toBe(true);
  });

  it("validates UserSchema email format", () => {
    const validUser = {
      id: VALID_UUID_1,
      email: "engineer@example.com",
      full_name: "Alice Engineer",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(UserSchema.safeParse(validUser).success).toBe(true);

    const invalidUser = {
      id: VALID_UUID_1,
      email: "not-an-email",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(UserSchema.safeParse(invalidUser).success).toBe(false);
  });

  it("validates JobOpeningSchema with status", () => {
    const validOpening = {
      id: VALID_UUID_1,
      user_id: VALID_UUID_2,
      company: "Datadog",
      title: "Backend Engineer",
      status: "Verified current",
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(JobOpeningSchema.safeParse(validOpening).success).toBe(true);
  });
});
