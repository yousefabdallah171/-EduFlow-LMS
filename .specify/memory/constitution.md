<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Bump type: MINOR (first concrete fill — all principles and sections added from scratch)

Modified principles:
  [PRINCIPLE_1_NAME] → I. Clean Architecture (NON-NEGOTIABLE)
  [PRINCIPLE_2_NAME] → II. Security-First
  [PRINCIPLE_3_NAME] → III. Video Protection (NON-NEGOTIABLE)
  [PRINCIPLE_4_NAME] → IV. Performance Standards
  [PRINCIPLE_5_NAME] → V. UI System Integrity (NON-NEGOTIABLE)
  [SECTION_2_NAME]   → VI. Bilingual & Accessibility (NON-NEGOTIABLE)
  [SECTION_3_NAME]   → VII. UX Consistency Standards

Added sections:
  - VIII. Testing Standards (P0 Coverage — NON-NEGOTIABLE)
  - Tech Stack & API Constraints
  - Development Workflow & Quality Gates

Removed sections: none

Templates requiring updates:
  ✅ .specify/memory/constitution.md — written (this file)
  ✅ .specify/templates/plan-template.md — Constitution Check gates align with principles I–VIII
  ✅ .specify/templates/spec-template.md — no structural changes needed; FR/SC sections compatible
  ✅ .specify/templates/tasks-template.md — security, bilingual, and video tasks map to existing phases

Deferred TODOs: none
-->

# EduFlow LMS Constitution

## Core Principles

### I. Clean Architecture (NON-NEGOTIABLE)

Every layer of the backend MUST maintain strict separation of concerns with no exceptions:

- **Controllers** handle HTTP routing, request parsing, and response formatting ONLY. No business logic.
- **Services** contain all business logic. Services MUST NOT import Prisma or execute raw queries directly.
- **Repositories** own all database interactions via Prisma. No query logic may exist outside a repository.
- **Redis** access is permitted only within services (caching layer) or dedicated queue workers; never in controllers.
- Circular dependencies between services MUST be resolved through dependency injection, not import cycles.
- All API routes MUST be versioned under `/api/v1/`. Introducing an unversioned route is a blocking violation.

**Rationale**: A two-person project (admin + student) with video, payments, and drip content accumulates
complexity fast. Strict layering prevents logic from leaking into controllers or raw queries appearing in
services, which historically causes untestable, fragile codebases.

### II. Security-First

Security controls are non-negotiable and MUST be enforced at every layer:

- Passwords MUST be hashed with bcrypt (min cost factor 12); plaintext storage or weaker hashing is prohibited.
- JWT access tokens MUST expire in 15 minutes. Refresh tokens MUST rotate on every use (7-day TTL) and be
  stored exclusively in `httpOnly`, `Secure`, `SameSite=Strict` cookies. No tokens in `localStorage`.
- Every protected route MUST enforce RBAC server-side. Client-side role checks are decorative only and do not
  replace server enforcement.
- Admin endpoints MUST require 2FA. Any admin route reachable without 2FA is a blocking security defect.
- Rate limiting MUST be applied to all authentication endpoints and all payment/webhook endpoints.
- Paymob webhook payloads MUST be verified via HMAC signature before any enrollment action is triggered.
  Enrolling a student without a verified webhook is a critical security violation.
- All data at rest MUST be encrypted with AES-256. All data in transit MUST use TLS 1.3 minimum.
- SQL injection, XSS, and CSRF protections MUST be active. `helmet`, `cors` with allowlist, and parameterized
  queries via Prisma are the baseline; disabling any of these requires documented justification.

**Rationale**: The platform handles payments (Paymob), PII (student accounts), and premium video content.
A breach in any of these areas creates legal liability and reputational damage for a real-money product.

### III. Video Protection (NON-NEGOTIABLE)

Video delivery has exactly one permitted path — violations here are critical defects:

- Video content MUST be served exclusively as HLS (`.m3u8` + `.ts` segments) via tokenized, time-limited
  signed URLs. Direct MP4 URLs MUST never be exposed to any client under any circumstance.
- Signed URL tokens MUST be validated on every segment request. Tokens MUST NOT be reusable after expiry
  or across different user sessions.
- Dynamic watermarking MUST be applied to the video player overlay, embedding the student's identifier
  (name/email) so leaked screen recordings are traceable.
- The tus resumable upload protocol MUST be used for all admin video uploads. Direct multipart form uploads
  bypassing tus are not permitted.
- HLS encryption keys MUST be rotated per session or per signed URL generation cycle.

**Rationale**: Premium paid video content is the core product. A single unprotected MP4 link would allow
unlimited redistribution of the entire course, destroying the business model.

### IV. Performance Standards

