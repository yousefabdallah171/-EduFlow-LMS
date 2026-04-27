# SEO Technical Fix — Design Spec
**Date:** 2026-04-25  
**Status:** Approved  
**Approach:** Pre-rendering (public pages) + Full quick-wins (helmet, sitemap, structured data)

---

## Problem Statement

EduFlow LMS is a pure React SPA. When Googlebot requests any URL it receives an empty `<div id="root"></div>` before JavaScript runs. This means:
- Google cannot index page content reliably
- All pages share the same static title/description from `index.html`
- No sitemap, robots.txt, canonical tags, or structured data exist
- Social sharing shows no image preview (missing og:image)
- Arabic and English duplicate routes have no hreflang relationship

---

## Chosen Approach: A + C

**A — Static Pre-rendering** at build time using `vite-plugin-prerender`  
**C — All quick wins:** react-helmet-async, sitemap, robots.txt, og:image, canonical, hreflang, structured data

### Why Not SSR
- Backend is an API server (Express) — adding SSR would require a separate Node.js render server
- Auth-protected routes (`/dashboard`, `/lessons`, `/admin`) don't benefit from SSR for SEO
- Pre-rendering gives 95% of the benefit for 10% of the complexity

---

## Architecture

### Pre-rendering Layer

```
pnpm build
     ↓
vite-plugin-prerender runs headless browser
     ↓
Renders HTML snapshot for each public route
     ↓
Saves to dist/  (dist/index.html, dist/about/index.html, etc.)
     ↓
Nginx serves static HTML to crawlers
     ↓
React hydrates for real users (normal SPA behavior preserved)
```

**Routes to pre-render (11 public pages):**
```
/
/course
/about
/faq
/pricing
/contact
/testimonials
/roadmap
/privacy
/terms
/refund
```

**Routes NOT pre-rendered (stay SPA):**
```
/login, /register, /forgot-password, /reset-password, /verify-email
/checkout, /payment/success, /payment/failure, /payment/pending, /payment/history
/dashboard, /lessons, /lessons/:id, /progress, /notes, /downloads, /orders, /profile
/admin/*, /auth/callback
/en/*, /ar/*  (locale-prefixed — handled by canonical)
```

---

## Head Management

### `<HelmetProvider>` wraps the app root (`frontend/src/main.tsx`)

### `<SEO>` component (`frontend/src/components/shared/SEO.tsx`)

Props:
```typescript
interface SEOProps {
  title: string            // Page-specific title
  description: string      // Page-specific description
  canonical: string        // Canonical URL (always non-locale version)
  ogImage?: string         // Social image URL
  ogType?: string          // "website" | "article" (default: "website")
  noIndex?: boolean        // For auth pages: <meta name="robots" content="noindex">
  structuredData?: object  // JSON-LD object
  locale?: "en" | "ar"     // Current page locale
}
```

Renders:
```html
<title>{title} | Yousef Abdallah Course</title>
<meta name="description" content="{description}" />
<link rel="canonical" href="{canonical}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{ogImage}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:type" content="{ogType}" />
<meta property="og:locale" content="en_US" or "ar_EG" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{ogImage}" />
<link rel="alternate" hreflang="en" href="{SITE_URL}{path}" />
<link rel="alternate" hreflang="ar" href="{SITE_URL}/ar{path}" />
<link rel="alternate" hreflang="x-default" href="{SITE_URL}{path}" />
<script type="application/ld+json">{structuredData}</script>  <!-- if provided -->
<meta name="robots" content="noindex,nofollow" />  <!-- only if noIndex=true -->
```

### SEO Config (`frontend/src/lib/seo-config.ts`)

Centralized SEO data for every public page:

```typescript
export const SEO_CONFIG = {
  landing: {
    title: "Build a Full Production App with AI",
    description: "A practical hands-on course: from idea to PRD, design, implementation, security, testing, and deployment. By Yousef Abdallah.",
    canonical: "/",
    ogImage: "/og-image.png",
  },
  course: {
    title: "Course Content — 7 Phases",
    description: "See all 7 phases of the course: Planning, Design, Implementation, Review, Security, Testing, and Deployment.",
    canonical: "/course",
    ogImage: "/og-image.png",
  },
  pricing: {
    title: "Pricing — Enroll Today",
    description: "One-time payment. Lifetime access. Full production app from scratch.",
    canonical: "/pricing",
    ogImage: "/og-image.png",
  },
  faq: {
    title: "FAQ — Common Questions",
    description: "Answers to the most common questions about the course, prerequisites, and refund policy.",
    canonical: "/faq",
  },
  about: {
    title: "About Yousef Abdallah",
    description: "Full-stack developer and instructor teaching production-grade app development with AI tools.",
    canonical: "/about",
  },
  contact: {
    title: "Contact Us",
    description: "Get in touch with Yousef Abdallah for questions about the course.",
    canonical: "/contact",
  },
  // ... privacy, terms, refund, testimonials, roadmap
}
```

---

## Files to Create / Modify

### New Files

