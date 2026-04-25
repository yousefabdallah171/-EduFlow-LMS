# EduFlow LMS — UX: Guest (Not Logged-In) Flow

> **Update rule:** Any time the guest/public flow, registration, or pre-checkout experience changes, update this doc.

This doc covers the full journey for a **visitor who is not logged in** — from landing on the site to becoming an enrolled student.

---

## Flow Overview

```
Landing Page → Explore Course → Watch Preview → Register → Verify Email → Login → Checkout → Access Lessons
```

---

## Step 1: Land on the Site

**Page:** `/` (Landing page)  
**File:** `frontend/src/pages/Landing.tsx`

Guest sees the full landing page:
- **Hero** — headline, CTA buttons ("Get started", "See pricing")
- **Audience** — who this course is for
- **Curriculum** — 7-phase course map
- **Numbers** — stats about the course
- **Pricing** — course packages with prices
- **FAQ** — common questions
- **WhatsApp CTA** — contact for questions

NavBar shows: **Home · Course · Checkout · [Language] · [Login] · [Get Started]**

---

## Step 2: Explore the Course Page

**Page:** `/course`  
**File:** Built from `GET /api/v1/course` (public, no auth)

Guest sees:
- Course title and description (in their language: EN / AR)
- List of lessons with titles and durations (grouped by section)
- **Preview** badge on free lessons — these can be watched without login
- Pricing packages
- "Enroll Now" button

---

## Step 3: Watch a Preview Lesson

**Page:** `/preview` or `/lessons/preview`  
**Rate limited:** 30 requests / 10-minute window per IP

Guest can watch 1–2 free preview lessons without any account.

The VideoPlayer shows:
- Full video (no enrollment check for preview lessons)
- Watermark: **"Preview"** text (instead of username, since not logged in)
- Demo player with download prevention still applied

After preview → prominent CTA: **"Get Full Access — Enroll Now"**

---

## Step 4: Click "Get Started" / "Enroll Now"

If guest clicks any enrollment or checkout CTA, the app checks:
- `GET /api/v1/enrollment` → returns 401 (not logged in)
- Frontend detects 401 → redirects to `/login?redirect=/checkout`

The `redirect` query param saves where they were going, so after login they land on checkout.

---

## Step 5: Register an Account

**Page:** `/register`  
**File:** `frontend/src/pages/Register.tsx`

Form fields:
- Full name
- Email address
- Password (min length enforced)

**Or:** "Continue with Google" button → starts OAuth flow

**On submit:** `POST /api/v1/auth/register`

**Backend:**
1. Validates email is unique
2. Hashes password (bcrypt, 12 rounds)
3. Generates email verification token (24h TTL)
4. Sends verification email
5. Returns success message: "Check your email to verify your account"

**In development only:** Email is auto-verified, no email needed.

---

## Step 6: Verify Email

**Email received:** Contains link `https://yourdomain.com/verify-email?token=...`

**Page:** `/verify-email`

Guest clicks the link:
- `GET /api/v1/auth/verify-email?token=...`
- On success: `emailVerified = true` set in DB
- Shown: "Email verified! You can now log in."

If token expired or already used:
- "Verification link expired. Request a new one."
- Resend link → `POST /api/v1/auth/resend-verification`

---

## Step 7: Login

**Page:** `/login`  
**File:** `frontend/src/pages/Login.tsx`

- Email + password form
- "Continue with Google" button

**On success:** Redirected to `redirect` query param (e.g. `/checkout`) or `/dashboard`.

Rate limited: **10 login attempts per minute** per IP.

### Google OAuth Alternative (Steps 5–7 combined)

If guest clicks "Continue with Google":
1. Redirected to Google consent screen
2. Google returns to `/auth/callback`
3. Backend auto-creates account OR links to existing email account
4. Sets `emailVerified = true` automatically
5. Issues session immediately — **no email verification step needed**
6. Redirected to `/checkout` (or saved redirect)

---

## Step 8: Complete Checkout

Now logged in, guest is a registered student at `/checkout`.

See [UX_ENROLLMENT_FLOW.md](./UX_ENROLLMENT_FLOW.md) — Steps 3 onwards for the full payment flow.

---

## Step 9: Access Lessons

After successful payment and enrollment:
- Redirected to `/payment/success`
- "Start Learning" → `/lessons`

Student now has full access to all published lessons.

---

## Guest-Accessible Pages (No Login Required)

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Marketing & conversion |
| Course preview | `/course` | Course info, lessons list |
| Preview lesson | `/preview` | Watch 1 free lesson |
| Pricing | `/pricing` | Package prices |
| About | `/about` | About the course/instructor |
| FAQ | `/faq` | Frequently asked questions |
| Contact | `/contact` | Contact form |
| Testimonials | `/testimonials` | Social proof |
| Roadmap | `/roadmap` | Course roadmap |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of service |
| Refund policy | `/refund` | Refund policy |
| Register | `/register` | Sign up |
| Login | `/login` | Sign in |
| Forgot password | `/forgot-password` | Password reset |
| Reset password | `/reset-password` | Password reset form |
| Verify email | `/verify-email` | Email verification |

---

## Conversion Touchpoints

| Touchpoint | CTA Text | Destination |
|-----------|----------|-------------|
| Hero section | "Get Started" | `/register` |
| Hero section | "See Pricing" | `#pricing` anchor |
| Pricing cards | "Enroll Now" | `/checkout` (→ `/login` if guest) |
| Preview lesson end | "Get Full Access" | `/checkout` |
| FAQ section | "Get Started Today" | `/register` |
| Final CTA | "Get Started" + WhatsApp button | `/register` + WhatsApp |
| NavBar | "Get Started" button | `/register` |

WhatsApp CTA links to instructor's WhatsApp for pre-purchase questions.

---

## Routing: Guest vs Authenticated

`frontend/src/lib/router.tsx` uses `RequireRole` component:

```typescript
// Public: shown to everyone
<Route path="/course" element={<CoursePage />} />

// Protected: redirect to /login if not authenticated
<Route path="/lessons" element={
  <RequireRole role="STUDENT">
    <LessonsPage />
  </RequireRole>
} />
```

Unauthenticated access to a protected route:
→ Saved in session, redirect to `/login?redirect={originalPath}`
→ After login: redirected back to original page

---

## Key Files for Guest Flow

| File | Purpose |
|------|---------|
| `frontend/src/pages/Landing.tsx` | Main marketing page |
| `frontend/src/pages/Login.tsx` | Login form |
| `frontend/src/pages/Register.tsx` | Registration form |
| `frontend/src/pages/ForgotPassword.tsx` | Password reset request |
| `frontend/src/pages/Preview.tsx` | Preview lesson player |
| `frontend/src/lib/router.tsx` | Auth guards + redirect logic |
| `frontend/src/components/landing/` | All landing page sections |
| `backend/src/services/auth.service.ts` | Registration, login, OAuth |
| `backend/src/controllers/auth.controller.ts` | Auth endpoints |
