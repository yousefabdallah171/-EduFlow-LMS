---
name: EduFlow LMS
description: A private, instructor-branded single-course learning platform with authentic bidirectional (RTL/LTR) support for Arabic and English speakers.
colors:
  brand: oklch(0.86 0.22 128)
  brand-hover: oklch(0.91 0.2 128)
  brand-muted: oklch(0.86 0.22 128)
  brand-accent: oklch(0.58 0.12 205)
  success: oklch(0.72 0.18 143)
  success-bg: oklch(0.92 0.04 143)
  warning: oklch(0.82 0.16 82)
  warning-bg: oklch(0.95 0.05 82)
  danger: oklch(0.72 0.18 28)
  danger-bg: oklch(0.92 0.04 28)
  text-primary: oklch(0.18 0.012 145)
  text-secondary: oklch(0.38 0.018 145)
  text-muted: oklch(0.55 0.018 145)
  text-invert: oklch(0.95 0.006 145)
  surface: oklch(0.995 0.004 132)
  surface-2: oklch(0.955 0.014 132)
  surface-3: oklch(0.915 0.02 132)
  page: oklch(0.975 0.01 132)
  invert: oklch(0.08 0.008 145)
typography:
  display:
    fontFamily: "Sora, Manrope, system-ui, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Sora, Manrope, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Sora, Manrope, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.58
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
  arabic:
    fontFamily: "Cairo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
shadows:
  card: "0 12px 30px rgba(18, 34, 13, 0.08), 0 1px 0 rgba(255,255,255,0.72) inset"
  card-hover: "0 22px 55px rgba(18, 34, 13, 0.12), 0 0 0 1px rgba(101,163,13,0.12)"
  elevated: "0 28px 70px rgba(18, 34, 13, 0.18), 0 0 70px rgba(101,163,13,0.08)"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.text-invert}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: EduFlow LMS

## 1. Overview

**Creative North Star: "The Focused Instructor"**

EduFlow is designed for adult learners and instructors in the MENA region who demand clarity, reliability, and respect for their time. The system is **intentionally restrained**—every visual element serves a function, and decoration is noise. The brand personality is "focused, trustworthy, professional": confidence earned through consistency and clarity, not decoration.

The platform prioritizes **native bidirectional support** (RTL/LTR) from the ground up, not retrofitted. Arabic is the primary language; English is a secondary option. All layouts use CSS logical properties (`start`, `end`, `block`, `inline`) so that RTL adaptation is automatic and invisible to users.

**Color strategy:** Restrained (tinted neutrals + one saturated accent ≤10%). The brand green is reserved for primary actions and state indicators. Semantic colors (success/warning/danger) are introduced only where they add meaning.

**Key Characteristics:**
- Native RTL/LTR support with logical CSS properties
- Mobile-first, refined for tablet and desktop
- Semantic color system (success/warning/danger) for error states and feedback
- OKLCH color space for perceptual uniformity across light and dark modes
- Restrained, intentional use of color and decoration
- Flat surfaces with tonal layering (no decoration shadows)
- Full dark mode support with proper contrast

## 2. Colors: The Trusted Palette

The palette is built on OKLCH color space for perceptual uniformity. **All colors are tinted slightly toward the brand hue** (chroma 0.005–0.01) even in neutrals—pure gray is avoided. Dark mode uses proper light/chroma reduction to maintain readability and emotional tone.

### Primary (Brand Green)
- **Brand Green** (`oklch(0.86 0.22 128)`): The sole saturated accent. Used for primary buttons, current selection, and links. Kept ≤10% of any screen to maintain impact.
- **Brand Green Hover** (`oklch(0.91 0.2 128)`): Slightly lighter for interactive hover states.
- **Brand Muted** (`color-mix(in oklab, var(--color-brand) 14%, transparent)`): A subtle tint for accents and passive backgrounds.
- **Brand Accent** (`oklch(0.58 0.12 205)`): A deeper blue-accent used sparingly for secondary emphasis.