| File | Description |
|------|-------------|
| `frontend/src/components/shared/SEO.tsx` | Helmet wrapper component |
| `frontend/src/lib/seo-config.ts` | Per-page SEO data (EN + AR) |
| `frontend/public/robots.txt` | Crawl rules |
| `frontend/public/sitemap.xml` | All public URLs |
| `frontend/public/og-image.png` | Social share image (1200×630) |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/main.tsx` | Wrap with `<HelmetProvider>` |
| `frontend/index.html` | Add og:image, og:url, fix twitter:card to summary_large_image |
| `frontend/vite.config.ts` | Add `vite-plugin-prerender` |
| `frontend/package.json` | Add `react-helmet-async`, `vite-plugin-prerender` |
| `frontend/src/pages/Landing.tsx` | Add `<SEO>` component |
| `frontend/src/pages/Course.tsx` | Add `<SEO>` component |
| `frontend/src/pages/Preview.tsx` | Add `<SEO>` component |
| `frontend/src/pages/ForgotPassword.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/Login.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/Register.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/Checkout.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/PaymentSuccess.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/PaymentFailure.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/PaymentPending.tsx` | Add `<SEO noIndex>` |
| `frontend/src/pages/PaymentHistory.tsx` | Add `<SEO noIndex>` |
| And all public pages (About, FAQ, Pricing, etc.) | Add `<SEO>` with correct data |
| `docs/features/LANDING_PAGE.md` | Update with SEO info |

---

## Structured Data (JSON-LD)

### Landing Page — Course Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Build a Full Production App with AI",
  "description": "Practical hands-on course from idea to deployed production app",
  "provider": {
    "@type": "Person",
    "name": "Yousef Abdallah",
    "url": "https://yourdomain.com/about"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "EGP",
    "availability": "https://schema.org/InStock"
  },
  "inLanguage": ["en", "ar"],
  "educationalLevel": "Intermediate"
}
```

### FAQ Page — FAQPage Schema
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are the prerequisites?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Basic programming knowledge is helpful but not required."
      }
    }
    // ... all FAQ items
  ]
}
```

### Landing — Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Yousef Abdallah",
  "url": "https://yourdomain.com",
  "sameAs": []
}
```

---

## robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /lessons
Disallow: /admin
Disallow: /login
Disallow: /register
Disallow: /checkout
Disallow: /payment
Disallow: /profile
Disallow: /notes
Disallow: /progress
Disallow: /downloads
Disallow: /orders
Disallow: /api/

Sitemap: https://yourdomain.com/sitemap.xml
```

---

## sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>2026-04-25</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://yourdomain.com/"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://yourdomain.com/ar/"/>
  </url>
  <!-- course, pricing, about, faq, contact, testimonials, roadmap, privacy, terms, refund -->
</urlset>
```

---

## 404 Handling

Nginx already serves the SPA via `try_files $uri $uri/ /index.html`. For pre-rendered pages, 404s will be real HTML. For SPA routes, the React `NotFoundPage` component should call:
```typescript
// In NotFoundPage component
useEffect(() => {
  // Signal to crawlers this is a true 404
  document.title = "404 — Page Not Found | Yousef Abdallah Course";
}, []);
```

For a true HTTP 404, add an Nginx catch-all after the try_files to return 404 status for truly unknown static paths.

---

## Implementation Phases

### Phase 1 — Quick Wins (2 hours)
1. Add `react-helmet-async` package
2. Create `SEO.tsx` component
3. Create `seo-config.ts`
4. Add `<SEO>` to all pages
5. Create `robots.txt`
6. Create `sitemap.xml`
7. Fix `index.html` (og:image, og:url, twitter:card)
8. Create og-image.png (1200×630)

### Phase 2 — Pre-rendering (2 hours)
1. Install `vite-plugin-prerender`
2. Configure in `vite.config.ts` with all public routes
3. Test build output
4. Verify HTML snapshots contain real content

### Phase 3 — Structured Data (1 hour)
1. Add Course JSON-LD to Landing
2. Add FAQPage JSON-LD to FAQ page
3. Add BreadcrumbList to inner pages
4. Add Organization JSON-LD to About

### Phase 4 — Verification (30 min)
1. Run `pnpm build` — verify pre-rendered HTML files
2. Test with `curl` — confirm real content in HTML
3. Validate sitemap at sitemap validator
4. Test og:image with social card debugger
5. Check structured data with Google Rich Results Test
6. Update `docs/features/LANDING_PAGE.md`

---

## Success Criteria

- [ ] `curl https://yourdomain.com/` returns HTML with real page content (not empty div)
- [ ] Each public page has unique `<title>` and `<meta name="description">`
- [ ] `https://yourdomain.com/robots.txt` is accessible
- [ ] `https://yourdomain.com/sitemap.xml` is accessible with all 11 public URLs
- [ ] Google Search Console — no "Page with redirect" or "Crawled but not indexed" errors for public pages
- [ ] Social share of homepage shows og:image preview
- [ ] Google Rich Results Test passes for Landing (Course schema) and FAQ (FAQPage schema)
- [ ] `/dashboard`, `/admin` not indexed (robots.txt blocks them)
