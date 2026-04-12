# Feature Specification: EduFlow — Student Course Platform

**Feature Branch**: `001-student-course-platform`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Build a private single-course LMS platform called EduFlow where students register via email or Google OAuth, purchase a course through Paymob, and watch protected HLS video lessons with a dynamic watermark showing their name and partially masked email. [Full UI layer and admin dashboard details provided]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Registration (Priority: P1)

A student discovers EduFlow and creates an account to access the course. They can register either by providing their email and password or by using their Google account. After successful registration, they receive confirmation and can proceed to purchase the course.

**Why this priority**: Foundational feature — no other user can progress without an account. This is the first impression of the platform.

**Independent Test**: Can be tested in isolation by verifying account creation, email validation, Google OAuth flow, and login with new credentials.

**Acceptance Scenarios**:

1. **Given** student is on the registration page, **When** they enter email, password, and confirm password, **Then** account is created and they receive a confirmation email with a login link.
2. **Given** student is on the registration page, **When** they click "Sign up with Google", **Then** they are redirected to Google OAuth, and upon completion a new EduFlow account is created with their Google profile data (name, email).
3. **Given** student attempts to register with an email already in the system, **When** they submit the form, **Then** an inline error is displayed: "This email is already registered."
4. **Given** student enters a weak password (less than 8 characters), **When** they submit the form, **Then** inline validation shows an error before submission.

---

### User Story 2 - Paymob Course Purchase (Priority: P2)

A registered student navigates to the checkout page, reviews the course price, applies a coupon if available, and completes payment through Paymob. Upon successful payment, they are automatically enrolled in the course and can immediately access the course content.

**Why this priority**: Revenue-generating flow. Payment success directly enables student access to the course. Webhook enrollment activation is critical for the business model.

**Independent Test**: Can be tested by simulating Paymob payment flow, webhook receipt, and verifying that the student gains course enrollment only after a valid, HMAC-verified webhook is received.

**Acceptance Scenarios**:

1. **Given** student is on the checkout page, **When** they review the course price and click "Pay Now", **Then** they are redirected to Paymob's payment gateway with the correct amount and student email pre-filled.
2. **Given** student completes payment on Paymob, **When** Paymob sends a webhook to EduFlow with HMAC signature, **Then** the HMAC is validated and the student is enrolled with status "PAID".
3. **Given** student applies a valid coupon on checkout, **When** they submit, **Then** the discount is applied, total price updated, and reflected in the Paymob transaction.
4. **Given** Paymob sends a webhook with invalid or missing HMAC signature, **When** the system processes it, **Then** the webhook is rejected and student is NOT enrolled.
5. **Given** student's payment fails on Paymob, **When** they are redirected back to checkout, **Then** an error message is displayed and their account is not charged.

---

### User Story 3 - Protected Video Playback with Watermark (Priority: P3)

A student accesses a lesson and plays an HLS video. The video player displays their name and partially masked email as a watermark overlay. The video content is protected with a signed, time-limited URL that expires after the session ends. If a student tries to reuse the URL or access the video after their session, the request is denied.

**Why this priority**: Core content delivery feature. Video protection prevents unauthorized redistribution of premium content and ensures accountability (watermark traceability).

**Independent Test**: Can be tested by verifying signed URL generation with correct expiry, token validation on segment requests, watermark rendering with student data, and rejection of expired/reused tokens.

**Acceptance Scenarios**:

1. **Given** student is enrolled and logged in, **When** they click play on a lesson video, **Then** the system generates a signed HLS token, video plays, and a watermark overlay displays the student's name and masked email (e.g., "j***@example.com").
2. **Given** student's session token expires, **When** they attempt to request the next video segment, **Then** the request is rejected with an unauthorized response.
3. **Given** student shares the HLS video URL with another person, **When** that person attempts to access the URL outside the student's session, **Then** the request is denied (expired token).
4. **Given** student pauses and resumes video playback, **When** they resume, **Then** playback continues seamlessly with the watermark still present.
5. **Given** student views the video in dark mode, **When** the watermark is rendered, **Then** the watermark is visible and readable (contrast is maintained).

---

### User Story 4 - Admin Video Upload with Resumable Chunks (Priority: P4)

