import { z } from "zod";

/**
 * Zod Schemas synchronized with FastAPI Backend Pydantic Schemas.
 * Guarantees zero frontend-backend type drift.
 */

// Auth & User Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// Candidate Profile Schemas
export const CandidateProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  target_roles: z.array(z.string()).default([]),
  target_companies: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  education_background: z.string().nullable().optional(),
  years_of_experience: z.number().default(0),
  bio: z.string().nullable().optional(),
  preferred_tone: z.string().default("concise"),
  scoring_weights: z
    .object({
      role_relevance: z.number().default(30),
      ability_to_help: z.number().default(25),
      company_industry: z.number().default(20),
      technical_domain: z.number().default(15),
      recruitment_referral_evidence: z.number().default(10),
    })
    .default({
      role_relevance: 30,
      ability_to_help: 25,
      company_industry: 20,
      technical_domain: 15,
      recruitment_referral_evidence: 10,
    }),
  onboarding_step: z.number().default(0),
  is_confirmed: z.boolean().default(false),
  confirmed_at: z.string().nullable().optional(),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

// Contact Schemas
export const ContactSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  profile_url: z.string().nullable().optional(),
  profile_url_normalized: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  connected_on: z.string().nullable().optional(),
  is_archived: z.boolean().default(false),
  created_at: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

// Contact Analysis & Scoring Schemas
export const ContactAnalysisSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  categories: z.array(z.string()).default([]),
  category_rationale: z.record(z.string(), z.string()).optional(),
  manual_category_override: z.boolean().default(false),
  score: z.number(),
  confidence: z.number().default(0.8),
  priority: z.enum(["High", "Medium", "Low", "Insufficient Information"]),
  factors: z
    .object({
      role_relevance: z.number().default(0),
      ability_to_help: z.number().default(0),
      company_industry: z.number().default(0),
      technical_domain: z.number().default(0),
      recruitment_referral_evidence: z.number().default(0),
    })
    .default({
      role_relevance: 0,
      ability_to_help: 0,
      company_industry: 0,
      technical_domain: 0,
      recruitment_referral_evidence: 0,
    }),
  evidence: z
    .object({
      role_relevance: z.string().optional(),
      ability_to_help: z.string().optional(),
      company_industry: z.string().optional(),
      technical_domain: z.string().optional(),
      recruitment_referral_evidence: z.string().optional(),
    })
    .default({}),
  analyzed_at: z.string(),
});
export type ContactAnalysis = z.infer<typeof ContactAnalysisSchema>;

// Shortlist Schemas
export const ShortlistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_default: z.boolean().default(false),
  created_at: z.string(),
  items_count: z.number().default(0),
});
export type Shortlist = z.infer<typeof ShortlistSchema>;

// Message Draft Schemas
export const MessageDraftSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  status: z.enum([
    "Draft",
    "Reviewed",
    "Approved",
    "Awaiting manual send",
    "User-confirmed sent",
  ]),
  template_code: z.string(),
  tone: z.string(),
  subject: z.string(),
  body: z.string(),
  character_count: z.number(),
  character_limit_warning: z.boolean().default(false),
  details_used: z.record(z.string(), z.any()).default({}),
  delivery_channel: z.string().default("manual_linkedin"),
  sent_at: z.string().nullable().optional(),
  follow_up_suggested_at: z.string().nullable().optional(),
  resume_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});
export type MessageDraft = z.infer<typeof MessageDraftSchema>;

// Job Opening Schemas
export const JobOpeningSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company: z.string(),
  title: z.string(),
  url: z.string().nullable().optional(),
  career_page_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum([
    "Verified current",
    "Previously published",
    "General match",
    "Unverified",
  ]),
  created_at: z.string(),
});
export type JobOpening = z.infer<typeof JobOpeningSchema>;
