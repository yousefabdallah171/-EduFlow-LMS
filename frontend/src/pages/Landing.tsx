import { Link, useParams } from "react-router-dom";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";

const features = [
  { icon: "▶", title: "Protected video",    body: "HLS streams with session-bound AES-128 keys and short-lived signed tokens. No downloads, no sharing." },
  { icon: "◉", title: "Smart watermark",     body: "Dynamic overlay showing student name and email. Position shifts every 45s to resist cropping." },
  { icon: "◎", title: "Paymob checkout",     body: "One-click payment via Paymob with coupon support. Webhook enrolls students automatically on success." },
  { icon: "◈", title: "Drip content",        body: "Unlock lessons on a schedule after enrollment. Students progress at the pace you design." },
  { icon: "◇", title: "AR / EN bilingual",   body: "Full RTL layout, Arabic typography, and locale persistence. Every string is externalized for translation." },
  { icon: "⬡", title: "Admin analytics",     body: "Revenue, enrollments, completion rate, and watch time in one dashboard. No external tool required." }
];

const outcomes = [
  { number: "01", title: "Secure your content", body: "AES-128 encrypted HLS, per-session signed tokens, and dynamic watermarks stop piracy before it starts." },
  { number: "02", title: "Get students enrolled", body: "Paymob payment page, instant webhook activation, coupon engine, and a fast registration flow." },
  { number: "03", title: "Keep them engaged", body: "Drip unlock schedule, resume from last position, lesson completion tracking, and watch-time analytics." }
];

const faqItems = [
  { q: "How do students get access?", a: "Students register with email or Google, complete Paymob checkout, and are enrolled instantly when the payment webhook arrives." },
  { q: "Are videos protected against downloading?", a: "Yes. Playback uses short-lived signed HLS tokens bound to the student's active session. Tokens expire on logout and cannot be used from another device." },
  { q: "Does the platform support Arabic?", a: "Fully. EduFlow supports English and Arabic with RTL-aware layout, Noto Kufi Arabic typography, and locale persistence across page reloads." },
  { q: "Can I offer coupons or discounts?", a: "Yes. Create percentage or fixed-amount coupons in the admin panel. Race conditions are prevented with row-level database locks." },
  { q: "Can I preview the course before buying?", a: "Yes. The first lesson is available as a free preview so students can see the quality before committing." }
];

const stats = [
  { value: "15m",  label: "Token lifetime" },
  { value: "AES",  label: "Encryption" },
  { value: "RTL",  label: "Arabic layout" },
  { value: "0",    label: "Recurring fees" }
];

export const Landing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-16">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-25 dark:opacity-15"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(235,32,39,0.35), transparent)" }}
        />

        <div className="relative mx-auto max-w-5xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "var(--color-brand-muted)", borderColor: "rgba(235,32,39,0.2)", color: "var(--color-brand)" }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
            Single-course premium LMS
          </div>

          <h1
            className="max-w-3xl text-balance text-[clamp(2.25rem,6vw,4.25rem)] font-bold leading-[1.06] tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Launch your course.
            <br />
            <span className="text-brand-600">Protect,</span> sell,
            <br />
            and scale it.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            EduFlow is a complete single-course platform — secure HLS streaming, Paymob payments, coupon engine, drip content, student analytics, and full Arabic RTL support — without the bloat of a marketplace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
              to={`${prefix}/register`}
            >
              Start for free
              <span className="opacity-70 icon-dir">→</span>
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              to={`${prefix}/course`}
            >
              Preview course
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-5 sm:flex sm:flex-wrap sm:gap-10">
            {stats.map((stat) => (
              <div key={stat.value}>
                <p className="text-3xl font-bold tracking-tight text-brand-600">{stat.value}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Student journey</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              From zero to learning in minutes
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {outcomes.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border p-6 transition-all hover:shadow-card-hover"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <p className="text-4xl font-bold opacity-10" style={{ color: "var(--color-brand)" }}>{step.number}</p>
                <h3 className="mt-2 text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Platform capabilities</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border p-5 transition-all hover:shadow-card-hover"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <span className="text-xl text-brand-600">{feat.icon}</span>
                <h3 className="mt-3 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{feat.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{feat.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div
            className="rounded-2xl border p-8"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-brand-600">What instructors say</p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { quote: "Finally a platform where I don't worry about my videos being stolen.", author: "Ahmed K., Instructor" },
                { quote: "The Arabic RTL support works perfectly — my students love it.", author: "Sara M., Educator" },
                { quote: "Paymob checkout is seamless. Enrollment happens instantly after payment.", author: "Omar T., Course Creator" }
              ].map((item) => (
                <div key={item.author} className="rounded-xl p-4" style={{ backgroundColor: "var(--color-surface-2)" }}>
                  <p className="text-sm leading-relaxed italic" style={{ color: "var(--color-text-secondary)" }}>
                    "{item.quote}"
                  </p>
                  <p className="mt-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div
            className="relative overflow-hidden rounded-2xl p-10 text-center"
            style={{ backgroundColor: "var(--color-invert)", color: "var(--color-text-invert)" }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(235,32,39,0.35), transparent)" }}
            />
            <p className="relative text-xs font-bold uppercase tracking-widest opacity-60">One-time payment</p>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Ready to unlock the full course?</h2>
            <p className="relative mt-3 mx-auto max-w-md text-sm opacity-70">
              Pay once and get lifetime access to all lessons, with session-protected streaming and Arabic/English support.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white no-underline transition-all hover:bg-brand-500 shadow-sm"
                to={`${prefix}/checkout`}
              >
                Get course access
              </Link>
              <Link
                className="rounded-xl border border-white/20 px-7 py-3.5 text-sm font-medium text-white no-underline transition-all hover:bg-white/10"
                to={`${prefix}/register`}
              >
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Common questions
            </h2>
          </div>
          <div className="space-y-2">
            {faqItems.map((item) => (
              <Disclosure key={item.q}>
                {({ open }) => (
                  <div
                    className="overflow-hidden rounded-xl border transition-all"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: open ? "var(--color-border-strong)" : "var(--color-border)"
                    }}
                  >
                    <DisclosureButton
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="flex-shrink-0 text-lg font-thin transition-transform duration-200"
                        style={{ transform: open ? "rotate(45deg)" : "none", color: "var(--color-text-muted)" }}
                      >
                        +
                      </span>
                    </DisclosureButton>
                    <DisclosurePanel className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {item.a}
                    </DisclosurePanel>
                  </div>
                )}
              </Disclosure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-8" style={{ borderColor: "var(--color-border)" }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">E</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>EduFlow</span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            © {new Date().getFullYear()} EduFlow. Premium single-course LMS.
          </p>
          <div className="flex gap-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <Link className="no-underline hover:text-brand-600" to={`${prefix}/login`}>Log in</Link>
            <Link className="no-underline hover:text-brand-600" to={`${prefix}/register`}>Register</Link>
            <Link className="no-underline hover:text-brand-600" to={`${prefix}/checkout`}>Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