The admin (Yousef) uploads a video file to the platform using the tus protocol, which supports pause, resume, and progress tracking. The admin can monitor upload progress via a progress bar in a Sheet panel and is notified upon completion.

**Why this priority**: Admin-only content management feature. Resumable uploads support large video files and network interruptions without requiring a full re-upload.

**Independent Test**: Can be tested by uploading a file, pausing mid-upload, resuming, and verifying chunk integrity and completion status.

**Acceptance Scenarios**:

1. **Given** admin clicks "Upload Video" on the admin dashboard, **When** a Sheet panel opens with a file input, **Then** admin can select a video file and upload begins using tus protocol.
2. **Given** a video upload is in progress, **When** the upload speed is shown in a shadcn/ui Progress bar, **Then** the percentage and upload speed (MB/s) are updated in real-time.
3. **Given** admin pauses the upload mid-way, **When** they close the browser or the connection drops, **Then** upon resuming, the upload resumes from the last completed chunk, not from the beginning.
4. **Given** upload completes successfully, **When** the system processes the video, **Then** admin receives a toast notification: "Video uploaded successfully. Processing..." and the video appears in the lesson editor with status "PROCESSING".
5. **Given** admin cancels an upload, **When** they confirm cancellation in a Dialog, **Then** partial chunks are cleaned up and the upload is terminated.

---

### User Story 5 - Admin Student Management (Enroll/Revoke) (Priority: P5)

The admin can view a list of all students, search for a specific student by name or email using a live combobox, manually enroll a student in the course, or revoke their access. All destructive actions (revoke) require confirmation.

**Why this priority**: Admin operational feature. Enables manual enrollment outside the Paymob flow (e.g., free access, corporate accounts) and access control.

**Independent Test**: Can be tested by enrolling and revoking students and verifying their course access is granted/revoked accordingly.

**Acceptance Scenarios**:

1. **Given** admin is on the student management page, **When** they type a student name or email in the Headless UI combobox, **Then** matching students appear in a dropdown list in real-time.
2. **Given** admin clicks "Enroll" on a non-enrolled student, **When** they confirm in a Dialog, **Then** the student gains "ADMIN_ENROLLED" status and can access the course immediately.
3. **Given** admin clicks "Revoke Access" on an enrolled student, **When** they confirm revocation in a Dialog, **Then** the student loses access, their enrollment status becomes "REVOKED", and any active sessions are invalidated.
4. **Given** admin views the student table, **When** the page loads, **Then** a shadcn/ui Table displays student name, email, enrollment status (Badge), and action buttons (Enroll/Revoke/View Details).
5. **Given** admin revokes a student's access, **When** that student tries to access the course, **Then** they see an error message: "Your access to this course has been revoked. Contact support."

---

### User Story 6 - Admin Pricing & Coupon Management (Priority: P6)

The admin controls the course price, manages discount coupons (create, edit, delete), sets coupon expiry dates, and views coupon usage statistics. All coupon creation and modification is gated by confirmation dialogs.

**Why this priority**: Business operations feature. Direct control over revenue and promotional campaigns.

**Independent Test**: Can be tested by creating coupons, applying them to purchases, and verifying discount calculations.

**Acceptance Scenarios**:

1. **Given** admin is on the pricing page, **When** they enter a new course price and click "Update", **Then** the price is updated and future purchases reflect the new price. Existing paid enrollments are not affected.
2. **Given** admin clicks "Create Coupon", **When** a Dialog opens with fields for code, discount percentage, expiry date, and max uses, **Then** upon confirmation the coupon is created and becomes usable immediately.
3. **Given** admin sets a coupon expiry date, **When** that date passes, **Then** the coupon cannot be applied to new checkouts and displays as "EXPIRED" in the coupon list.
4. **Given** admin views coupon usage statistics, **When** they click on a coupon, **Then** a details popovers shows the coupon code, discount amount, remaining uses, total applications, and revenue generated.
5. **Given** admin clicks "Delete Coupon", **When** they confirm in a Dialog, **Then** the coupon is removed and cannot be applied to new purchases.

---

### User Story 7 - Admin Analytics & Reporting (Priority: P7)

The admin views dashboard KPIs including total revenue, number of enrolled students, course completion rate, and video watch time. Analytics are displayed as Card components with key metrics and are updated daily.