The following metrics are hard targets, not aspirations. Features that violate them MUST not be merged:

- **Page load**: Under 2 seconds (LCP) on a standard 4G connection.
- **API response**: Under 500ms p95 for all `/api/v1/` endpoints. Queries exceeding this MUST be profiled
  and optimized before merge (add indexes, cache with Redis, or paginate).
- **Video first-frame**: Under 3 seconds from play button press to first decoded frame.
- **Error rate**: Below 0.1% across all production API requests (measured over a rolling 24-hour window).
- Frontend bundles MUST be code-split by route. No monolithic bundle is permitted.
- All data-fetching components MUST render loading skeletons immediately; blank screens while loading are
  a UX defect.
- Redis MUST be used for caching session data, enrollment status, and any query result that would otherwise
  be recomputed per request.

**Rationale**: EduFlow competes on perceived quality. Slow video startup or sluggish dashboards directly
erode student trust and increase support burden.

### V. UI System Integrity (NON-NEGOTIABLE)

The three-layer UI system MUST be respected. Mixing layers or bypassing them is a code quality violation:

- **Layer 1 — shadcn/ui**: MUST be used for all interactive elements: tables, dialogs, sheets, tabs, forms,
  badges, toasts (Sonner), progress indicators, skeletons, cards, avatars, accordions, selects, switches.
  No custom re-implementations of these components are permitted.
- **Layer 2 — Headless UI**: MUST be used where full visual control over an unstyled accessible primitive
  is required: language switcher menu, combobox student search, mobile navigation drawer, FAQ disclosure,
  theme toggle switch, lesson editor tabs, overlay transitions. Do not use shadcn for these cases.
- **Layer 3 — Floating UI**: MUST be used as the positioning engine for all tooltips, popovers, and dropdown
  menus: admin action tooltips, video player control tooltips, coupon info popovers, drip date pickers,
  tag assignment popovers, profile nav dropdown. Do not hand-roll position calculations.
- All shadcn/ui components MUST be restyled exclusively through the EduFlow brand token system. The primary
  brand color is `#EB2027` with a full tonal scale defined in `tailwind.config`. Inline style overrides that
  bypass the token system are prohibited.
- Typography: **Inter** MUST be used for all Latin UI text. **Noto Kufi Arabic** MUST be used for all Arabic
  content. Font switching MUST be driven by the active locale, not manual class application.
- Dark and light mode MUST be implemented and tested on every page and every dashboard view. A feature that
  renders correctly only in one mode is incomplete.

**Rationale**: Consistency across a bilingual, dual-mode UI requires a governed component system. Ad-hoc
component creation produces visual inconsistency and accessibility regressions.

### VI. Bilingual & Accessibility (NON-NEGOTIABLE)

Full Arabic/English bilingual support is a first-class architectural requirement, not a post-launch addition:

- CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, etc.) MUST be
  used throughout. Hardcoded `left`/`right` values in CSS or Tailwind (`ml-`, `mr-`, `pl-`, `pr-`,
  `left-`, `right-`) are forbidden. Any PR introducing a `left`/`right` value without documented justification
  MUST be rejected.
- RTL and LTR switching MUST be implemented via `dir` attribute on `<html>` and must require no component-level
  changes. Components MUST be direction-agnostic by design.
- All user-visible strings MUST be externalized into the i18n translation layer. Hardcoded English or Arabic
  strings in JSX are a defect.
- Icon directionality (arrows, chevrons, back buttons) MUST flip correctly in RTL mode.
- All interactive components (buttons, forms, dialogs, navigation) MUST meet WCAG 2.1 AA keyboard navigation
  and ARIA labeling standards. Both English and Arabic labels MUST be provided.

**Rationale**: A bilingual LMS serving Arabic-speaking students where the admin works in either language
demands RTL correctness from day one. Retrofitting RTL support after launch is expensive and error-prone.

### VII. UX Consistency Standards

The user experience MUST be consistent, predictable, and trustworthy across all surfaces:

- **Inline validation**: All form fields MUST display validation errors inline using shadcn/ui `Form` error
  states. Alert-dialog–based or page-reload–based validation feedback is prohibited.
- **Loading states**: Every component that fetches data MUST render a shadcn/ui `Skeleton` while loading.
  Raw spinners or blank containers are not acceptable.
- **Toast notifications**: All success, error, and info feedback MUST use shadcn/ui Sonner toasts. Custom
  notification UI is not permitted.
- **Empty states**: Every list, table, or data surface MUST render a designed empty state with an illustration
  when there is no data. An empty container with no message is a UX defect.
- **Destructive action confirmation**: Every action that deletes, revokes, or irreversibly modifies data MUST
  be gated behind a shadcn/ui `Dialog` confirmation prompt. No direct destructive actions without confirmation.