### Semantic States
- **Success Green** (`oklch(0.72 0.18 143)`): Indicates completion, successful action, or confirmed state. Used in form validation and progress indicators.
- **Success Background** (`oklch(0.92 0.04 143)`): Light green tint for success badge backgrounds.
- **Warning Amber** (`oklch(0.82 0.16 82)`): Alerts and cautions. Used for unfinished or pending states.
- **Warning Background** (`oklch(0.95 0.05 82)`): Light amber tint for warning containers.
- **Danger Red** (`oklch(0.72 0.18 28)`): Error states, destructive actions, and critical feedback.
- **Danger Background** (`oklch(0.92 0.04 28)`): Light red tint for error containers.

### Text & Surfaces
- **Text Primary** (`oklch(0.18 0.012 145)`): Main text, highest contrast.
- **Text Secondary** (`oklch(0.38 0.018 145)`): Supporting text, reduced emphasis.
- **Text Muted** (`oklch(0.55 0.018 145)`): Labels, hints, and tertiary information.
- **Text Invert** (`oklch(0.95 0.006 145)`): Reverse contrast (on dark surfaces or brand backgrounds).
- **Surface** (`oklch(0.995 0.004 132)`): Primary background; nearly white but tinted.
- **Surface 2** (`oklch(0.955 0.014 132)`): Secondary surface (cards, panels).
- **Surface 3** (`oklch(0.915 0.02 132)`): Tertiary surface (nested containers).
- **Page** (`oklch(0.975 0.01 132)`): Page background (slightly lighter than Surface).
- **Invert** (`oklch(0.08 0.008 145)`): Dark surface (near-black, tinted slightly warm).

**Borders:**
- `--color-border` = `color-mix(in oklab, var(--color-text-primary) 9%, transparent)` — hairline dividers.
- `--color-border-strong` = `color-mix(in oklab, var(--color-text-primary) 16%, transparent)` — pronounced edges.

### Dark Mode
Dark mode flips all color roles while maintaining semantic meaning:
- Surfaces become dark (invert becomes light).
- Text becomes light for contrast.
- Accent colors maintain saturation but shift in lightness for dark-mode readability.
- All dark mode tokens are defined in `:root.dark` with proper WCAG AA+ contrast.

### The One Accent Rule
The brand green is used sparingly—primary buttons, current selection, active states, and links only. Its rarity is the point. Overuse dilutes impact and violates the "focused, professional" brand voice.

## 3. Typography

**Display Font:** Sora (fallback: Manrope, system-ui, sans-serif)  
**Body Font:** Manrope (fallback: system-ui, sans-serif)  
**RTL Font (Arabic):** Cairo (fallback: system-ui, sans-serif)

**Character:** Clean, modern sans-serif. Sora is display/headline use with personality; Manrope handles body text with neutral clarity. Cairo provides authentic Arabic typography without sacrifice to readability or visual harmony.

### Hierarchy
- **Display** (600 weight, 2.4rem/clamp, 1.2 line-height): Page hero and section introductions. Used once per page maximum.
- **Headline** (600 weight, 1.7rem, 1.3 line-height): Section titles and major headings.
- **Title** (600 weight, 1.2rem, 1.4 line-height): Subsection titles and card headers.
- **Body** (400 weight, 1rem, 1.58 line-height): Main content. Capped at 65–75ch for readability. Automatically adjusts for Arabic (`1.65 line-height`).
- **Body Small** (400 weight, 0.92rem, 1.5 line-height): Secondary body text in constrained spaces.
- **Label** (600 weight, 0.76rem, 1.4 line-height, `0.08em` letter-spacing, uppercase): Form labels, badges, and captions.

### Named Rules
**The Bidirectional Harmony Rule.** Typography scales and leading are language-agnostic. Arabic text uses Cairo with slightly increased line-height (`1.65`), but the scale hierarchy (Display → Headline → Title → Body) remains identical in both languages.

## 4. Elevation

This system uses **tonal layering, not decorative shadows**. Surfaces are flat at rest. Shadows appear only in specific interactive contexts (card hover, dialogs, tooltips) where they serve a functional purpose: signaling lift, focus, or context.

### Shadow Vocabulary
- **Card Shadow** (`0 12px 30px rgba(18, 34, 13, 0.08), 0 1px 0 rgba(255,255,255,0.72) inset`): Subtle shadow for card surfaces at rest. The inset highlight adds gentle depth without heaviness.
- **Card Hover** (`0 22px 55px rgba(18, 34, 13, 0.12), 0 0 0 1px rgba(101,163,13,0.12)`): Interactive elevation on hover. Slightly stronger with a 1px brand-tinted border.
- **Elevated** (`0 28px 70px rgba(18, 34, 13, 0.18), 0 0 70px rgba(101,163,13,0.08)`): Maximum elevation for modal dialogs, toasts, and top-layer content.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat and tonal at rest. Shadows are reserved for interactive responses (hover, focus, modal presentation) and never used decoratively.

