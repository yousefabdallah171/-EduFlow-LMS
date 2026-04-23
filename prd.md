# EduFlow LMS — Product Requirements Document
# Version: 1.1 | Updated: 2026-04-12 | Owner: Yousef

---

# SECTION 1 — Project Identity

| Field | Value |
|---|---|
| **Project Name** | EduFlow LMS |
| **Project ID** | PRD-001 |
| **Version** | v1.1 |
| **Status** | Draft |
| **Priority** | High |
| **Created Date** | 2026-04-12 |
| **Last Updated** | 2026-04-12 |
| **Owner / PM** | Yousef |
| **Team Members** | Frontend Dev / Backend Dev / Designer / QA |
| **Tech Stack — Backend** | Node.js + Express + TypeScript + Prisma / PostgreSQL + Redis / FFmpeg / tus-node-server |
| **Tech Stack — Frontend Core** | React 18 + TypeScript + Tailwind CSS |
| **Tech Stack — UI Components** | shadcn/ui (base components) + Headless UI (unstyled primitives) + Floating UI (positioning) |
| **Tech Stack — UI Inspiration Sources** | LandingFolio + TailwindFlex + Tailblocks + MambaUI (layout reference only) |
| **Tech Stack — Optional Acceleration** | Flowbite (selected sections only, fully restyled to brand) |
| **Tech Stack — Video** | HLS.js + custom watermark overlay layer |
| **Tech Stack — i18n** | i18next with RTL/LTR context provider |
| **Tech Stack — State** | React Query (server state) + Zustand (UI state) |
| **Repository** | [TBD] |
| **Git Branch Prefix** | NNN-feature-name |
| **PRD File Path** | docs/PRD.md |

---

# SECTION 2 — Problem & Purpose

## Problem Statement
Content creators lack a dedicated, secure platform to sell and deliver a single focused course. They currently rely on generic marketplaces like Udemy that take significant revenue cuts (30–50%), offer limited branding control, expose content to piracy through weak protection, and lack specialized admin tools for single-course management.

## Project Purpose
EduFlow LMS provides Yousef with full ownership of course delivery, direct revenue collection via Paymob, VPS-hosted secure video delivery with DRM-grade protection, and admin dashboards tailored specifically for a single-course creator business model.

## Business Value
- 100% revenue retention via direct Paymob payments — no marketplace commission
- Maximum video protection through tokenized HLS streaming, dynamic watermarking, and signed URLs
- Detailed analytics covering sales, watch time, retention, and drop-off
- Branded platform that builds long-term audience loyalty beyond a single course
- Complete ownership of the customer relationship and enrollment lifecycle

## Opportunity
Digital course sales are accelerating in the MENA region in 2026. Paymob's payment infrastructure is mature in Egypt. Yousef is ready to launch monetization immediately. Every month of continued dependency on third-party platforms represents lost revenue, lost branding, and increased piracy risk.

---

# SECTION 3 — Goals & Objectives

## Primary Goal
Deliver a fully operational LMS where students can register, purchase the course via Paymob, and consume protected video content — while Yousef retains complete control over content, students, pricing, and revenue through a dedicated admin dashboard.

## Objectives
1. Launch a secure, bilingual (EN/AR) LMS with full RTL support within the agreed timeline
2. Integrate Paymob as the sole payment gateway with webhook-based enrollment activation
3. Implement multi-layer video protection: tokenized HLS, signed URLs, dynamic watermark, no direct MP4 access
4. Deliver admin reporting covering sales metrics, student progress, lesson retention, and drop-off rates
5. Enable both manual enrollment and self-purchase enrollment flows from day one
6. Build the frontend UI system on shadcn/ui + Headless UI + Floating UI to ensure accessibility, consistency, and full brand control

## Success Definition
The platform is considered successful when:
- A student can register, pay, and access the full course without friction
- Yousef can upload, manage, and monitor all content and students from the admin dashboard
- Video content cannot be directly downloaded or hotlinked outside the platform
- Payment transactions are recorded, reconcilable, and reportable by date range
- All UI components are accessible (WCAG 2.1 AA), consistent across EN/AR, and work correctly in both dark and light mode

## Non-Goals
- The platform will not support multiple courses in v1
- No native mobile application will be built in v1
- No live session, webinar, or cohort-based learning in v1
- No AI-generated content, recommendations, or chatbot features in v1
- No affiliate or referral tracking system in v1

---

# SECTION 4 — Scope

## In Scope
- Student registration via email/password and Google OAuth
- Course purchase via Paymob (self-purchase flow)
- Manual enrollment by admin (override flow)
- Protected HLS video playback hosted on VPS with signed tokenized URLs
- Dynamic watermark overlay on all video content (student name + email)
- Lesson file attachments (PDF, ZIP, and document formats)
- Progress tracking at lesson, section, and course level
- Continue watching — resume from last playback position
- Admin: course and lesson manager (create, edit, reorder, delete)
- Admin: resumable upload manager with chunked upload, pause, resume, retry, and progress indicator
- Admin: student management (list, search, activate, revoke, tag, note)
- Admin: Paymob payment records and order history
- Admin: sales reports, watch time reports, drop-off reports, retention reports
- Admin: coupon and discount system
- Admin: drip content scheduling per lesson
- Admin: audit activity log
- Admin: draft / published / scheduled lesson states
- Student onboarding flow (post-registration welcome + orientation)
- Student notifications (new lesson, payment confirmation, activation)
- Q&A and comments per lesson
- Search within course content (lesson titles, descriptions, attachments)
- Full EN/AR bilingual support with LTR/RTL toggle and language switcher in nav
- Dark mode and light mode toggle
- Profile settings: avatar upload, username change, password change
- Conversion funnel tracking (visit → register → checkout → purchase)
- Cohort/tag system for student segmentation
- Static pages: course landing, FAQ, privacy policy, refund policy, contact, order status, purchase success
- Full UI component system built on shadcn/ui + Headless UI + Floating UI

## Out of Scope
- Native iOS or Android application
- Multiple courses or course marketplace
- Live sessions, webinars, or real-time features
- AI-powered features of any kind
- Affiliate or referral tracking system
- Certificate generation or issuance
- Third-party LMS integrations
- Offline video download for students
- Multi-instructor support

