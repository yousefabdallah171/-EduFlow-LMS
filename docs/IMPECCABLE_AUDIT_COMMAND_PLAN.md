# EduFlow LMS — Impeccable Audit + Command Plan

**Date**: April 23, 2026  
**Scope**: Frontend inner pages + student dashboard + admin dashboard + project docs

This document turns Impeccable’s 18 design commands into a practical, page-by-page plan for EduFlow.

---

## 0) Design Context (source of truth)

- Project design context is captured in `.impeccable.md`.
- Run `/impeccable teach` any time the product direction changes (audience, tone, palette, typography, brand).

---

## 1) Frontend “inside pages” inventory (routes)

**Public / marketing**
- `/` (Landing)
- `/pricing`, `/testimonials`, `/faq`, `/about`, `/contact`, `/roadmap`
- `/privacy`, `/terms`, `/refund`
- `/preview`

**Auth**
- `/register`, `/login`
- `/forgot-password`, `/reset-password`, `/verify-email`
- `/auth/callback`

**Student**
- `/course`, `/lessons`, `/lessons/:lessonId`
- `/dashboard`, `/progress`, `/notes`, `/downloads`, `/orders`, `/profile`, `/help`

**Admin**
- `/admin/dashboard`
- `/admin/lessons`, `/admin/students`, `/admin/students/:id`
- `/admin/pricing`, `/admin/analytics`, `/admin/orders`
- `/admin/media`, `/admin/audit`, `/admin/tickets`, `/admin/settings`, `/admin/notifications`

**Locales**
- All routes above also exist as `/:locale/...` for `en|ar`.

Route source: `frontend/src/lib/router.tsx`.

---

## 2) What the detector found (Impeccable detect)

Artifacts saved in:
- `docs/impeccable-detect-frontend-src.json`
- `docs/impeccable-detect-frontend-dist.json`

### Current findings (latest)
- `frontend/src` scan: **0 findings** (clean).
- `frontend/index.html` + `frontend/dist/index.html` scan: **0 findings** (clean).
- `frontend/dist` directory scan:
  - `layout-transition` (1): `transition: height` found in a compiled JS chunk (likely library-driven accordion/collapse).
  - `gray-on-color` (5): now reports “text-slate-* on bg-green-500” in compiled CSS. This is **likely a false positive** from scanning the CSS bundle (utilities exist, but aren’t necessarily used together in rendered HTML). Prefer URL/HTML scans for this rule.

### Fixes applied in this pass
- Removed “pure black overlay” usage in admin modals by replacing `bg-black/50` → `bg-neutral-950/50`.
- Converted the landing timeline segment fill from `transition: height` → `transform: scaleY(...)`.
- Removed bounce/elastic signals by renaming the landing arrow animation and replacing the overshoot `cubic-bezier(.34, 1.56, .64, 1)`.
- Replaced `bg-amber-100` / `bg-green-100` utility usage in auth/checkout success states with token-based surfaces (more theme-consistent).
- Fixed the HTML shell `single-font` detector warning by adding an invisible font probe in `frontend/index.html` (no UI impact).
- Updated `frontend/public/offline.html` to avoid `Roboto/Arial` and fixed the apostrophe rendering.

---

## 3) Command-by-command plan (what to run, where, and why)

The goal is to avoid “one giant redesign prompt” and instead run targeted commands per page/area.

### Step A — Baseline checks (1–2 hours)

1) `/audit`
- Run on: Landing, Login/Register, Checkout, Student Dashboard, Admin Dashboard.
- Focus: contrast, interactive states, responsiveness, motion/perf anti-patterns, overflow, RTL issues.

2) `/critique`
- Run on: Landing + Pricing (these are your conversion pages).
- Output should become a punch list (what to improve, in priority order).

### Step B — Fix the systemic foundations (half day)

3) `/typeset`
- Goal: move from “single Cairo everywhere” to an intentional Arabic-first hierarchy.
- Deliverables:
  - Define a display font vs body font strategy (Arabic + Latin fallbacks).
  - Use a clearer modular scale (headings should have ≥1.25 step ratio).
  - Ensure RTL typography rules don’t feel “translated”.

4) `/colorize`
- Goal: remove harsh pure-black moments, tighten neutrals, and fix any amber-banner contrast issues.
- Deliverables:
  - Confirm surface stack (`--color-page`, `--color-surface`, borders) in both themes.
  - Ensure “amber info/warn” patterns use text colors that stay AA in light + dark.

5) `/layout`
- Goal: increase hierarchy + rhythm in dashboards (admin/student), avoid “template grid”.
- Deliverables:
  - Standardize page headers, section spacing, and table/list density.
  - Reduce “card-in-card” and replace with sections + dividers where possible.

### Step C — Motion and perceived quality (2–4 hours)

6) `/animate`
- Goal: replace bounce/elastic-feeling easing with calmer, modern easing.
- Targets:
  - Landing micro-animations.
  - Any collapses/expands that animate layout properties (prefer transform/opacity or purpose-built patterns).

7) `/polish`
- Goal: align the system (borders, radii, shadows, hover/focus states, spacing).
- Run after `/typeset`, `/colorize`, `/layout`.

### Step D — Production readiness (ongoing)

8) `/harden`
- Add/verify: empty states, error states, skeletons, loading transitions, long text overflow, i18n edge cases.
- Priority pages:
  - Student: Lessons, Lesson, Dashboard, Orders
  - Admin: Students, Student Detail, Media Library, Orders

9) `/optimize`
- Tie-in with existing performance work: `PERFORMANCE_OPTIMIZATION_AUDIT.md` + `PERFORMANCE_OPTIMIZATION_PLAN_TASKS.md`.
- Frontend targets:
  - Remove layout-thrashing animations (already started).
  - Verify Lighthouse on key pages (desktop + mobile) and budget JS chunks.
  - Ensure route-level code-splitting stays effective (you already use `lazy()`).

### Optional (when needed)
- `/clarify`: fix confusing microcopy, error messages, admin labels, empty state instructions.
- `/adapt`: do a single “RTL + small screens” pass after layout/typeset changes land.
- `/distill`: if a page is getting visually heavy (common with dashboards).

---

## 4) How to re-run the detector (Windows-safe commands)

PowerShell may block `npx.ps1` (ExecutionPolicy). Use `cmd /c`:

```bat
cmd /c "npx --yes impeccable@latest detect frontend/src"
cmd /c "npx --yes impeccable@latest detect frontend/dist"
```

To save JSON artifacts:

```bat
cmd /c "npx --yes impeccable@latest detect --json frontend/src" > docs\impeccable-detect-frontend-src.json
cmd /c "npx --yes impeccable@latest detect --json frontend/dist" > docs\impeccable-detect-frontend-dist.json
```

---

## 5) Next concrete targets (recommended order)

1) Landing (`/`): fix easing (“bounce”), tighten hero hierarchy, confirm RTL rhythm.
2) Checkout (`/checkout`): typeset + clarify + harden (conversion-critical).
3) Student Dashboard (`/dashboard`): layout + harden (loading/empty/error).
4) Admin Students + Student Detail: layout + harden (density + scannability).
