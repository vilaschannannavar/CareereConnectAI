# Project Status

## Done
- **Phase 1: Feasibility and Foundation**
  - [x] Workspace inspection completed (Python 3.12.10, Node v24.14.0, npm 11.9.0; Docker CLI status documented).
  - [x] Living technical feasibility documentation ([`docs/LINKEDIN_CAPABILITIES.md`](./LINKEDIN_CAPABILITIES.md)) with official sources, checked dates, exact OIDC claims, Connections API restrictions, Messaging API restrictions, and `Connections.csv` preamble analysis.
  - [x] Monorepo orchestration & config (`docker-compose.yml` for PostgreSQL 16, clean `.env.example`, `.gitignore`, `README.md`).
  - [x] Backend architecture: FastAPI skeleton with `/health` and capability registry served at `/api/integrations/capabilities` and `/api/v1/capabilities`.
  - [x] Database foundation: SQLAlchemy 2 (async) with UUID keys, Alembic migrations initialized (`0001_initial`), async SQLite fallback for dev/test without Docker.
  - [x] Security primitives: Argon2id password hashing, AES/Fernet token encryption at rest, CSRF protection, httpOnly session cookies.
  - [x] Privacy & Logging: PII redaction filter scrubbing emails, tokens, passwords, and resume text from logs.
  - [x] Private Storage Abstraction: Sandboxed per-user local storage with directory traversal prevention.
  - [x] User Isolation Guard: Strict server-side resource authorization returning 404 (not 403) for foreign user resources.
  - [x] Frontend foundation: Next.js 14.2 App Router, TypeScript, Tailwind CSS, and shadcn-styled components.
  - [x] Honest UI controls: `HonestButton` component bound to Capability Registry, ensuring zero placeholder buttons.

- **Phase 2: Core Application Infrastructure & Models**
  - [x] Email/password registration, login, logout, `/api/auth/me`; Argon2id hashing; secure cookie sessions; CSRF; sliding-window rate limiting on auth routes.
  - [x] LinkedIn OIDC sign-in via authorization-code flow with state + nonce validation and ID token validation behind the capability registry; disabled with honest "not configured" notice when client ID/secret are absent. LinkedIn is never required.
  - [x] Comprehensive database models for all 9 entities: `users`, `candidate_profiles`, `resumes`, `integrations`, `contacts`, `contact_analyses`, `message_drafts`, `outreach_events`, `audit_log` with UUID primary keys, FKs, indexes, and normalized URL uniqueness constraint (`unique(user_id, profile_url_normalized)`).
  - [x] Alembic migration `0002_core_models_and_rls` adding tables and PostgreSQL Row-Level Security (RLS) policies.
  - [x] PostgreSQL RLS per-request session setting (`SET LOCAL app.current_user_id`) + dual-layer Python user isolation returning 404 (never 403) for other users' resources.
  - [x] Frontend app layout with responsive accessible Sidebar for all 7 pages: Overview (`/overview`), Connections (`/connections`), Shortlist (`/shortlist`), Message Studio (`/messages`), Outreach Tracker (`/tracker`), Integrations (`/integrations`), and Settings & Privacy (`/settings`).
  - [x] Real empty, loading, and error states across all pages.
  - [x] Integrations page rendering the real backend capability registry state and LinkedIn OIDC connection status.
  - [x] Complete test suite passing: 24 backend pytest tests (including rate limiting, OIDC validator, and two-user 404 isolation test suite), 3 frontend Vitest tests, and Next.js 13-route production build passing.

