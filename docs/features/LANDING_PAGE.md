# EduFlow LMS — Landing Page & Marketing Pages

> **Update rule:** Any time you add/change a landing section, public page, or nav item, update this doc.

---

## Landing Page (`/`)

**File:** `frontend/src/pages/Landing.tsx`  
**Public route** — no auth required  
**Bilingual:** All text translated via i18next (`landing.*` keys in en.json / ar.json)

---

## Landing Page Sections (in order)

### 1. NavBar (`components/layout/NavBar.tsx`)

Sticky header. For public users shows:
```
[Logo: YA] ── Home · Course · Checkout ──── [Lang: EN/AR] [Theme] [Login] [Get Started]
```

Logo brand name: **YA — Yousef Abdallah**

Mobile: hamburger → `MobileDrawer.tsx` with same links

### 2. Hero (`components/landing/LandingHero.tsx`)

- Badge: "EARLY ACCESS"
- Main headline + subtitle
- CTA buttons: **Get started** (→ checkout/register), **See pricing** (→ #pricing)
- Tech stack pills: PRD, Spec Kit, Codex, Docker
- Trust signals row:
  - 🔒 Secure Payment
  - 💬 Support
  - ⚡ Instant Access
- Stats cards:
  - 7 clear phases
  - Hands-on building
  - Production from day one

### 3. Audience Section (`components/landing/LandingAudience.tsx`)

Three audience cards:
1. **Non-technical with an idea** — wants to ship without hiring a developer
2. **Developer who wants speed** — knows code but wants AI workflow
3. **Someone who knows basics** — wants a full production-grade system

### 4. Workflow Section (`components/landing/LandingWorkflowSection.tsx`)

Before / After comparison:
- **Before:** Manual guesswork, context switching, slow iterations
- **After:** AI-powered pipeline with: CLAUDE.md, Spec Kit, Stitch, Cursor

### 5. Course Content (`components/landing/LandingCourseContentSection.tsx`)

Full curriculum map — 7 phases displayed as cards with accent colors and outputs:

| Phase | Title | Outputs |
|-------|-------|---------|
| 1 | Planning | PRD, spec, requirements |
| 2 | Design | Architecture, DB schema, API contracts |
| 3 | Implementation | Full-stack app |
| 4 | Review | Code review, refactoring |
| 5 | Security + Performance | Hardened, optimized app |
| 6 | Testing | Test suite, CI/CD |
| 7 | Deployment | Live production app |

### 6. Timeline Section (`components/landing/LandingTimelineSection.tsx`)

Visual timeline showing course progression from idea to deployed app.

### 7. Numbers Section (`components/landing/LandingNumbersSection.tsx`)

Key statistics highlighting scale and quality:
- Number of lessons
- Hours of content
- Lines of production code
- Tools covered

### 8. Pricing Section (`components/landing/LandingPricingSection.tsx`)

Course packages pulled from `CoursePackage` DB table (or static display):
- Package name and description (EN/AR)
- Price in EGP
- Feature list
- CTA: **Enroll Now** → `/checkout`

### 9. FAQ Section (`components/landing/LandingFaqSection.tsx`)

Accordion FAQ. Questions translated via `landing.faq.*` i18n keys.  
Common questions: refund policy, prerequisites, lifetime access, language support.

### 10. Final CTA Section

Amber-themed closing section:
- Final headline
- Pricing anchor link
- **WhatsApp CTA button** (`common.whatsapp` translation key → WhatsApp URL)

---

## Other Public Pages

All are public routes (no auth required):

| Route | Purpose |
|-------|---------|
| `/course` | Public course info: title, description, lesson previews, packages |
| `/preview` | Preview a specific free lesson (rate-limited) |
| `/checkout` | Purchase page (requires login to complete) |
| `/pricing` | Pricing page |
| `/register` | User registration form |
| `/login` | Login form |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/verify-email` | Email verification landing |
| `/auth/callback` | OAuth callback handler |
| `/about` | About page |
| `/faq` | FAQ page (standalone) |
| `/contact` | Contact form (`POST /api/v1/contact`) |
| `/testimonials` | Testimonials |
| `/roadmap` | Course roadmap |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/refund` | Refund policy |

---

## Payment Result Pages (Post-Checkout)

Public-accessible after payment (Paymob redirects here):

| Route | File | Shows |
|-------|------|-------|
| `/payment/success` | `pages/PaymentSuccess.tsx` | Celebration, access button |
| `/payment/failure` | `pages/PaymentFailure.tsx` | Error message, retry button |
| `/payment/pending` | `pages/PaymentPending.tsx` | Waiting animation, auto-poll |
| `/payment/history` | `pages/PaymentHistory.tsx` | All past payments + statuses |

**PaymentPending** auto-polls `/enrollment` every few seconds until status resolves.

---

## Error Handling on Public Pages

`frontend/src/components/PaymentErrorBoundary.tsx` — React error boundary wrapping payment pages.  
`frontend/src/components/PaymentErrorMessage.tsx` — styled error state component.  
`frontend/src/utils/paymentErrorHandler.ts` — maps error codes to user-friendly messages.  
`frontend/src/utils/paymentErrors.ts` — error code constants for frontend.

---

## Localization

All landing text is in:
- `frontend/src/locales/en.json` — English
- `frontend/src/locales/ar.json` — Arabic (RTL)

Key namespaces:
```
landing.hero.*          Hero section
landing.audience.*      Who this is for
landing.workflow.*      Before/after comparison
landing.curriculum.*    7-phase course map
landing.pricing.*       Package names, prices
landing.faq.*           FAQ questions + answers
nav.*                   Navigation items
common.whatsapp         WhatsApp contact URL
```

Language is auto-detected from browser or user preference.  
URL supports locale prefix: both `/ar/` and `/` work.

---

## SEO & Meta Tags

`frontend/index.html`:
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card metadata
- Viewport meta for responsive design
- Google Fonts preconnect for performance

---

## Fonts Used on Landing

- **Sora** / **Manrope** — English headings & body
- **Cairo** — Arabic text
- **Noto Kufi Arabic** — Arabic headings
- **JetBrains Mono** — code snippets

All loaded from Google Fonts CDN with `preconnect` + `display=swap`.