**Why this priority**: Business intelligence feature. Enables data-driven decisions about course performance and student engagement.

**Independent Test**: Can be tested by verifying KPI calculations and ensuring data is persisted and updated correctly.

**Acceptance Scenarios**:

1. **Given** admin is on the analytics dashboard, **When** the page loads, **Then** Card components display KPIs: total revenue (sum of Paymob payments), total enrolled students (count), course completion percentage (lessons completed / total lessons), and average video watch time.
2. **Given** a new payment is processed, **When** the analytics dashboard is viewed, **Then** the revenue KPI updates to include the new payment (can be within 1 minute).
3. **Given** admin views the dashboard in dark mode, **When** all Card components, charts, and text are rendered, **Then** the color scheme matches the dark theme and all content is readable.

---

### Edge Cases

- What happens if a student's session expires while they are watching a video? → Video pauses, watermark remains visible, and a message prompts them to re-login. Upon re-login, a new token is issued and they can resume.
- How does the system handle students from different time zones for drip content? → Drip dates are stored in UTC and converted to the student's local time zone based on their browser locale.
- What happens if a student's email is changed after registration? → The system allows email updates; watermarks use the current email on file. Paymob webhook matching uses the original email until explicitly updated.
- How does the system handle concurrent logins from the same student account? → Only one active session per student is permitted. A new login invalidates the previous session and its video tokens.
- What if Paymob webhook delivery fails or times out? → Webhooks are retried with exponential backoff. A manual "Mark as Paid" option is available to the admin for out-of-band enrollment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support student registration via email/password with password strength validation (minimum 8 characters).
- **FR-002**: System MUST support student registration via Google OAuth 2.0 with profile data import (name, email).
- **FR-003**: System MUST provide a password reset flow via email link with 1-hour link expiry.
- **FR-004**: System MUST integrate Paymob payment gateway for course purchase with HMAC webhook validation before enrollment.
- **FR-005**: System MUST enroll students automatically upon receiving a verified Paymob webhook; webhook verification MUST be performed server-side.
- **FR-006**: System MUST serve video content exclusively as HLS (`.m3u8` + `.ts` segments) via tokenized, time-limited signed URLs.
- **FR-007**: System MUST apply a dynamic watermark to video player overlay displaying student name and partially masked email (e.g., j***@example.com).
- **FR-008**: System MUST reject video segment requests with expired or invalid signed URL tokens.
- **FR-009**: System MUST support resumable video uploads using the tus protocol with pause/resume capability.
- **FR-010**: System MUST display upload progress in real-time via a shadcn/ui Progress bar in a Sheet panel.
- **FR-011**: System MUST provide a student search interface (Headless UI combobox) in the admin dashboard for live filtering by name/email.
- **FR-012**: System MUST allow admin to manually enroll students with confirmation Dialog.
- **FR-013**: System MUST allow admin to revoke student access with confirmation Dialog; revoked students MUST be denied course access immediately.
- **FR-014**: System MUST support coupon-based discounts applied at checkout with code validation, expiry, and max usage limits.
- **FR-015**: System MUST display coupon details in a Floating UI popover on the checkout page.
- **FR-016**: System MUST calculate and display analytics KPIs: total revenue, enrolled student count, course completion percentage, average video watch time.
- **FR-017**: System MUST support full EN/AR bilingual interface with RTL/LTR layout switching using CSS logical properties (no hardcoded left/right).
- **FR-018**: System MUST render consistently in both dark mode and light mode on all pages and dashboards.
- **FR-019**: System MUST provide inline form validation via shadcn/ui Form components with error states visible before submission.
- **FR-020**: System MUST display loading skeletons on all data surfaces (tables, cards, forms) while fetching.
- **FR-021**: System MUST provide toast notifications via shadcn/ui Sonner for all user actions (success, error, info).
- **FR-022**: System MUST render empty states with illustrations on all list/table surfaces when no data exists.
- **FR-023**: System MUST gate all destructive actions (delete, revoke, remove) with shadcn/ui Dialog confirmation.
- **FR-024**: System MUST use shadcn/ui components as the base UI library for all interactive elements (Table, Dialog, Sheet, Tabs, Form, Input, Select, Badge, Progress, Skeleton, Card, Avatar, Accordion, Switch).
- **FR-025**: System MUST use Headless UI for unstyled accessible primitives requiring full visual control (language switcher, search combobox, mobile drawer, FAQ disclosure, theme toggle, overlay transitions).
- **FR-026**: System MUST use Floating UI as the positioning engine for all tooltips (admin action buttons, video controls), popovers (coupon info, drip date pickers), and dropdown menus (profile nav, row actions).
- **FR-027**: System MUST apply EduFlow brand token system (#EB2027 primary red with full tonal scale) to all shadcn/ui component restyling.
- **FR-028**: System MUST use Inter font for Latin UI text and Noto Kufi Arabic font for Arabic content, switched automatically by locale.
- **FR-029**: System MUST support two user roles: STUDENT and ADMIN (Yousef) with role-based access control enforced server-side.
- **FR-030**: System MUST expire video tokens after session logout or browser close.

### Key Entities

- **User**: Represents a registered account (student or admin). Attributes: id, email, password_hash, full_name, avatar_url, locale (en/ar), theme (light/dark), oauth_provider (google/email), created_at, updated_at.
- **Enrollment**: Represents a student's access to the course. Attributes: id, user_id, status (ACTIVE, REVOKED, EXPIRED), enrollment_type (PAID, ADMIN_ENROLLED), payment_id (if PAID), enrolled_at, revoked_at.
- **Payment**: Represents a completed Paymob transaction. Attributes: id, user_id, amount, currency, paymob_transaction_id, coupon_id (if applied), status (PENDING, COMPLETED, FAILED), webhook_received_at, created_at.
- **Coupon**: Represents a discount code. Attributes: id, code, discount_percentage, max_uses, uses_count, expiry_date, created_at, deleted_at.
- **Lesson**: Represents a course lesson. Attributes: id, title, description, video_hls_url, order, created_at, updated_at.
- **LessonProgress**: Tracks student progress through lessons. Attributes: id, user_id, lesson_id, completed_at, watch_time_seconds, last_position_seconds.
- **VideoToken**: Represents a signed URL token for HLS playback. Attributes: id, user_id, token_hash, expiry_at, created_at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can complete registration (email or OAuth) in under 2 minutes and immediately log in.
- **SC-002**: Payment processing via Paymob completes and enrollment is confirmed within 5 seconds of webhook receipt.
- **SC-003**: Video playback begins within 3 seconds of clicking play, and watermark is visible and readable on all video frames.
- **SC-004**: Signed video URL tokens are validated on every segment request and expire correctly without allowing reuse.
- **SC-005**: Admin can upload a 500MB video file and pause/resume the upload without loss of previously uploaded chunks.
- **SC-006**: Admin can search and enroll a student from a list of 1000+ students in under 3 seconds of typing.
- **SC-007**: All admin actions (enroll, revoke, create coupon, delete coupon) are confirmed via Dialog and prevent accidental destructive actions.
- **SC-008**: Course completion analytics are calculated correctly and update within 1 hour of lesson completion.
- **SC-009**: All UI pages render correctly and are fully functional in both dark mode and light mode.
- **SC-010**: All form inputs display inline validation errors before submission and prevent invalid data entry.
- **SC-011**: System correctly applies and validates coupons, calculating discounts and updating checkout total accurately.
- **SC-012**: System achieves 95% test coverage on all P0 flows (registration, payment, video playback, upload, enrollment, progress tracking).

## Assumptions

- Students have stable internet connectivity to stream HLS video without persistent buffering.
- Google OAuth configuration is already set up or will be configured before implementation (OAuth credentials available).
- Paymob merchant account is active and sandbox/production credentials are available.
- Single course per instance (no multi-course support in v1).
- Admin (Yousef) is a single, trusted user; no additional admin accounts needed initially.
- Video files are stored in a file system accessible to the backend (S3, local storage, or similar); CDN configuration for HLS delivery is handled separately.
- Student time zones are inferred from browser locale and `Intl` API; explicit time zone selection is not required.
- "Partially masked email" means first letter followed by asterisks (e.g., j***@example.com) without special handling for subdomains.
- Drip content (time-gated lessons) is out of scope for this specification but the architecture MUST support adding it later.
- Mobile app is out of scope; mobile responsiveness via responsive design is in scope.
- Two-factor authentication (2FA) for admin is out of scope for v1 but MUST be architected for v2.