- **Phase 3: Resume + Connections Processing**
  - [x] Resume upload support for PDF and DOCX documents with 5 MB size guard and binary magic bytes validation (`%PDF-` for PDF, `PK\x03\x04` for DOCX) preventing file spoofing.
  - [x] Private file storage abstraction with random UUID keys and zero public URLs. Secure download strictly through authenticated streaming endpoint `GET /api/v1/resumes/{id}/download`.
  - [x] ClamAV antivirus hook support behind `CLAMAV_ENABLED` configuration flag with safe fallback.
  - [x] Text extraction engine using `pypdf` (PDF) and `python-docx` (DOCX).
  - [x] Provider-agnostic structured LLM resume parsing service (Gemini / Mock) with strict anti-prompt-injection delimitation (`<RESUME_DATA>`) and Pydantic v2 schema validation (`ParsedResumeSchema`).
  - [x] Zero-fabrication guarantee: absent or unstated fields remain `null` or `[]`.
  - [x] Editable profile confirmation form on frontend requiring explicit user review and confirmation before profile attributes are activated for message drafting.
  - [x] Resume deletion endpoint physically unlinks and removes file from disk storage and cascades DB record.
  - [x] LinkedIn `Connections.csv` parser with automatic preamble notes stripping, UTF-8 BOM (`utf-8-sig`) handling, and Latin-1/CP1252 encoding tolerance.
  - [x] Connections CSV preview endpoint (`POST /api/v1/contacts/preview-csv`) extracting header detection, preamble line count, mapping suggestions, and sample rows.
  - [x] Duplicate detection and safe upsert engine (`POST /api/v1/contacts/import-csv`): primary deduplication on normalized profile URL (`profile_url_normalized`), secondary fallback on full name + company. Re-importing updates existing contacts without duplicating.
  - [x] Directory search, role filtering, company filtering, and multi-field sorting (`name`, `company`, `connected_on` asc/desc) with honest "Unknown" fallback rendering for absent fields.
  - [x] Automated tests passing: 37 backend pytest tests (synthetic PDF/DOCX generation, magic bytes spoofing rejection, 5MB size guard, prompt injection defense, cross-user 404 download isolation, physical file unlinking, preamble stripping, BOM tolerance, and upsert deduplication), 3 frontend Vitest tests, and Next.js 13-route production build passing.

- **Phase 4: Classification, Scoring & Shortlists**
  - [x] Layered contact classification engine ([`backend/app/services/classifier.py`](../backend/app/services/classifier.py)) supporting multi-tag categories: A (HR/Recruiter), B (Technical Professional), C (Engineering Leadership), D (Potential Referrer), and E (Low Relevance).
  - [x] **Strict Category D Evidence Rule**: Requires explicit verified evidence (employer matches user target company or alumni notes explicitly recorded); never infers alumni status or sensitive attributes.
  - [x] Content-hash caching (`compute_content_hash`) preventing redundant LLM re-calls.
  - [x] 5-factor scoring engine ([`backend/app/services/scoring.py`](../backend/app/services/scoring.py)) with configurable weights (`role_relevance: 30`, `ability_to_help: 25`, `company_industry: 20`, `technical_domain: 15`, `recruitment_referral_evidence: 10`).
  - [x] Dynamic weight renormalization when factors have no evidence, with proportional confidence degradation.
  - [x] Priority bands: High (>=70), Medium (40-69), Low (<40), Insufficient Information (confidence < 0.3 or < 2 scorable factors).
  - [x] Shortlist models ([`Shortlist`](../backend/app/models/shortlist.py), [`ShortlistItem`](../backend/app/models/shortlist_item.py)) with Alembic migration `0003_phase4_scoring_and_shortlists.py` and PostgreSQL Row-Level Security policies.
  - [x] API endpoints: single analyze (`POST /api/v1/scoring/analyze/{id}`), batch analyze (`POST /api/v1/scoring/batch-analyze`), instant weight re-scoring without LLM (`POST /api/v1/scoring/re-score`), manual category override (`PUT /api/v1/scoring/analysis/{id}`), and shortlist CRUD + CSV streaming export (`GET /api/v1/shortlists/{id}/export-csv`).
  - [x] Frontend Shortlist & Scoring page ([`frontend/src/app/shortlist/page.tsx`](../frontend/src/app/shortlist/page.tsx)) with:
    - Prominent transparency note: *"A high score means relevance, not that the person is hiring."*
    - Interactive weight sliders with instant re-scoring.
    - Category filter pills (A, B, C, D, E) and Priority tier selector.
    - Score Explanation drawer detailing 5-factor breakdown, sub-scores, weights, and evidence strings.
    - Manual category tags editor.
    - Named shortlists manager with CSV export.
  - [x] All 45 backend pytest tests passing, 3 frontend Vitest tests passing, and Next.js 13-route production build passing cleanly.