## Assumptions
- Yousef will supply all video content, course descriptions, and lesson files before launch
- Paymob merchant account and API credentials will be available before Phase 2
- VPS with sufficient storage and bandwidth will be provisioned before Phase 1 ends
- Design assets (logo, brand colors confirmed as #EB2027 red scale) are available from kickoff
- A single course is the only sellable product in v1

## Constraints
- Video files must never be served as direct MP4 links — HLS only via tokenized signed URLs
- All student-facing content must support both Arabic (RTL) and English (LTR)
- Payment processing is exclusively through Paymob — no other gateway in v1
- The platform must function on VPS infrastructure — no reliance on third-party video CDN in v1
- All interactive components must use shadcn/ui or Headless UI as the base — no raw HTML-only implementations for complex interactions

## Dependencies
- Paymob API availability and webhook reliability
- VPS provisioning and HTTPS configuration
- FFmpeg or equivalent for server-side HLS transcoding
- Google OAuth credentials (Google Cloud Console)
- SMTP provider for transactional email
- shadcn/ui CLI setup and component installation
- Headless UI and Floating UI npm packages

---

# SECTION 5 — Users & Personas

## Primary Users
Arabic-speaking students in Egypt and the broader MENA region who register on the platform, purchase the course, and consume video lessons at their own pace on desktop or mobile browser.

## Secondary Users
Yousef — the course creator, sole admin, and platform owner — who manages all content, students, pricing, and revenue through the admin dashboard.

---

## Persona 1 — The Student

| Field | Detail |
|---|---|
| **Name** | Ahmed (representative) |
| **Role** | Course student / paying customer |
| **Region** | Egypt / MENA |
| **Primary Language** | Arabic |
| **Goal** | Complete the course, track personal progress, and access all lesson files in one organized place |
| **Pain Point** | Existing platforms feel impersonal, unstructured, or leak content freely — no dedicated learning journey |
| **Tech Level** | Medium — comfortable with smartphones and web browsing, may have slow internet connections |
| **Frequency** | Daily or weekly sessions, self-paced |
| **Success Definition** | Student completes all lessons, downloads relevant files, and feels the platform is secure, fast, and easy to navigate |

---

## Persona 2 — The Admin (Yousef)

| Field | Detail |
|---|---|
| **Name** | Yousef |
| **Role** | Course creator / platform owner / sole admin |
| **Goal** | Upload and manage course content, monitor student progress and sales, activate or revoke enrollment, and control pricing — all from one dashboard |
| **Pain Point** | Third-party platforms take 30–50% revenue cuts, offer no content protection, and lack granular admin tools for a single-course business |
| **Tech Level** | Medium-High — familiar with web tools and dashboards, not necessarily a developer |
| **Frequency** | Daily admin use during active launch; weekly ongoing maintenance |
| **Success Definition** | Yousef can upload content without interruption, see who bought and who is watching, activate students in one click, and pull revenue reports by date range |

---

# SECTION 6 — MoSCoW Feature Prioritization

### Must Have — P0

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P0-F001 | Student Auth (Email + Google OAuth) | TODO | Registration and login via email/password and Google OAuth with email verification | Backend Dev | 1 |
| P0-F002 | Course Purchase via Paymob | TODO | Full self-purchase flow: checkout page, Paymob payment initiation, webhook confirmation, auto-enrollment | Backend Dev | 2 |
| P0-F003 | Protected HLS Video Playback | TODO | Video served as HLS stream via tokenized signed URLs from VPS — no direct MP4 access | Backend Dev | 2 |
| P0-F004 | Dynamic Video Watermark | TODO | Persistent overlay showing student name and email, position randomized periodically | Frontend Dev | 2 |
| P0-F005 | Lesson File Attachments | TODO | Per-lesson downloadable files uploaded by admin and accessible by enrolled students | Full Stack | 2 |
| P0-F006 | Progress Tracking | TODO | Track completion at lesson, section, and course level with visual indicators | Full Stack | 3 |
| P0-F007 | Continue Watching | TODO | Resume video playback from last known position per student per lesson | Full Stack | 3 |
| P0-F008 | Admin Course & Lesson Manager | TODO | Create, edit, reorder, delete courses and lessons with rich text description support | Frontend Dev | 1 |
| P0-F009 | Admin Resumable Upload Manager | TODO | Chunked file upload with pause, resume, retry, queue management, and checksum verification using tus protocol | Full Stack | 1 |
| P0-F010 | Admin Manual Enrollment | TODO | Admin can manually activate or revoke a student's course access from the dashboard | Backend Dev | 2 |
| P0-F011 | Admin Student Management | TODO | View, search, filter, activate, revoke, tag, and add notes to students | Frontend Dev | 3 |
| P0-F012 | Admin Payment Records | TODO | View all Paymob transactions with status, amount, date, and student reference | Backend Dev | 2 |
| P0-F013 | EN/AR Bilingual + LTR/RTL | TODO | Full bilingual support with language switcher in nav, RTL layout for Arabic, LTR for English | Frontend Dev | 1 |
| P0-F014 | Dark Mode / Light Mode | TODO | System-aware and manual toggle for dark/light theme across all pages | Frontend Dev | 1 |
| P0-F015 | Profile Settings | TODO | Student can update avatar, username, and password from profile settings page | Full Stack | 3 |
| P0-F016 | UI Component System Setup | TODO | Install and configure shadcn/ui, Headless UI, and Floating UI as the frontend component foundation | Frontend Dev | 1 |

---

### Should Have — P1

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P1-F001 | Coupon & Discount System | TODO | Admin creates coupon codes with percentage or fixed discount, usage limits, and expiry dates | Full Stack | 4 |
| P1-F002 | Drip Content Scheduling | TODO | Admin schedules lesson unlock by date or student progress milestone | Backend Dev | 4 |
| P1-F003 | Admin Sales & Analytics Reports | TODO | Reports for revenue, enrollments, watch time, lesson drop-off, retention, and conversion funnel | Full Stack | 4 |
| P1-F004 | Student Onboarding Flow | TODO | Post-registration welcome screen with platform orientation, progress bar, and "Start Here" CTA | Frontend Dev | 3 |
| P1-F005 | Notifications System | TODO | In-app and email notifications for new lesson, payment confirmation, and enrollment activation | Full Stack | 4 |
| P1-F006 | Q&A / Comments per Lesson | TODO | Threaded comment section below each lesson visible to enrolled students | Full Stack | 5 |
| P1-F007 | Course Content Search | TODO | Search lesson titles, descriptions, and attachment names within the course | Full Stack | 5 |
| P1-F008 | Conversion Funnel Tracking | TODO | Track visit → register → checkout → purchase funnel with admin visibility | Backend Dev | 4 |
| P1-F009 | Cohort & Tag System | TODO | Admin can assign tags to students for segmentation | Backend Dev | 4 |
| P1-F010 | Admin Audit Log | TODO | System log of all admin actions: upload, price change, enrollment, revoke, coupon creation | Backend Dev | 3 |
| P1-F011 | Lesson State Management | TODO | Admin sets each lesson to Draft, Published, or Scheduled state | Backend Dev | 2 |

---

### Could Have — P2

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P2-F001 | In-Video Timestamp Notes | TODO | Student adds personal notes tied to a specific video timestamp | Frontend Dev | 6 |
| P2-F002 | Bulk Admin Actions | TODO | Bulk activate, revoke, tag, or export students from the admin list | Frontend Dev | 6 |
| P2-F003 | Video Speed & Quality Controls | TODO | Student controls playback speed (0.75x–2x) and quality selection in the player | Frontend Dev | 5 |
| P2-F004 | Attachments Tab (Aggregated) | TODO | Dedicated tab listing all course attachments in one place | Frontend Dev | 6 |
| P2-F005 | FAQ Tab per Course | TODO | Static FAQ section on course page to reduce repetitive support messages | Frontend Dev | 5 |
| P2-F006 | Abandoned Checkout Follow-up | TODO | Email trigger for users who initiated checkout but did not complete payment | Backend Dev | 6 |
| P2-F007 | UTM Source Tracking | TODO | Capture and store UTM parameters per registration and purchase | Backend Dev | 5 |
| P2-F008 | Waitlist Page | TODO | Collect email leads before or after course launch for future cohorts | Frontend Dev | 6 |

---

### Won't Have — P3

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P3-F001 | Native Mobile App | TODO | iOS and Android native application — deferred to v2 | — | — |
| P3-F002 | Multiple Courses | TODO | Multi-course catalog — deferred to v2 | — | — |
| P3-F003 | Live Sessions / Webinars | TODO | Real-time instructor-led sessions — deferred to v2 | — | — |
| P3-F004 | AI Features | TODO | AI recommendations, chatbot, or content generation — deferred to v2 | — | — |
| P3-F005 | Affiliate / Referral System | TODO | Referral tracking and commission payouts — deferred to v2 | — | — |
| P3-F006 | Certificate Generation | TODO | Automated course completion certificates — deferred to v2 | — | — |
| P3-F007 | Offline Video Download | TODO | Downloadable lessons for offline viewing — deferred to v2 | — | — |
| P3-F008 | Multi-Instructor Support | TODO | Multiple content creator accounts — deferred to v2 | — | — |

---

# SECTION 7 — Functional Requirements

## P0-F001 — Student Authentication

**Description:** Students register via email/password or Google OAuth. Email registration requires verification before access is granted.

**User Story:** As a new visitor, I want to create an account using my email or Google account so that I can access the platform and purchase the course.

**Trigger:** User clicks "Sign Up" or "Continue with Google" on the registration page.

**Pre-conditions:** User does not have an existing account with the same email.

**Post-conditions:** Account is created, verification email is sent, session token is issued, and the user is redirected to the onboarding flow.

**Main Flow:**
1. User navigates to /register
2. User selects email/password or Google OAuth
3. For email: user enters name, email, password — system validates format and strength
4. System creates account with status: unverified
5. System sends verification email with a signed token link
6. User clicks the link — system marks account as verified
7. User is redirected to the student onboarding flow
8. For Google: system receives OAuth token, extracts profile, creates or links account, issues session

**Alternate Flow — Email Already Exists:**
- System detects duplicate email and returns inline error: "An account with this email already exists."

**Alternate Flow — Google OAuth Failure:**
- System receives error from Google — displays: "Google sign-in failed. Please try again or use email."

**Acceptance Criteria:**
- [ ] User can register with a valid email and password
- [ ] User can register and log in using Google OAuth
- [ ] Duplicate email registration is rejected with a clear inline error message
- [ ] Unverified accounts cannot access course content
- [ ] Verification email is delivered within 60 seconds
- [ ] Session token expires after 7 days and refresh token rotation is enforced
- [ ] All auth endpoints require HTTPS

---

## P0-F002 — Course Purchase via Paymob

**Description:** Students purchase the course through a Paymob-hosted checkout. Enrollment is activated automatically via webhook confirmation.

**User Story:** As a registered student, I want to purchase the course using my card through a secure checkout so that I can immediately access all course content.

**Trigger:** Student clicks "Buy Now" on the course landing page or dashboard.

**Pre-conditions:** Student is authenticated. Course is published and has an active price.

**Post-conditions:** Payment is confirmed via Paymob webhook, enrollment record is created, student receives confirmation email, and course access is activated.

**Main Flow:**
1. Student clicks "Buy Now"
2. System checks: student not already enrolled
3. System creates a pending order record
4. System calls Paymob API to initiate a payment intention
5. Student is redirected to the Paymob hosted payment page
6. Student enters card details and confirms payment
7. Paymob sends webhook to /api/v1/payments/webhook
8. System validates webhook HMAC signature
9. System updates order status to: paid
10. System creates enrollment record for the student
11. System sends enrollment confirmation email
12. Student is redirected to /purchase-success with CTA to enter the course

**Alternate Flow — Payment Failed:**
- Paymob returns failure status — student is shown an error page with "Try Again" option

**Alternate Flow — Webhook Delayed:**
- System shows a pending status page — webhook is retried by Paymob — enrollment is activated once confirmed

**Acceptance Criteria:**
- [ ] Student cannot enroll without a confirmed payment (except manual enrollment by admin)
- [ ] Paymob webhook HMAC signature is validated on every callback
- [ ] Duplicate webhook events do not create duplicate enrollments (idempotency enforced)
- [ ] Pending orders expire after 30 minutes if not confirmed
- [ ] Student receives enrollment confirmation email within 2 minutes of payment
- [ ] Admin can view all orders with status in the payment records panel
- [ ] Coupon codes are applied before payment initiation and reflected in the Paymob amount

---

## P0-F003 — Protected HLS Video Playback

**Description:** All video content is served exclusively as HLS streams via tokenized signed URLs. No direct MP4 access is permitted under any circumstance.

**User Story:** As an enrolled student, I want to watch lesson videos in a smooth streaming player so that I can learn without interruption while the platform protects the content from unauthorized download.

**Trigger:** Student opens a lesson page and the video player initializes.

**Pre-conditions:** Student is authenticated and enrolled. Lesson is published and not locked by drip schedule.

**Post-conditions:** Video plays via HLS in the browser player. No downloadable URL is exposed. Playback position is recorded server-side.

**Main Flow:**
1. Student navigates to a lesson page
2. Frontend requests a playback token from /api/v1/lessons/:id/token
3. Backend validates: student is authenticated, enrolled, and lesson is accessible
4. Backend generates a signed URL with a 15-minute expiry pointing to the HLS manifest on VPS
5. Frontend initializes the HLS.js player with the signed URL
6. Player loads the .m3u8 manifest and begins streaming
7. Every 10 minutes, frontend silently refreshes the playback token
8. Playback position is reported to the backend every 30 seconds

**Alternate Flow — Token Expired Mid-Playback:**
- Frontend detects 403 on segment request — silently requests a new token — playback resumes without user interruption

**Alternate Flow — Student Not Enrolled:**
- Backend returns 403 — frontend redirects to the course purchase page

**Acceptance Criteria:**
- [ ] Video is never served as a direct MP4 link under any circumstance
- [ ] Signed URLs expire within 15 minutes and cannot be reused after expiry
- [ ] Playback token is scoped to the requesting student's session
- [ ] HLS.js player loads and plays on Chrome 100+, Safari 15+, and Firefox 100+
- [ ] Token refresh occurs silently without interrupting playback
- [ ] Right-click context menu on the video element is disabled
- [ ] Video download options in the browser are suppressed via player configuration

---

## P0-F016 — UI Component System Setup

**Description:** The frontend component system is established using shadcn/ui as the base component library, Headless UI for unstyled accessible primitives, and Floating UI for smart positioning. All components are customized to match the EduFlow brand tokens.

**User Story:** As the frontend developer, I want a consistent, accessible, and fully brand-aligned component system so that every page and dashboard is built from the same foundation without rebuilding basic interactions from scratch.

**Trigger:** Project initialization in Phase 1.

**Pre-conditions:** React 18 + TypeScript + Tailwind CSS project is scaffolded. Brand design tokens are defined.

**Post-conditions:** All three libraries are installed, configured, and validated with the brand token system. A component showcase page exists in the dev environment for reference.

**Main Flow:**
1. Install shadcn/ui CLI and initialize with the project's Tailwind config
2. Apply brand tokens to shadcn/ui CSS variables: primary red (#EB2027 scale), neutral surfaces, semantic colors
3. Install Headless UI and Floating UI via npm
4. Create a /components/ui folder structure:
   - /shadcn — all installed shadcn components (restyled)
   - /headless — custom components built on Headless UI primitives
   - /floating — tooltip, popover, and positioning wrappers
   - /custom — platform-specific components (VideoPlayer, LessonSidebar, UploadQueue, etc.)
5. Install and configure i18next RTL context — all components must respect dir attribute
6. Configure dark/light mode CSS variables in the Tailwind config
7. Build a /dev/showcase route showing all components in both EN/AR and dark/light states

**Acceptance Criteria:**
- [ ] shadcn/ui components are restyled with brand tokens — no default shadcn blue/gray remains
- [ ] All components render correctly in RTL (Arabic) and LTR (English) modes
- [ ] All components render correctly in dark mode and light mode
- [ ] Headless UI components have full keyboard navigation and ARIA attributes
- [ ] Floating UI wrappers position tooltips and popovers correctly on all screen sizes
- [ ] Component showcase page exists and is accessible during development

---

# SECTION 8 — Non-Functional Requirements

## Performance
- Page load time: under 2 seconds on a standard 4G connection
- API response time: under 500ms for all authenticated endpoints under normal load
- Video player first-frame load: under 3 seconds on a 10 Mbps connection
- Report generation: under 3 seconds for datasets up to 10,000 records
- Upload manager: supports files up to 10GB per video without memory overflow

## Security
- All endpoints require HTTPS (TLS 1.3)
- Authentication via JWT with refresh token rotation
- Signed video URLs expire within 15 minutes and are scoped to the requesting user session
- Paymob webhook signature validated via HMAC on every callback
- All user inputs sanitized against XSS, SQLi, and CSRF attacks
- Admin endpoints protected by RBAC
- Sensitive fields (passwords) stored as bcrypt hashes
- AES-256 encryption at rest for sensitive data
- Rate limiting applied to auth endpoints: max 10 attempts per minute per IP
- 2FA enforced for admin accounts

## Availability
- Target uptime: 99.9%
- Automated daily database backups with 30-day retention
- Health check endpoint available at /api/health

## Scalability
- Architecture must support horizontal scaling of the API layer
- Database connection pooling via Prisma
- Redis used for session management and caching

## Accessibility
- WCAG 2.1 AA compliance across all student-facing pages
- Full keyboard navigation support — enforced through Headless UI primitives
- Sufficient color contrast ratios in both light and dark modes
- RTL layout fully compliant for Arabic language mode
- Screen reader compatible labels on all interactive elements — enforced through shadcn/ui and Headless UI ARIA attributes

## Compatibility
- Browsers: Chrome 100+, Safari 15+, Firefox 100+, Edge 100+
- Responsive design: desktop, tablet, and mobile browser
- HLS.js video player tested on all supported browsers
- RTL rendering tested on all supported browsers

## Data & Compliance
- GDPR-compliant data handling for any EU-based users
- Student PII never exposed beyond what is required
- Watermark data derived server-side

## Observability
- Structured JSON logging on all API requests and errors
- Error rate alerting: alert triggered when error rate exceeds 1% over a 5-minute window
- Audit log records all admin actions

---

# SECTION 9 — Technical Architecture

## Frontend Stack

### Core Framework
- React 18 with TypeScript
- Tailwind CSS with custom design tokens (brand red #EB2027 full scale, Inter + Noto Kufi Arabic variable fonts, Material Icons)
- i18next with RTL/LTR context switching and language switcher in the navigation bar
- Dark/light mode via CSS variables with system preference detection and manual override
- React Query for server state management
- Zustand for UI state management (theme, language, sidebar open/close, upload queue)

### UI Component System — Three-Layer Architecture

#### Layer 1 — shadcn/ui (Base Components)
shadcn/ui is the primary component foundation. It provides open-source, accessible, restyled components that are copied into the codebase and fully customizable. All shadcn components are restyled using the EduFlow brand token system — no default shadcn colors remain.

**Used in the Admin Dashboard:**
| Component | Usage Location |
|---|---|
| Table | Student list, payment records, coupon list, audit log |
| Dialog | Confirm revoke access, confirm delete lesson, add coupon modal |
| Sheet (Drawer) | Add/edit lesson panel, student detail panel, upload queue panel |
| Tabs | Admin dashboard sections (Content / Students / Payments / Reports) |
| Form + Input + Label | All admin forms: add lesson, edit pricing, create coupon |
| Select | Lesson state selector (Draft / Published / Scheduled), filter dropdowns |
| Switch | Toggle lesson visibility, toggle coupon active state |
| Badge | Enrollment status (Active / Revoked), payment status (Paid / Failed / Pending) |
| Toast (Sonner) | All admin action feedback: saved, uploaded, revoked, enrolled |
| Progress | Upload progress bar in the resumable upload manager |
| Skeleton | Loading states on all data tables and report cards |
| Card | KPI summary cards in reports dashboard |
| Avatar | Student avatar in the student list and profile settings |
| Separator | Section dividers in the lesson editor |
| Accordion | Course section collapse/expand in the lesson manager |

**Used in the Student Dashboard:**
| Component | Usage Location |
|---|---|
| Progress | Course completion percentage bar, lesson progress ring |
| Tabs | Lesson page tabs (Video / Description / Attachments / Q&A) |
| Toast (Sonner) | Lesson marked complete, profile saved, comment posted |
| Skeleton | Loading state for lesson list and video player area |
| Card | Course overview card, achievement card |
| Avatar | Profile page and nav profile menu |
| Badge | Lesson state indicator (Completed / In Progress / Locked) |
| Dialog | Profile edit modal, confirm account actions |
| Input + Form | Profile settings form (username, password, avatar) |
| Accordion | Course curriculum section expand/collapse |

**Used in Public Pages:**
| Component | Usage Location |
|---|---|
| Card | Course feature cards on the landing page |
| Badge | Course tags and category labels |
| Separator | Section dividers on the course landing page |
| Skeleton | Loading state for the course landing page before content is fetched |

#### Layer 2 — Headless UI (Unstyled Accessible Primitives)
Headless UI provides fully unstyled, fully accessible components where EduFlow needs complete visual control beyond what shadcn/ui's theming supports. Every Headless UI component is styled entirely with Tailwind classes using brand tokens.

| Component | Usage Location | Why Headless UI Instead of shadcn |
|---|---|---|
| Menu (Listbox) | Language switcher in the navigation bar | Needs custom RTL-aware dropdown with flag icons and animated transition |
| Combobox | Student search in admin — live search with filtered dropdown | Needs custom async search behavior with full styling control |
| Dialog | Mobile navigation drawer (full-screen overlay on small screens) | Needs custom slide-in animation and RTL mirroring |
| Disclosure | Course FAQ section on the landing page | Needs custom animated expand with brand styling |
| Switch | Theme toggle (dark/light) in the nav bar | Needs custom animated pill design matching brand |
| Listbox | Lesson section reorder dropdown in the admin | Needs custom sorted option list with drag handle integration |
| Tab | Lesson editor panel tabs in the admin (Details / Video / Attachments) | Needs tighter visual control on active tab indicator |
| Transition | All overlay and panel entrance/exit animations | Used as a wrapper around shadcn components for consistent animation behavior |

#### Layer 3 — Floating UI (Positioning Engine)
Floating UI is not a visual component library — it is a low-level positioning engine that ensures tooltips, popovers, dropdowns, and context menus always appear in the correct position relative to their trigger, accounting for screen edges, scroll position, and RTL direction.

| Component | Usage Location |
|---|---|
| Tooltip | Admin action buttons (Edit, Delete, Revoke, Enroll) — icon-only buttons need tooltips |
| Tooltip | Video player controls (Play, Volume, Fullscreen, Speed) |
| Tooltip | Upload manager file actions (Pause, Resume, Cancel) |
| Popover | Coupon info popover on the checkout page (shows discount details) |
| Popover | Lesson drip schedule picker in the admin lesson editor |
| Popover | Student tag assignment popover in the student list |
| Dropdown Menu | Profile menu in the nav bar (accessible on both LTR and RTL) |
| Dropdown Menu | Admin row actions menu (three-dot menu per student, per lesson, per order) |
| Floating Input | Watermark position calculation utility (internal use in the video player component) |

### UI Inspiration Sources (Reference Only — Not Installed as Libraries)
The following sites are used as visual layout references during design and development. No code is copied from them. They inform section composition, spacing logic, and content hierarchy only.

| Source | Used For |
|---|---|
| LandingFolio | Hero section, testimonials block, stats row, instructor section layout ideas |
| TailwindFlex | Pricing section, CTA strip, feature grid layout references |
| Tailblocks | FAQ layout, footer structure, general section rhythm |
| MambaUI | Card styles, blog/content section layout inspiration |
| almentor.net | Overall platform feel, RTL navigation pattern, Arabic course card structure |

### Optional Acceleration Layer (Flowbite — Selected Sections Only)
Flowbite components may be used as a starting reference for the following sections only. All Flowbite markup is fully restyled with EduFlow brand tokens before use — no Flowbite CSS classes or colors remain in production.

| Flowbite Component | Used For | Customization Required |
|---|---|---|
| Navbar structure | Public site navigation starting point | Full rebrand: colors, fonts, RTL, brand logo |
| Data table | Admin student list and payment records starting point | Full rebrand: colors, density, action columns |
| Form elements | Admin forms for rapid scaffolding | Full rebrand: input borders, focus rings, label styles |
| Sidebar | Admin dashboard sidebar starting point | Full rebrand: active states, icon treatment, RTL flip |

### Video Player
- HLS.js with a custom React wrapper component
- Custom watermark overlay: a positioned div rendered on top of the video element, not embedded in the video stream
- Watermark content: student display name + partially masked email
- Watermark position: randomized every 30–60 seconds using a Zustand-managed timer
- Right-click suppressed on the video element via onContextMenu handler
- Controls: play/pause, volume, seek bar, speed (0.75x, 1x, 1.25x, 1.5x, 2x), fullscreen
- Floating UI used for tooltip labels on all icon-only control buttons

### Layout Architecture
- **Public pages** (course landing, FAQ, static pages): top navigation + full-width content sections — inspired by almentor's editorial layout
- **Student learning interface**: persistent sidebar (lesson list + progress) + main content area (video + tabs)
- **Admin dashboard**: collapsible sidebar + full-width content area with section tabs
- CSS logical properties used throughout for RTL/LTR compatibility — no hardcoded `left` or `right` values in layout code

---

## Backend Stack
- Runtime: Node.js with Express and TypeScript
- ORM: Prisma with typed schema
- API Style: REST, versioned at /api/v1/
- Authentication: JWT (access token 15 min) + refresh token rotation (7 days), stored in httpOnly cookies
- Upload Protocol: tus-node-server for resumable chunked uploads
- Video Processing: FFmpeg for HLS transcoding and .m3u8 manifest generation on VPS
- Email: Nodemailer with SMTP provider
- Queue: Bull (Redis-backed) for async jobs: email sending, webhook processing, report generation

## Database Architecture
- Primary DB: PostgreSQL via Prisma
- Cache / Session: Redis
- Key entities: User, Enrollment, Course, Section, Lesson, Attachment, Order, Payment, Coupon, CouponUsage, Progress, WatchPosition, Comment, Notification, AuditLog, Tag, StudentTag, ConversionEvent

## Auth & Authorization Design
- Public routes: course landing page, FAQ, static pages, registration, login
- Student routes: require valid JWT + enrollment verification per lesson access
- Admin routes: require valid JWT + admin role claim
- Video token route: validates JWT + enrollment + lesson accessibility before issuing signed URL
- RBAC roles: student, admin

## Infrastructure & Deployment
- VPS: Ubuntu 24 LTS — hosts the Node.js API, PostgreSQL, Redis, and video storage
- Video storage: local VPS filesystem served via NGINX with signed URL validation middleware
- NGINX: reverse proxy for API and static assets, handles HTTPS termination
- CI/CD: GitHub Actions — lint, test, build, deploy on merge to main
- SSL: Let's Encrypt via Certbot
- Monitoring: structured logs + external uptime ping

## External Integrations
- Paymob: payment initiation, hosted payment page, webhook for payment confirmation
- Google OAuth 2.0: student registration and login
- SMTP provider: transactional email delivery

---

# SECTION 10 — Implementation Phases

---

## Phase 1 — Foundation (Weeks 1–2)

**Goal:** Establish the full project scaffold, UI component system, authentication, bilingual UI system, and admin upload infrastructure.

**Duration:** 2 weeks

### Tasks
- [ ] Initialize monorepo: React frontend + Node.js backend + Prisma schema
- [ ] Configure Tailwind CSS with brand design tokens (#EB2027 red scale, Inter + Noto Kufi Arabic fonts)
- [ ] Install and configure shadcn/ui CLI — apply brand tokens to all CSS variables
- [ ] Install Headless UI and Floating UI via npm
- [ ] Create /components/ui folder structure: /shadcn, /headless, /floating, /custom
- [ ] Build component showcase route (/dev/showcase) — all components in EN/AR and dark/light states
- [ ] Implement i18next with EN/AR language switcher (Headless UI Menu) and RTL/LTR layout toggle
- [ ] Implement dark/light mode with CSS variables and Headless UI Switch toggle in nav
- [ ] Build navigation bar: language switcher, theme toggle, profile menu (Floating UI dropdown)
- [ ] Install and configure CSS logical properties across all layout components
- [ ] Implement student registration: email/password + Google OAuth
- [ ] Implement email verification flow
- [ ] Implement JWT auth + refresh token rotation
- [ ] Build admin login and session management
- [ ] Implement RBAC middleware: student vs admin
- [ ] Build admin course manager UI using shadcn/ui Accordion, Sheet, Form, Select, Badge
- [ ] Implement drag-and-drop lesson reordering
- [ ] Implement lesson state management: Draft / Published / Scheduled (shadcn/ui Select)
- [ ] Build admin resumable upload manager with tus protocol — shadcn/ui Progress, Sheet, Toast
- [ ] Configure FFmpeg pipeline: receive upload → transcode to HLS → store on VPS
- [ ] Configure NGINX for HTTPS termination and HLS file serving
- [ ] Set up PostgreSQL + Redis on VPS
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Set up structured JSON logging

**Validation:** Admin can log in, create a course with sections and lessons, upload a video that transcodes to HLS, and the auth flow works end-to-end. Component showcase confirms all UI components render correctly in all four states (EN dark, EN light, AR dark, AR light).

---

## Phase 2 — Core Features (Weeks 3–4)

**Goal:** Deliver protected video playback, Paymob payment flow, and manual enrollment.

**Duration:** 2 weeks

### Tasks
- [ ] Implement signed URL generator for HLS manifests (15-minute expiry, user-scoped)
- [ ] Build HLS.js player React wrapper with custom watermark overlay (Zustand-managed position timer)
- [ ] Add Floating UI tooltips to all icon-only video player controls
- [ ] Disable right-click and download options on the video player
- [ ] Build playback token refresh (silent, every 10 minutes)
- [ ] Implement watch position tracking (report every 30 seconds to backend)
- [ ] Implement lesson file attachments — upload, storage, per-lesson display using shadcn/ui Card and Badge
- [ ] Implement lesson accessibility check: enrollment + lesson state + drip schedule
- [ ] Integrate Paymob API: payment intention creation, hosted checkout redirect
- [ ] Implement Paymob webhook receiver: HMAC validation, idempotency, enrollment activation
- [ ] Build checkout page and purchase success page with CTA
- [ ] Build order and payment records table in admin dashboard (shadcn/ui Table, Badge, Skeleton)
- [ ] Implement admin manual enrollment (activate/revoke) with shadcn/ui Dialog confirmation
- [ ] Implement admin student list: search (Headless UI Combobox), filter, activate, revoke
- [ ] Add Floating UI tooltips to all admin icon-only action buttons
- [ ] Implement admin pricing controls: base price, discount percentage, discount date range
- [ ] Set up transactional email: registration, payment confirmation, enrollment activation
- [ ] Implement audit log for all admin actions

**Validation:** A student can register, purchase the course, watch a protected HLS video with watermark, and the admin can manually enroll or revoke a student. All payment records appear in the admin panel with correct status badges.

---

## Phase 3 — Student Experience (Weeks 5–6)

**Goal:** Deliver the complete student learning experience and admin reporting.

**Duration:** 2 weeks

### Tasks
- [ ] Build student onboarding flow with shadcn/ui Progress, Card, and Toast
- [ ] Build course progress tracking: lesson, section, and course level with shadcn/ui Progress
- [ ] Implement continue watching — resume from last recorded playback position
- [ ] Build student dashboard: course overview, progress, last watched lesson, attachments tab (shadcn/ui Tabs)
- [ ] Build lesson page tabs: Video / Description / Attachments / Q&A (shadcn/ui Tabs)
- [ ] Build profile settings page: avatar (shadcn/ui Avatar), username, password (shadcn/ui Form)
- [ ] Implement lesson Q&A / comments using shadcn/ui Card and Form
- [ ] Implement course content search
- [ ] Build notifications system: in-app (shadcn/ui Toast) and email
- [ ] Build admin analytics reports: KPI cards (shadcn/ui Card + Skeleton), charts, CSV export
- [ ] Implement date range filter on all reports (Floating UI Popover for date picker)
- [ ] Build cohort/tag system: admin assigns tags via Floating UI Popover in the student list
- [ ] Build student notes field in admin panel (shadcn/ui Sheet)
- [ ] Build drip content scheduling: admin sets unlock date via Floating UI Popover date picker

**Validation:** A student can complete the full learning journey end-to-end. Admin can view all reports with accurate data. Progress tracking and continue watching work correctly across sessions. All components render correctly in both languages and both theme modes.

---

## Phase 4 — Launch Hardening (Weeks 7–8)

**Goal:** Finalize static pages, apply security hardening, conduct full QA, and prepare for public launch.

**Duration:** 2 weeks

### Tasks
- [ ] Build all static pages: course landing (LandingFolio/TailwindFlex-inspired layout), FAQ (Headless UI Disclosure), privacy policy, refund policy, contact, order status, purchase success
- [ ] Add Floating UI Popover for coupon info on the checkout page
- [ ] Implement coupon system: code generation, shadcn/ui Input + Badge + Dialog
- [ ] Apply rate limiting to all auth and payment endpoints
- [ ] Implement CSRF, XSS, and SQLi protection across all endpoints
- [ ] Enforce 2FA for admin account
- [ ] Conduct full security audit: signed URL leakage test, HMAC bypass test, RBAC boundary test
- [ ] Conduct cross-browser QA: Chrome, Safari, Firefox, Edge — both LTR and RTL
- [ ] Conduct mobile browser QA: responsive layout, video player, navigation
- [ ] Conduct component QA: all shadcn/ui + Headless UI + Floating UI components verified in all four states (EN dark, EN light, AR dark, AR light)
- [ ] Conduct load testing: simulate 200 concurrent students watching video
- [ ] Set up external uptime monitoring and error rate alerting
- [ ] Configure automated daily database backups with 30-day retention
- [ ] Final content review: all EN/AR translations verified
- [ ] Soft launch to a small group of beta students
- [ ] Fix all critical issues from beta feedback
- [ ] Public launch

**Validation:** Platform passes security audit, cross-browser QA, and load test. All components pass a four-state UI audit. Beta students complete the full purchase and learning flow without critical errors.

---

# SECTION 11 — Advanced Execution Details

## User Flow

**Student Purchase & Learning Flow:**
1. Student lands on the course landing page (public, no auth required) — full-width layout inspired by almentor
2. Student clicks "Buy Now" or "Create Account"
3. Student registers via email/password or Google OAuth
4. Student receives and confirms email verification
5. Student is shown the onboarding screen (shadcn/ui Card + Progress) with a "Start Here" CTA
6. Student sees the course is locked — clicks "Purchase Course"
7. Student is redirected to the Paymob hosted payment page
8. Student completes payment — Paymob sends webhook to the platform
9. Platform activates enrollment — student receives confirmation email — shadcn/ui Toast fires in-app
10. Student is redirected to the purchase success page with "Enter Course" CTA
11. Student enters the course dashboard — sidebar (lesson list + progress) + main content area
12. Student clicks the first lesson — video loads in the HLS.js player with watermark overlay
13. Student watches the video — position is saved every 30 seconds
14. Student closes the browser — returns later — player resumes from the last saved position
15. Student completes a lesson — lesson is marked complete (shadcn/ui Badge updates) — overall progress bar advances
16. Student downloads lesson attachments from the Attachments tab (shadcn/ui Tabs)
17. Student posts a question in the Q&A tab

**Admin Content Flow:**
1. Admin logs in to the admin dashboard (sidebar layout)
2. Admin opens the Upload Manager — uploads lesson videos with tus pause/resume (shadcn/ui Progress + Sheet)
3. Admin opens the Course Manager — creates sections (shadcn/ui Accordion) and lessons — assigns uploaded videos
4. Admin sets lesson states via shadcn/ui Select: Draft / Published / Scheduled
5. Admin publishes the course — students can now purchase and access it
6. Admin monitors the reports dashboard — KPI cards, charts, drop-off table — filterable by date range

---

## Edge Cases

| Condition | System Behavior | User Feedback |
|---|---|---|
| Student submits invalid email format on registration | Blocked at client and server | Inline error below input field (shadcn/ui Form error state): "Please enter a valid email address" |
| Student attempts to access a lesson without enrollment | Backend returns 403 | Redirect to course purchase page |
| Paymob webhook arrives with invalid HMAC signature | Webhook rejected — order not updated | No student impact — admin sees failed webhook in audit log |
| Paymob webhook arrives twice for the same order | Second webhook ignored via idempotency check | No duplicate enrollment created |
| Video segment request returns 403 (signed URL expired) | Frontend silently requests new token | Playback resumes without interruption — no UI shown |
| Student attempts to open the HLS manifest URL directly in a new browser tab | NGINX middleware validates signed URL — returns 403 | Browser receives 403 — no video content exposed |
| Admin uploads a file and the network drops mid-upload | tus protocol saves the last chunk offset — upload pauses automatically | Upload manager shows "Interrupted — tap to resume" (shadcn/ui Badge state change) |
| Checksum mismatch after upload completes | File flagged as corrupted | shadcn/ui Toast error: "Upload verification failed. Please upload the file again." |
| Student switches language mid-session | Interface re-renders in selected language and direction — preference persisted | Smooth transition — no page reload — Floating UI repositions all open popovers |
| Headless UI dropdown does not fit below trigger on small screens | Floating UI auto-adjusts placement to above or side | Dropdown appears in the correct visible position automatically |
| Admin applies a discount that makes the price zero | System blocks zero-price Paymob transactions | shadcn/ui Form validation error: "Price cannot be reduced to zero via discount. Use manual enrollment instead." |

---

## API Design (High Level)

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/auth/register | Register new student |
| POST | /api/v1/auth/login | Login — returns JWT + refresh token |
| POST | /api/v1/auth/google | Google OAuth callback |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Invalidate session |
| GET | /api/v1/auth/verify-email | Verify email with signed token |

### Course & Lessons
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/course | Get course details (public) |
| GET | /api/v1/course/sections | Get all sections and lessons (enrolled only) |
| GET | /api/v1/lessons/:id | Get lesson details and attachments |
| GET | /api/v1/lessons/:id/token | Issue signed HLS playback token (enrolled only) |
| POST | /api/v1/lessons/:id/progress | Update lesson watch position and completion |
| GET | /api/v1/lessons/:id/comments | Get Q&A comments |
| POST | /api/v1/lessons/:id/comments | Post a Q&A comment |

### Payments & Enrollment
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/payments/initiate | Create Paymob payment intention |
| POST | /api/v1/payments/webhook | Receive and process Paymob webhook |
| GET | /api/v1/enrollments/me | Get current student's enrollment status |

### Admin — Content
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/admin/sections | Create a new section |
| PUT | /api/v1/admin/sections/:id | Update section |
| DELETE | /api/v1/admin/sections/:id | Delete a section |
| POST | /api/v1/admin/lessons | Create a new lesson |
| PUT | /api/v1/admin/lessons/:id | Update lesson details, state, or drip schedule |
| DELETE | /api/v1/admin/lessons/:id | Delete a lesson |
| POST | /api/v1/admin/lessons/:id/attachments | Upload file attachment |
| DELETE | /api/v1/admin/attachments/:id | Remove a file attachment |

### Admin — Students & Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/admin/students | List all students with filters |
| POST | /api/v1/admin/students/:id/enroll | Manually enroll a student |
| POST | /api/v1/admin/students/:id/revoke | Revoke course access |
| PUT | /api/v1/admin/students/:id/tags | Assign or update cohort tags |
| GET | /api/v1/admin/orders | List all orders and payment records |
| POST | /api/v1/admin/coupons | Create a new coupon code |
| PUT | /api/v1/admin/course/pricing | Update course base price and discount |

### Admin — Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/admin/reports/sales | Revenue and enrollment metrics by date range |
| GET | /api/v1/admin/reports/lessons | Watch time and drop-off rate per lesson |
| GET | /api/v1/admin/reports/retention | Student course completion percentiles |
| GET | /api/v1/admin/reports/funnel | Conversion funnel metrics |

### Upload
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/admin/uploads | Initiate a new tus upload session |
| PATCH | /api/v1/admin/uploads/:id | Upload a chunk |
| HEAD | /api/v1/admin/uploads/:id | Get upload offset for resume |
| DELETE | /api/v1/admin/uploads/:id | Cancel and delete an upload |

---

## Data Model

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | String | Unique, required |
| passwordHash | String | Nullable (OAuth-only accounts) |
| displayName | String | Required |
| username | String | Unique, changeable |
| avatarUrl | String | Nullable |
| role | Enum | student / admin |
| emailVerified | Boolean | Default false |
| language | Enum | en / ar |
| theme | Enum | light / dark |
| createdAt | Timestamp | Auto |

### Enrollment
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| courseId | UUID | FK → Course |
| status | Enum | active / revoked |
| enrolledAt | Timestamp | Auto |
| enrollmentSource | Enum | purchase / manual / coupon |
| activatedBy | UUID | Nullable — admin ID for manual enrollments |

### Course
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | String | English title |
| titleAr | String | Arabic title |
| description | Text | Rich text English |
| descriptionAr | Text | Rich text Arabic |
| basePrice | Decimal | In EGP |
| discountPercent | Integer | 0–100 |
| discountStart | Timestamp | Nullable |
| discountEnd | Timestamp | Nullable |
| isPublished | Boolean | Default false |

### Section
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| courseId | UUID | FK → Course |
| title | String | English |
| titleAr | String | Arabic |
| order | Integer | For ordering |

### Lesson
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sectionId | UUID | FK → Section |
| title | String | English |
| titleAr | String | Arabic |
| description | Text | Rich text English |
| descriptionAr | Text | Rich text Arabic |
| videoPath | String | HLS manifest path on VPS |
| durationSeconds | Integer | Nullable |
| state | Enum | draft / published / scheduled |
| scheduledAt | Timestamp | Nullable |
| order | Integer | For ordering |

### Attachment
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| lessonId | UUID | FK → Lesson |
| fileName | String | Original file name |
| filePath | String | Server storage path |
| fileSize | Integer | In bytes |
| mimeType | String | File MIME type |

### Order
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| courseId | UUID | FK → Course |
| amount | Decimal | Final charged amount in EGP |
| originalAmount | Decimal | Pre-discount amount |
| couponId | UUID | Nullable FK → Coupon |
| status | Enum | pending / paid / failed / refunded |
| paymobOrderId | String | Paymob reference |
| paymobTransactionId | String | Nullable |
| createdAt | Timestamp | Auto |
| confirmedAt | Timestamp | Nullable |

### Progress
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| lessonId | UUID | FK → Lesson |
| watchPositionSeconds | Integer | Last recorded position |
| isCompleted | Boolean | Default false |
| completedAt | Timestamp | Nullable |
| updatedAt | Timestamp | Auto |

### Coupon
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| code | String | Unique |
| discountType | Enum | percentage / fixed |
| discountValue | Decimal | Amount or percent |
| maxUses | Integer | Nullable |
| usedCount | Integer | Default 0 |
| expiresAt | Timestamp | Nullable |
| isActive | Boolean | Default true |

### AuditLog
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| actorId | UUID | FK → User (admin) |
| action | String | e.g., "lesson.published", "student.revoked" |
| targetType | String | e.g., "lesson", "student" |
| targetId | UUID | ID of the affected entity |
| metadata | JSON | Additional context |
| createdAt | Timestamp | Auto |

---

## UX Rules

- All forms validate inline on blur using shadcn/ui Form error states — errors appear below the relevant field without full-page reload
- Loading states are shown on all async actions: shadcn/ui Skeleton on data tables and cards, spinner on submit buttons, shadcn/ui Progress on uploads
- Success feedback is shown after every save, upload, enrollment, or payment action — shadcn/ui Toast (Sonner) with 3-second auto-dismiss
- Error states display a human-readable message via shadcn/ui Toast (destructive variant) — never a raw error code or stack trace
- Video player shows a loading spinner (HLS.js buffering state) until the first segment is buffered
- Drip-locked lessons are visible in the lesson list via shadcn/ui Badge ("Locked") with unlock date shown in a Floating UI Tooltip
- Language switch is instant via i18next — no page reload — Headless UI Transition handles layout direction flip animation
- Dark mode applies to all surfaces via CSS variables — shadcn/ui components, Headless UI components, and Floating UI components all inherit from the same token system
- All destructive actions (revoke access, delete lesson, remove attachment) require a shadcn/ui Dialog confirmation before execution
- Empty states display a helpful illustration and action CTA — never a blank white area
- All icon-only buttons in the admin dashboard have Floating UI Tooltip labels for clarity
- Floating UI automatically repositions all open popovers and tooltips when the language switches from LTR to RTL or vice versa

---

# SECTION 12 — Success Metrics and KPIs

## Business Metrics
| Metric | Target | Measurement Method | Owner |
|---|---|---|---|
| Course revenue — Month 1 | ≥ EGP 10,000 | Paymob transaction records | Yousef |
| Total enrollments — Month 1 | ≥ 50 students | Enrollment table count | Yousef |
| Average order value | ≥ EGP 200 | Total revenue ÷ total orders | Admin reports |
| Payment success rate | ≥ 90% | Paid orders ÷ total initiated orders | Admin reports |

## Product Metrics
| Metric | Target | Measurement Method | Owner |
|---|---|---|---|
| Course completion rate | ≥ 40% | Students with 100% progress ÷ total enrolled | Admin reports |
| Lesson average watch time | ≥ 70% of video duration | Progress tracking records | Admin reports |
| Onboarding completion rate | ≥ 80% | Students who complete onboarding flow ÷ registered | Analytics |
| Continue watching usage | ≥ 60% of returning sessions | Sessions resuming from saved position ÷ total return sessions | Analytics |

## Technical Metrics
| Metric | Target | Measurement Method | Owner |
|---|---|---|---|
| API response time | < 500ms (p95) | Server-side request logging | Backend Dev |
| Page load time | < 2 seconds (4G) | Lighthouse / synthetic monitoring | Frontend Dev |
| Platform uptime | ≥ 99.9% | External uptime monitor | Backend Dev |
| Error rate | < 0.1% of all requests | Structured error logs | Backend Dev |
| Video first-frame load | < 3 seconds | Player event tracking | Frontend Dev |

## User Satisfaction Metrics
| Metric | Target | Measurement Method | Owner |
|---|---|---|---|
| Student support tickets per 100 enrollments | < 5 | Support inbox count | Yousef |
| Refund request rate | < 3% | Refund orders ÷ total orders | Admin reports |

## Tracking & Review Schedule
- Tracking tool: PostHog (product analytics) + structured server logs
- Review frequency: weekly during launch month, monthly thereafter
- Post-launch reviews: Day 7, Day 14, Day 30, Month 3

---

# SECTION 13 — Timeline and Milestones

- **Start Date:** 2026-04-12
- **Target Launch Date:** 2026-06-07
- **Total Duration:** 8 weeks

| Milestone | Description | Due Date | Status | Owner |
|---|---|---|---|---|
| Kickoff | Project starts — repo initialized, VPS provisioned, design tokens confirmed, shadcn/ui initialized | 2026-04-12 | TODO | Yousef + Dev Team |
| PRD Approved | This PRD v1.1 reviewed and signed off | 2026-04-14 | TODO | Yousef |
| Phase 1 Complete | Auth, bilingual UI, component system, admin upload, course manager, HLS pipeline operational | 2026-04-26 | TODO | Dev Team |
| Phase 2 Complete | Protected video playback, Paymob integration, manual enrollment, payment records | 2026-05-10 | TODO | Dev Team |
| Phase 3 Complete | Student learning experience, progress tracking, reports, onboarding, notifications | 2026-05-24 | TODO | Dev Team |
| Phase 4 Complete | Static pages, coupon system, security hardening, QA, load testing | 2026-06-05 | TODO | Dev Team |
| Beta Launch | Soft launch to a limited group — collect feedback and fix critical issues | 2026-06-05 | TODO | Yousef |
| Public Launch | Platform open to all students — Paymob live — marketing campaigns activated | 2026-06-07 | TODO | Yousef |

---

# SECTION 14 — Risk Register

| ID | Description | Likelihood | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R001 | Paymob API integration delays or breaking changes | Medium (2) | High (3) | 6 | Begin Paymob integration in Phase 2 week 1 — use Paymob sandbox throughout development | Backend Dev |
| R002 | VPS performance insufficient under concurrent video streaming load | Medium (2) | High (3) | 6 | Conduct load test in Phase 4 with 200 concurrent simulated students — upgrade VPS if needed | Backend Dev |
| R003 | Video content piracy through screen recording | High (3) | Medium (2) | 6 | Dynamic watermark makes leaked recordings traceable — combined with HLS tokenization | Yousef + Dev |
| R004 | Scope creep adding features beyond v1 MoSCoW | High (3) | Medium (2) | 6 | Enforce MoSCoW strictly — all new requests go to v2 backlog | Yousef |
| R005 | tus upload protocol incompatibility with VPS configuration | Low (1) | High (3) | 3 | Spike tus-node-server integration in Phase 1 week 1 — validate with a 1GB test file | Backend Dev |
| R006 | RTL rendering bugs across supported browsers | Medium (2) | Medium (2) | 4 | Dedicated RTL QA pass in Phase 4 — all shadcn/ui and Headless UI components verified in Arabic mode | Frontend Dev + QA |
| R007 | shadcn/ui or Headless UI component behavior inconsistency in RTL | Low (1) | Medium (2) | 2 | Use CSS logical properties throughout — test all components in the /dev/showcase route in AR mode from Phase 1 | Frontend Dev |
| R008 | Floating UI positioning breaks on mobile viewports in RTL | Low (1) | Medium (2) | 2 | Test all Floating UI placements on mobile in both LTR and RTL during Phase 4 QA | Frontend Dev + QA |
| R009 | SMTP email delivery failures causing missed enrollment activations | Low (1) | High (3) | 3 | Use a reliable SMTP provider — implement Bull queue retry — admin manual enrollment as fallback | Backend Dev |
| R010 | Key person dependency — sole developer blocking progress | Medium (2) | High (3) | 6 | Document all infrastructure credentials, deployment steps, and architecture decisions in the repo wiki | Dev Team |

---

# SECTION 15 — Stakeholders and Approvals

## Stakeholders

| Name | Role | Involvement | Contact |
|---|---|---|---|
| Yousef | Owner / PM / Admin | Decision maker, content supplier, final approver | [TBD] |
| Frontend Dev | Frontend Engineer | Builds all UI using shadcn/ui + Headless UI + Floating UI, video player, i18n | [TBD] |
| Backend Dev | Backend Engineer | Builds API, auth, payments, video pipeline, reports | [TBD] |
| Designer | UI/UX Designer | Delivers component library, page designs, RTL layouts, brand token system | [TBD] |
| QA | Quality Assurance | Cross-browser testing, security testing, load testing, RTL validation, component four-state audit | [TBD] |

## Approval Gates

| Gate | Approver | Required By | Status |
|---|---|---|---|
| PRD v1.1 Approval | Yousef | 2026-04-14 | Pending |
| Component System Sign-off | Yousef + Frontend Dev | 2026-04-26 | Pending |
| Phase 1 Sign-off | Yousef + Backend Dev | 2026-04-26 | Pending |
| Phase 2 Sign-off | Yousef + Backend Dev | 2026-05-10 | Pending |
| Phase 3 Sign-off | Yousef | 2026-05-24 | Pending |
| Security Audit Pass | Yousef + Backend Dev | 2026-06-05 | Pending |
| UI Four-State Audit Pass | Yousef + Frontend Dev + QA | 2026-06-05 | Pending |
| Beta Launch Approval | Yousef | 2026-06-05 | Pending |
| Public Launch Approval | Yousef | 2026-06-07 | Pending |

---

# SECTION 16 — References and Links

| Resource | Link |
|---|---|
| Design Files | [TBD] |
| Repository | [TBD] |
| API Documentation | [TBD] |
| Architecture Diagram | [TBD] |
| Staging Environment | [TBD] |
| Production Environment | [TBD] |
| CI/CD Pipeline | [TBD] |
| Monitoring Dashboard | [TBD] |
| shadcn/ui Documentation | https://ui.shadcn.com |
| Headless UI Documentation | https://headlessui.com |
| Floating UI Documentation | https://floating-ui.com |
| Flowbite Reference | https://flowbite.com (inspiration only) |
| LandingFolio Reference | https://landingfolio.com (inspiration only) |
| TailwindFlex Reference | https://tailwindflex.com (inspiration only) |
| Tailblocks Reference | https://tailblocks.cc (inspiration only) |
| Paymob API Docs | https://developers.paymob.com |
| tus Protocol Docs | https://tus.io |
| HLS.js Docs | https://github.com/video-dev/hls.js |
| i18next Docs | https://www.i18next.com |
| Related PRDs | None — v1.1 is the current version |
| Slack / Communication Channel | [TBD] |
| Meeting Notes | [TBD] |

---

# SECTION 17 — Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| v1.0 | 2026-04-12 | Yousef | Initial PRD created |
| v1.1 | 2026-04-12 | Yousef | Added full frontend UI component system: shadcn/ui, Headless UI, Floating UI — detailed usage mapping per component per page — updated tech stack, phases, risks, and UX rules |

---