- **Responsive design**: All pages MUST be functional and visually correct on mobile (320px+), tablet, and
  desktop viewports. Mobile navigation MUST use the Headless UI drawer.

**Rationale**: Students and the admin (Yousef) interact with the platform daily. Inconsistent feedback
patterns erode trust and increase support requests.

### VIII. Testing Standards — P0 Coverage (NON-NEGOTIABLE)

The following P0 flows MUST have automated test coverage before any release. Missing tests on a P0 flow
is a release blocker:

| ID | P0 Flow | Test Type |
|----|---------|-----------|
| T-P0-01 | Student registration (email + password, validation, duplicate check) | Integration |
| T-P0-02 | Paymob purchase initiation and webhook enrollment activation (HMAC verified) | Integration |
| T-P0-03 | Protected video playback token issuance (signed URL generation, expiry, RBAC) | Integration |
| T-P0-04 | Admin tus resumable video upload (chunk integrity, resume-after-interrupt) | Integration |
| T-P0-05 | Manual student enrollment by admin | Integration |
| T-P0-06 | Progress tracking (lesson completion, percentage update, drip unlock trigger) | Integration |

Additional testing requirements:

- All service-layer business logic MUST have unit tests with mocked repositories.
- All repository functions MUST have integration tests against a real test database (no mocks).
- Auth middleware (JWT validation, refresh rotation, RBAC) MUST have dedicated unit tests.
- Paymob HMAC validation MUST have a dedicated test with both valid and tampered payloads.
- Video token issuance MUST have tests verifying that expired or reused tokens are rejected.
- Frontend P0 flows MUST have E2E tests (Playwright or Cypress) covering the happy path.

**Rationale**: Payment webhooks and video token issuance are security-critical paths with financial and
content-protection implications. A regression in any P0 flow affects paying students directly.

## Tech Stack & API Constraints

The following technology decisions are fixed for EduFlow v1 and MUST NOT be substituted without a formal
constitution amendment:

**Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Headless UI + Floating UI.
**Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL + Redis.
**Auth**: JWT (httpOnly cookies) — access token 15 min, refresh token 7 days with rotation.
**Payments**: Paymob only. No additional payment provider without a constitution amendment.
**Video delivery**: HLS via tokenized signed URLs only. CDN origin MUST block direct `.mp4` access at
the infrastructure level.
**Upload protocol**: tus protocol for all video uploads. No alternatives.
**API versioning**: All routes under `/api/v1/`. Version increments require a migration plan.
**Caching**: Redis for session data, enrollment status, and high-frequency read queries.
**Roles**: Two roles only — `ADMIN` and `STUDENT`. No additional roles without a constitution amendment.

## Development Workflow & Quality Gates

All pull requests MUST pass the following gates before merge:

1. **TypeScript strict mode**: Zero type errors. `// @ts-ignore` requires documented justification.
2. **ESLint**: Zero lint errors. Warnings in security-related rules are treated as errors.
3. **No hardcoded `left`/`right`**: Automated lint rule enforcing CSS logical properties.
4. **P0 tests passing**: All P0 integration tests green.
5. **Performance budget**: No regression in Lighthouse scores below 90 (Performance, Accessibility).
6. **Security review**: Any PR touching auth, payments, or video delivery MUST be reviewed with the
   Security-First and Video Protection principles as an explicit checklist.
7. **Bilingual check**: Any PR adding UI strings MUST include both `en` and `ar` translations.
8. **Dark/light mode check**: Any PR adding a new page or component MUST be verified in both modes.

Code review MUST verify compliance with all active principles. Complexity that violates any principle
MUST be justified in the PR description with a documented rationale.

## Governance

- This constitution supersedes all other written or verbal development practices for EduFlow LMS.
- **Amendments**: Any principle change requires (a) a written proposal documenting the motivation,
  (b) identification of all affected features and tests, and (c) a migration plan for existing code.
  The amendment must be recorded in this file with a version bump following semantic versioning.
- **Version policy**: MAJOR = principle removal or backward-incompatible redefinition; MINOR = new
  principle or materially expanded guidance; PATCH = clarification, wording, or typo fix.
- **Compliance review**: Every sprint, the plan phase (`/speckit.plan`) MUST include a Constitution Check
  gate verifying the feature design against all active principles before implementation begins.
- **Enforcement**: Violations found in code review block merge. Violations found post-merge become P0
  defects and MUST be resolved before the next release.
- For runtime development guidance, refer to `CLAUDE.md` (if present) and the agent-specific files
  under `.specify/integrations/`.

**Version**: 1.0.0 | **Ratified**: 2026-04-12 | **Last Amended**: 2026-04-12