- **Phase 5: Messages, Approval, and Tracking**
  - [x] Official LinkedIn connection request note limit recorded in [`docs/LINKEDIN_CAPABILITIES.md`](./LINKEDIN_CAPABILITIES.md) Section E (300 characters).
  - [x] Outreach message generator ([`backend/app/services/message_generator.py`](../backend/app/services/message_generator.py)) implementing canonical Templates A (Recruiter), B (Referral), C (Hiring Manager/Tech Lead) across 4 tones (`formal`, `concise`, `conversational`, `technical`).
  - [x] Zero-fabrication guarantee: domains generalized strictly from confirmed candidate profile and contact fields; no unstated skills or achievements invented. Transparency panel reveals all `details_used`.
  - [x] **Strict Template B Referral Gating**: Template B is restricted to Category D contacts (target company employees or alumni); non-Category D attempts return 400 Bad Request unless user explicitly checks referral confirmation override. Never asks every contact for a referral.
  - [x] Character limit counter & warning: flags drafts exceeding 300 characters (`character_limit_warning=True`).
  - [x] Server-side enforced outreach state machine ([`backend/app/services/state_machine.py`](../backend/app/services/state_machine.py)):
    - Legal path: `Draft` &rarr; `Reviewed` &rarr; `Approved` &rarr; `Awaiting manual send` &rarr; `User-confirmed sent`.
    - Illegal transitions strictly return HTTP 409 Conflict.
    - Editing an `Approved` draft automatically resets status to `Draft` for re-approval.
    - Copy action (`POST /api/v1/messages/{id}/copy`) logs an audit event (`copied`) and strictly **never** alters draft state (*copying is not sending*).
    - Direct send endpoint (`POST /api/v1/messages/{id}/send`) strictly returns HTTP 501 Not Implemented (*LinkedIn messaging unauthorized*).
  - [x] Alembic migration `0004_phase5_messaging_state_machine.py` updating `message_drafts` and `outreach_events` models.
  - [x] Outreach Tracker API ([`backend/app/api/v1/tracker.py`](../backend/app/api/v1/tracker.py)):
    - Categorized pipeline buckets (`drafted`, `approved`, `awaiting_manual_send`, `marked_sent`, `sent_verified`, `follow_up_suggested`, `replied`).
    - Default 7-day follow-up suggestion scheduled upon user-confirmed send.
    - Custom follow-up rescheduling (`POST /api/v1/tracker/{id}/schedule-follow-up`).
    - Explicit user confirmation for replied status (`POST /api/v1/tracker/contact/{id}/mark-replied`).
    - Full chronological audit timeline (`GET /api/v1/tracker/events`).
  - [x] Frontend Message Studio ([`frontend/src/app/messages/page.tsx`](../frontend/src/app/messages/page.tsx)) and Outreach Tracker ([`frontend/src/app/tracker/page.tsx`](../frontend/src/app/tracker/page.tsx)).
  - [x] All 51 backend pytest tests passing, 3 frontend Vitest tests passing, and Next.js 13-route production build passing cleanly.

- **Phase 6: Security, Privacy, and Hardening**
  - [x] Granular data retention controls: single contact delete (`DELETE /api/v1/contacts/{id}`), bulk contact purge (`DELETE /api/v1/contacts`), single resume delete with physical file unlinking (`DELETE /api/v1/resumes/{id}`), and complete account hard deletion with full cascade across all 9 relational entities and disk storage directory removal (`DELETE /api/v1/auth/account`).
  - [x] Candidate preferences & scoring configuration: custom 5-factor scoring weight sliders, tone style preferences, and retention controls persisted via Alembic migration `0006_phase6_hardening_preferences.py`.
  - [x] Dedicated Privacy Notice page ([`frontend/src/app/privacy/page.tsx`](../frontend/src/app/privacy/page.tsx)) detailing what is stored, why, retention rules, deletion guarantees, and zero-scraping compliance.
  - [x] Full data portability export endpoint (`GET /api/v1/auth/export-data`) generating machine-readable JSON bundle of profile, resumes, contacts, analyses, shortlists, drafts, events, and integrations.
  - [x] Disconnect integrations endpoint (`DELETE /api/v1/integrations/{provider}`) revoking and deleting stored tokens.
  - [x] Route rate limiting on all mutating endpoints: upload (10/min), import (10/min), analyze (20/min), generate (20/min).
  - [x] Security headers middleware (`SecurityHeadersMiddleware`) injecting HSTS, nosniff, DENY, CSP, and Permissions-Policy on all responses.
  - [x] Upload abuse defense: magic bytes validation, 5 MB size limit, and DOCX decompression bomb defense (`check_docx_decompression_safety` with 25 MB max uncompressed limit, 500 files, 100:1 ratio).
  - [x] Dependency security audits: `pip-audit` verified with 0 known vulnerabilities; `npm audit` findings evaluated and documented.
  - [x] Playwright end-to-end user flow ([`frontend/e2e/full_user_flow.spec.ts`](../frontend/e2e/full_user_flow.spec.ts)) running against localhost with synthetic data verifying: register &rarr; upload resume &rarr; import CSV &rarr; analyze &rarr; generate &rarr; approve &rarr; copy &rarr; mark sent &rarr; tracker pipeline.
  - [x] 11 automated security tests passing (`backend/tests/test_upload_abuse_review.py` and `backend/tests/test_systematic_auth_review.py`).
  - [x] Comprehensive security documentation updated in [`docs/SECURITY_REVIEW.md`](./SECURITY_REVIEW.md).