## 5. Components

### Buttons
- **Shape:** Rounded (16px radius).
- **Primary Button:** Brand green background, white text, 12px vertical / 20px horizontal padding (minimum 44px height for touch). Hover: brand-green-hover.
- **Secondary Button:** Transparent background, primary-text color, border at border-strong. Hover: surface-2 background.
- **Disabled State:** Opacity 60% applied to any button variant.
- **Sizing:** All buttons maintain minimum 44px height for touch targets (mobile-first).

### Inputs & Forms
- **Shape:** Rounded (12px radius).
- **Base Style:** Surface background, primary-text color, border at border-strong. Padding 10px / 16px.
- **Focus State:** Border shifts to brand color, `focus:ring-2` applied.
- **Error State:** Border color switches to danger, error message in danger color.
- **Placeholder:** Text-muted color.
- **Label:** Always associated (`<label for="id">`), required indicator shown as `*` in danger color.

### Cards & Panels
- **Shape:** Rounded (24px radius).
- **Background:** Surface (Surface-2 for secondary grouping).
- **Padding:** 24px (16px on mobile).
- **Borders:** None (tonal background provides visual separation).
- **Shadows:** Card shadow at rest, card-hover shadow on interaction.
- **Variants:** `.dashboard-panel` (primary), `.dashboard-panel--accent` (Surface-2 tint), `.dashboard-panel--strong` (brand-tinted background).

### Dialogs & Modals
- **Shape:** Rounded (28px radius).
- **Backdrop:** Semi-transparent dark overlay with subtle blur.
- **Width:** Fluid on mobile (`min(100% - 2rem, 34rem)`).
- **Shadows:** Elevated shadow.
- **Close Button:** Top-right, no background at rest, surface-2 on hover.

### Progress Indicators
- **Linear Progress:** 2.5px height, brand-green color, smooth animation.
- **Steps/Onboarding:** Dot indicators (7px default, 20px when active). Brand green when active, border-strong when inactive.

### Navigation
- **Navbar:** Sticky, transparent background with subtle backdrop blur (mobile) / flat (desktop).
- **Links:** Primary text color by default, brand-green on hover.
- **Active Link:** Brand-green text, no underline.
- **Mobile Menu:** Full-width slide-in, nav items in primary text, active items in brand-green.

### Motion
- **Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart) for snappy, responsive feel. No bounce or elastic easing.
- **Durations:** Fast (140ms), Base (220ms), Slow (520ms). Most interactions use Base.
- **Reduced Motion:** All animations disabled when `prefers-reduced-motion: reduce` is set.

## 6. Do's and Don'ts

**Do:**
- Use CSS logical properties (`start`, `end`, `block`, `inline`, `ms-auto`, `me-auto`) so RTL/LTR adaptation is automatic.
- Use OKLCH colors from the token system; never hard-code hex or rgb() values.
- Keep the brand green to ≤10% of any screen (primary button, current selection, one accent).
- Use semantic colors (success/warning/danger) to communicate state, not just aesthetic.
- Test at 200% zoom and in both light and dark modes.
- Ensure all text has 4.5:1 contrast ratio (WCAG AA) or 7:1 for AAA.
- Use `role="tab"` and `aria-selected` for step indicators and tabs.
- Apply `focus:ring-2` and `focus:outline-none` to all interactive elements.

**Don't:**
- Hard-code colors; use `var(--color-*)` instead.
- Use decorative shadows or glassmorphism effects.
- Create nested cards (cards inside cards).
- Apply `left`, `right`, `marginLeft`, `marginRight` directly—use logical properties.
- Use side-stripe borders (`border-left > 1px` or `border-right > 1px`) as colored accents.
- Animate layout properties (width, height, position).
- Use pure black (`#000`) or pure white (`#fff`).
- Rely on color alone to communicate state (always pair color with icons, text, or patterns for a11y).
- Forget to test in RTL mode—Arabic layout is not a afterthought.