- **Phase 7: Deployment Configuration & Production Readiness**
  - [x] Production Dockerfile for FastAPI backend ([`backend/Dockerfile`](../backend/Dockerfile)) with multi-stage Python 3.12-slim build, non-root user (`appuser`), and healthcheck probe.
  - [x] Production Dockerfile for Next.js frontend ([`frontend/Dockerfile`](../frontend/Dockerfile)) with multi-stage Node 20-alpine build, non-root runner user (`nextjs`), and standalone output.
  - [x] Full orchestration in [`docker-compose.yml`](../docker-compose.yml) linking PostgreSQL 16, FastAPI backend, and Next.js frontend with automated healthchecks, environment variables, and persistent storage volumes.
  - [x] Production deployment documentation ([`docs/DEPLOYMENT.md`](./DEPLOYMENT.md)) covering architecture topology, complete environment variable reference, migration steps, reverse proxy (Nginx) TLS termination and security headers, and official LinkedIn Developer App setup guide.
  - [x] Clean environment variable template updated ([`.env.example`](../.env.example)).

- **Phase 8: Company & Job Research (Curated & Manual Only — Zero Scraping)**
  - [x] Manually recorded target job openings model ([`JobOpening`](../backend/app/models/job_opening.py)) with Alembic migration `0005_phase8_job_openings.py` and PostgreSQL Row-Level Security policies.
  - [x] Curated directory of official company career portals ([`backend/app/services/career_directory.py`](../backend/app/services/career_directory.py)) mapping top tech employers (Google, Tesla, Apple, Microsoft, Amazon, Meta, Netflix, Stripe, etc.) to verified career portals without scraping. Safe search link fallback for custom companies.
  - [x] Endpoints for job openings CRUD and career portal resolution ([`backend/app/api/v1/openings.py`](../backend/app/api/v1/openings.py)).
  - [x] Integrated career portal research links on frontend Shortlist and Message Studio pages.
  - [x] 3 automated tests in [`backend/tests/test_openings_and_research.py`](../backend/tests/test_openings_and_research.py) passing.

- **Phase B: Design System, Tokens, Dark Mode, Accessible Components, Shell & Landing Page**
  - [x] Modern curated design system tokens in `frontend/src/app/globals.css` with dark mode support (`next-themes`).
  - [x] 16 accessible UI components built with Radix UI primitives: Button, Input, Textarea, Badge, Card, Dialog, Drawer, DropdownMenu, Tabs, Toast/Toaster, Slider, Progress, Tooltip, Avatar, Skeleton, EmptyState.
  - [x] Responsive layout shell (`AppShell`, `Sidebar`) with mobile hamburger drawer and collapsible desktop mode.
  - [x] High-converting landing page (`frontend/src/app/page.tsx`) highlighting zero-scraping guarantees, interactive ROI networking funnel preview, live capability status indicators, and testimonials.
  - [x] Global error boundary (`error.tsx`), not found page (`not-found.tsx`), loading skeleton (`loading.tsx`), and automated SEO metadata.

- **Phase C: Typed API Client, TanStack Query, Next.js Route Guards & Modular Decomposition**
  - [x] Typed API client (`frontend/src/lib/api.ts`) supporting credentials forwarding, automatic double-submit CSRF token extraction/injection, and typed REST methods.
  - [x] React Query (TanStack Query) hooks with optimistic updates and cache invalidation.
  - [x] Next.js edge route guard middleware (`frontend/src/middleware.ts`) enforcing authenticated route access and redirecting authenticated users away from public auth pages.
  - [x] Strict modular decomposition ensuring all page components remain under ~200 lines.

- **Phase D: Guided Onboarding Wizard, Overview Funnel & Virtualized Connections Directory**
  - [x] 5-step guided onboarding wizard (`frontend/src/app/onboarding/page.tsx`):
    1. Resume upload with instant extraction
    2. Candidate profile confirmation
    3. Target companies, roles, and scoring weights
    4. LinkedIn `Connections.csv` upload and preview
    5. Batch scoring and launch to shortlist
  - [x] Overview page (`frontend/src/app/overview/page.tsx`) with real-time networking funnel metrics, top recommended outreach targets, and quick action cards.
  - [x] Paginated connections directory (`frontend/src/app/connections/page.tsx`) with search, role/company filters, bulk selection, bulk analysis, and contact deletion.

- **Phase E: Target Openings, Message Studio Workspace & Drag-and-Drop Outreach Tracker**
  - [x] Target job openings manager (`frontend/src/app/openings/page.tsx`) linking target roles to official company career portals.
  - [x] Split-pane Message Studio (`frontend/src/app/messages/page.tsx`) with keyboard shortcuts (`J`/`K` navigation, `Ctrl+Enter` approval), live 300-char counter, tone switcher, and transparency inspector.
  - [x] Legal-only drag-and-drop Outreach Tracker (`frontend/src/app/tracker/page.tsx`) with Kanban columns enforcing the verified outreach lifecycle and 501 blocks on direct sending.

- **Phase F: Advanced Auth Hardening, Cloud Storage Backend & Resilient LLM Gateway**
  - [x] Complete auth flows: Forgot password (`POST /api/v1/auth/forgot-password`), Reset password (`POST /api/v1/auth/reset-password`), Email verification (`POST /api/v1/auth/verify-email`), and active session listing & revocation (`GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/{id}`).
  - [x] Progressive lockout backoff (sliding window tracking failed attempts, locking accounts temporarily after 5 attempts).
  - [x] S3-compatible cloud storage backend (`backend/app/services/s3_storage.py`) with transparent local/S3 switching and moto unit test harness.
  - [x] Resilient LLM Gateway (`backend/app/services/llm_gateway.py`) with automatic fallback to deterministic extraction if LLM providers are unavailable.

- **Phase G: Quality Gates, Vitest Coverage, Playwright E2E Suite & Cross-Platform CI**
  - [x] Frontend Vitest suite expanded to 36 tests with **96.99% statement coverage** (exceeding the >=70% gate).
  - [x] Playwright E2E test suite expanded to 9 specs (12 tests) covering full user lifecycle, dark mode toggling, mobile 390px viewport, bulk actions, illegal state machine transitions, onboarding wizard, and password reset flows.
  - [x] Axe-core automated accessibility audits verifying zero critical WCAG violations across all public routes.
  - [x] `.github/workflows/ci.yml` updated with coverage gates, Next.js build validation, and cross-platform instructions in `README.md`.

- **Phase H: Security Re-Review, Living Docs & Production Release**
  - [x] Security review updated in `docs/SECURITY_REVIEW.md`.
  - [x] Deployment guide updated in `docs/DEPLOYMENT.md`.
  - [x] LinkedIn capabilities verified in `docs/LINKEDIN_CAPABILITIES.md`.
  - [x] Final production verification report compiled.

## Complete Project Verification Summary
- **Backend Test Suite:** 77 / 77 pytest tests passing cleanly (`77 passed in 7.24s`).
- **Frontend Unit Test Suite:** 36 / 36 Vitest tests passing cleanly (`36 passed in 2.57s`, **96.99% statement coverage**, **79.38% branch coverage**).
- **Playwright E2E Suite:** 9 specs, 12 / 12 tests passing cleanly in 14.3s with zero Axe-core accessibility violations.
- **Production Build:** All 20 Next.js static and dynamic App Router routes compiled cleanly (`20/20 static pages`, 0 errors).
- **Security & Hardening:** 100% 401 unauthenticated & 404 IDOR isolation verified, decompression bomb defense active, security headers active, per-user LLM budget cap verified, 0 CVEs in Python virtual environment via `pip-audit`.

## In Progress
- None (All Phases A through H fully implemented, hardened, and verified).

## Blocked
- None.



