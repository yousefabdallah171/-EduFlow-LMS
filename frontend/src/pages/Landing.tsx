import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ArrowRight, Cpu, FileText, Layers3, Rocket, Search, ShieldCheck, TestTube2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const phaseIcons = [FileText, Layers3, Cpu, TestTube2, ShieldCheck, Search, Rocket];

const copy = {
  ar: {
    eyebrow: "EARLY ACCESS",
    seats: "أول 30 مقعد بس",
    titleStart: "الـ",
    titleAccent: "AI",
    titleEnd: " بيبني مشاريع",
    titleLine2: "انت لسه بتشرح الفكرة",
    subtitle: "تعلم الـ workflow اللي بيحول الأفكار لتطبيقات حقيقية من الفكرة إلى الـ production باستخدام PRD وSpec Kit وClaude Code وCodex وStitch وDocker والاختبارات والـ SEO والـ CI/CD.",
    primaryCta: "احجز مكانك بسعر الـ Early Access",
    secondaryCta: "شوف الـ Roadmap بالتفصيل",
    trust: ["بدون بطاقة", "بس اسمك وإيميلك", "ردود خلال ساعة"],
    stats: [
      ["7", "مراحل", "من الفكرة للـ production"],
      ["١٠٠٪", "عملي", "مشروع حقيقي مش نظري"],
      ["∞", "وصول", "محتوى بيتحدث دايمًا"]
    ],
    audienceEyebrow: "لمين ده؟",
    audienceTitle: "لو واحد من دول",
    audienceAccent: "فأنت في المكان الصح",
    audienceSubtitle: "قبل أي تفاصيل تقنية، المهم تعرف إذا الكورس ده معمول ليك أصلًا ولا لا.",
    audience: [
      ["مش تقني بس عندك فكرة", "لو عندك فكرة SaaS أو landing page أو منتج صغير، وعايز تبدأ تنفذه من غير ما تستنى فريق كامل، فالـ workflow ده معمول عشان يوصلك لأول نسخة شغالة بسرعة وبشكل منظم."],
      ["Developer عايز يسرّع شغله", "لو أنت Developer وعايز تشتغل أسرع، بوضوح أكتر، ومن غير ما تضيع وقتك في إعادة الشرح والتصحيح، فالكورس ده هيغير طريقة شغلك اليومية مع الـ AI."],
      ["عندك أساس وعايز نظام", "لو مش مبتدئ كامل، وعندك أساس برمجي أو خبرة عملية بسيطة، لكن محتاج workflow واضح من أول الفكرة لحد الـ production، فده بالضبط اللي هتتعلمه هنا."]
    ],
    problemEyebrow: "ليه الـ AI مش بيشتغل معاك؟",
    problemTitle: "مش المشكلة فيك",
    problemAccent: "المشكلة في الـ workflow",
    problemSubtitle: "مش لازم تبقى خبير في الـ AI، بس محتاج تعرف الـ workflow الصح.",
    problems: [
      ["بتشرحله المشروع كل مرة من الأول", "الـ CLAUDE.md والـ Spec Kit بيخلي الـ AI فاكر كل حاجة: هيكل المشروع، قراراته، والـ conventions من أول سطر لآخر سطر.", ["CLAUDE.md", "Spec Kit"]],
      ["بتقوله اعمللي UI ويطلعلك عام", "Stitch بيحول الـ spec بتاعك لـ UI احترافي في ثواني، وبعدها Codex أو Cursor يحوله لكود شغال من غير ما تضيع وقت في تصحيح الاتجاه.", ["Stitch", "Codex"]],
      ["لما المشروع يكبر الأخطاء بتزيد", "الـ Spec Kit بيقسم أي مشروع لـ tasks صغيرة، وكل task الـ AI يخلصها صح من أول مرة من غير ما يتوه أو يتناقض مع نفسه.", ["Spec Kit", "Tasks"]]
    ],
    roadmapEyebrow: "محتوى الكورس بالتفصيل",
    roadmapTitle: "هتتعلم إيه في",
    roadmapAccent: "7 مراحل",
    roadmapSubtitle: "مش عناوين عامة ولا كلام نظري. دي خريطة الكورس كاملة من أول التخطيط لحد ما المشروع يبقى live على السيرفر ويتحدث أوتوماتيك.",
    phases: [
      ["التخطيط قبل الكود", "تحويل الفكرة إلى PRD ونطاق واضح وخريطة تقنية.", "المخرج: PRD + اتجاه تنفيذي"],
      ["الـ UI قبل الكود", "تصميم الشاشات والمكونات باستخدام Stitch قبل التنفيذ.", "المخرج: شاشات جاهزة للكود"],
      ["التنفيذ بـ Spec Kit", "تقسيم المشروع لمهام واضحة وبناء frontend + backend.", "المخرج: نسخة شغالة"],
      ["المراجعة والاختبارات", "مراجعة الكود، TODOs، واختبارات E2E.", "المخرج: كود أنظف وتغطية أفضل"],
      ["الأمان والأداء", "تقوية الأمان وتحسين Lighthouse والأداء.", "المخرج: تطبيق أسرع وأكثر أمانًا"],
      ["SEO والتتبع", "تجهيز SEO وGA4 وMeta Pixel وتتبع التحويل.", "المخرج: موقع قابل للاكتشاف والتتبع"],
      ["Docker وProduction", "نشر Docker وربط CI/CD للتحديثات التلقائية.", "المخرج: تطبيق live + pipeline"]
    ],
    pricingEyebrow: "التسعير",
    pricingSubtitle: "ابدأ بالكورس الأساسي أو اختار باقة المراجعة لو عايز feedback مباشر على مشروعك.",
    pricing: [
      ["الكورس كامل", "الـ 7 مراحل كاملة وكل تحديثات الكورس المستقبلية.", "1000 جنيه", "احجز الكورس", "core-course"],
      ["الكورس + جلسة مراجعة", "جلسة واحدة لمراجعة مشروعك الحقيقي والخطوات التالية.", "2500 جنيه", "احجز مع المراجعة", "course-review-session"]
    ],
    faqEyebrow: "أسئلة قبل الاشتراك",
    faqTitle: "كل اللي محتاج تعرفه",
    faq: [
      ["هل مناسب لو أنا مش تقني؟", "نعم، لو تقدر تمشي على خطوات منظمة. الكورس يشرح الطريق من الفكرة إلى PRD ثم التنفيذ، مع دعم يساعدك لو وقفت."],
      ["أنا frontend developer، هيفيدني؟", "نعم. هيساعدك تتوسع في backend والاختبارات والنشر وتبني نظام شغل قابل للتكرار مع AI."],
      ["أنا مبتدئ جدًا في البرمجة، أدخل؟", "الأفضل تبدأ بالأساسيات الأول. الكورس معمول للي عنده أساس وعايز workflow عملي واضح."],
      ["هل فيه ضمان؟", "لو الكورس غير مناسب لك، تواصل معنا خلال أول 7 أيام. الهدف إن الطالب الجاد ياخد قيمة حقيقية."]
    ],
    finalTitle: "ابنِ بنظام، مش بالتخمين.",
    finalSubtitle: "ابدأ بالمعاينة المجانية، ثم افتح كورس AI Workflow الكامل عندما تكون جاهزًا."
  },
  en: {
    eyebrow: "EARLY ACCESS",
    seats: "First 30 seats",
    titleStart: "AI is building projects",
    titleAccent: " while you",
    titleEnd: " are still",
    titleLine2: "explaining the idea",
    subtitle: "Learn the workflow that turns ideas into real production applications using PRD, Spec Kit, Claude Code, Codex, Stitch, Docker, testing, SEO, and CI/CD.",
    primaryCta: "Reserve your early-access seat",
    secondaryCta: "See the full roadmap",
    trust: ["No card required", "Name and email only", "Replies within an hour"],
    stats: [
      ["7", "Phases", "From idea to production"],
      ["100%", "Practical", "A real project workflow"],
      ["∞", "Access", "Future updates included"]
    ],
    audienceEyebrow: "Who is this for?",
    audienceTitle: "If one of these sounds like you,",
    audienceAccent: "you are in the right place",
    audienceSubtitle: "Before the tools, make sure this is the right workflow for you.",
    audience: [
      ["You have an idea but are not technical", "Turn a SaaS, landing page, or product idea into a structured execution plan."],
      ["You are a developer who wants to move faster", "Work with AI more clearly, with less repeated explanation and less rework."],
      ["You have basics and need a system", "Not for absolute beginners. Built for people ready to follow a serious workflow."]
    ],
    problemEyebrow: "Why AI is not working for you",
    problemTitle: "The problem is not you",
    problemAccent: "the problem is the workflow",
    problemSubtitle: "You do not need more random prompts. You need a better execution system.",
    problems: [
      ["You re-explain the project every time", "CLAUDE.md and Spec Kit preserve the structure, decisions, and conventions.", ["CLAUDE.md", "Spec Kit"]],
      ["The UI comes out generic", "Stitch gives you a strong UI direction before Codex or Cursor turns it into code.", ["Stitch", "Codex"]],
      ["As the project grows, mistakes multiply", "Spec Kit breaks the project into smaller tasks the model can finish correctly.", ["Spec Kit", "Tasks"]]
    ],
    roadmapEyebrow: "Course content",
    roadmapTitle: "What you will learn in",
    roadmapAccent: "7 phases",
    roadmapSubtitle: "This is the real roadmap from planning to a live production deployment.",
    phases: [
      ["Planning before code", "Turn the idea into a PRD, scope, and technical map.", "Output: PRD + execution direction"],
      ["UI before code", "Design screens and components with Stitch before implementation.", "Output: code-ready screens"],
      ["Spec Kit execution", "Split the project into clear tasks and build frontend + backend.", "Output: working app"],
      ["Review and tests", "Run code review, TODO extraction, and E2E tests.", "Output: cleaner code"],
      ["Security and performance", "Audit security and improve Lighthouse and performance.", "Output: safer faster app"],
      ["SEO and tracking", "Set up SEO, GA4, Meta Pixel, and conversion tracking.", "Output: discoverable tracked site"],
      ["Docker and production", "Deploy with Docker and wire CI/CD.", "Output: live app + pipeline"]
    ],
    pricingEyebrow: "Pricing",
    pricingSubtitle: "Start with the course or choose the review package for direct feedback on your project.",
    pricing: [
      ["Core course", "All 7 phases plus future course updates.", "1000 EGP", "Reserve the course", "core-course"],
      ["Course + review session", "One direct session to review your real project.", "2500 EGP", "Reserve with review", "course-review-session"]
    ],
    faqEyebrow: "Questions before enrolling",
    faqTitle: "What you need to know",
    faq: [
      ["Is this useful if I am not technical?", "Yes, if you can follow a structured process. The course walks from idea to PRD to implementation."],
      ["I am a frontend developer. Will it help me?", "Yes. It helps you expand into backend, testing, and deployment with a repeatable AI workflow."],
      ["I am completely new to programming. Should I join?", "Start with the basics first. This course is designed for people with some foundation."],
      ["Is there a guarantee?", "If the course is not a fit, contact support in the first 7 days."]
    ],
    finalTitle: "Build with a workflow, not guesswork.",
    finalSubtitle: "Start with the free preview, then unlock the full AI Workflow course when you are ready."
  }
} as const;

export const Landing = () => {
  const { locale } = useParams();
  const isAr = locale !== "en";
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const data = isAr ? copy.ar : copy.en;

  return (
    <div className="min-h-dvh overflow-hidden">
      <section className="relative px-6 pb-24 pt-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[680px]"
          style={{
            background:
              "radial-gradient(circle at 15% 10%, rgba(163,230,53,0.14), transparent 30%), radial-gradient(circle at 86% 0%, rgba(56,189,248,0.1), transparent 24%)"
          }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: "rgba(163,230,53,0.18)", backgroundColor: "rgba(163,230,53,0.08)", color: "var(--color-brand)" }}>
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              {data.eyebrow}
              <span style={{ color: "var(--color-text-muted)" }}>{data.seats}</span>
            </div>

            <h1 className="mt-7 font-display text-[clamp(2.8rem,7vw,6rem)] font-black leading-[0.95] tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {isAr ? (
                <>
                  {data.titleStart} <span className="accent-word">{data.titleAccent}</span> {data.titleEnd}
                  <br />
                  {data.titleLine2}
                </>
              ) : (
                <>
                  {data.titleStart}
                  <span className="accent-word">{data.titleAccent}</span>
                  {data.titleEnd}
                  <br />
                  {data.titleLine2}
                </>
              )}
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 sm:text-lg" style={{ color: "var(--color-text-secondary)" }}>
              {data.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black no-underline transition-all hover:-translate-y-0.5" style={{ background: "var(--gradient-brand)", color: "var(--color-text-invert)", boxShadow: "0 18px 35px rgba(163,230,53,0.2)" }} to={`${prefix}/checkout`}>
                {data.primaryCta}
                <ArrowRight className="icon-dir h-4 w-4" />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-white/5" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} to={`${prefix}/pricing`}>
                {data.secondaryCta}
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {data.trust.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                isAr ? "ابدأ من أول خطوة بدون تشتت" : "Start with structure, not guesswork",
                isAr ? "اعرف ما الذي ستبنيه قبل ما تبدأ" : "See what you will build before writing code",
                isAr ? "حوّل التعلم إلى مشروع فعلي قابل للنشر" : "Turn the workflow into a real shippable project"
              ].map((point) => (
                <div
                  key={point}
                  className="rounded-[22px] border px-4 py-4"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface) 84%, transparent)" }}
                >
                  <p className="text-sm leading-7" style={{ color: "var(--color-text-primary)" }}>{point}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {data.stats.map(([value, label, desc]) => (
                <div
                  key={label}
                  className="rounded-[24px] border px-5 py-5 shadow-card"
                  style={{
                    background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 82%, transparent))",
                    borderColor: "var(--color-border)"
                  }}
                >
                  <p className="font-display text-3xl font-black text-brand-600">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em]" style={{ color: "var(--color-text-primary)" }}>{label}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[36px] border p-6 shadow-elevated"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 92%, transparent))",
              borderColor: "color-mix(in oklab, var(--color-brand) 18%, var(--color-border))"
            }}
          >
            <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 50% 0%, rgba(163,230,53,0.12), transparent 45%)" }} />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-300/80" />
                  <span className="h-3 w-3 rounded-full bg-brand-600" />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                  {isAr ? "خريطة التنفيذ" : "Execution map"}
                </p>
              </div>

              <div className="space-y-3">
                {data.phases.slice(0, 4).map(([title, body], index) => {
                  const Icon = phaseIcons[index];
                  return (
                    <div
                      key={title}
                      className="flex gap-4 rounded-[24px] border p-4"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)",
                        borderColor: "var(--color-border)"
                      }}
                    >
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(163,230,53,0.1)", color: "var(--color-brand)" }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{title}</p>
                        <p className="mt-1 text-xs leading-6" style={{ color: "var(--color-text-secondary)" }}>{body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 70%, transparent)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                      {isAr ? "قرار سريع" : "Fast decision"}
                    </p>
                    <p className="mt-1 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {isAr ? "شاهد المعاينة المجانية أولاً ثم احجز المسار المناسب" : "Watch the free preview first, then reserve the right track"}
                    </p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold no-underline"
                    style={{ background: "var(--gradient-brand)", color: "var(--color-text-invert)" }}
                    to={`${prefix}/preview`}
                  >
                    {isAr ? "شاهد الآن" : "Watch now"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{data.audienceEyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl" style={{ color: "var(--color-text-primary)" }}>
              {data.audienceTitle}
              <br />
              <span className="accent-word">{data.audienceAccent}</span>
            </h2>
            <p className="mt-4 text-sm leading-8" style={{ color: "var(--color-text-secondary)" }}>{data.audienceSubtitle}</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {data.audience.map(([title, body], index) => (
              <div
                key={title}
                className="rounded-[28px] border p-6 shadow-card"
                style={{
                  background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 85%, transparent))",
                  borderColor: "var(--color-border)"
                }}
              >
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-xl font-black" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
                <p className="mt-3 text-sm leading-8" style={{ color: "var(--color-text-secondary)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{data.problemEyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl" style={{ color: "var(--color-text-primary)" }}>
              {data.problemTitle}
              <br />
              <span className="accent-word">{data.problemAccent}</span>
            </h2>
            <p className="mt-4 text-sm leading-8" style={{ color: "var(--color-text-secondary)" }}>{data.problemSubtitle}</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {data.problems.map(([problem, solution, tools]) => (
              <div
                key={problem}
                className="rounded-[28px] border p-6 shadow-card"
                style={{
                  background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 85%, transparent))",
                  borderColor: "var(--color-border)"
                }}
              >
                <p className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>{problem}</p>
                <p className="mt-3 text-sm leading-8" style={{ color: "var(--color-text-secondary)" }}>{solution}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <span key={tool} className="rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-9 max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{data.roadmapEyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl" style={{ color: "var(--color-text-primary)" }}>
              {data.roadmapTitle} <span className="accent-word">{data.roadmapAccent}</span>
            </h2>
            <p className="mt-4 text-sm leading-8 sm:text-base" style={{ color: "var(--color-text-secondary)" }}>
              {data.roadmapSubtitle}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-7">
            {data.phases.map(([title, body, output], index) => {
              const Icon = phaseIcons[index];
              return (
                <div
                  key={title}
                  className="rounded-[28px] border p-5 shadow-card"
                  style={{
                    background:
                      index === 0
                        ? "linear-gradient(180deg, color-mix(in oklab, var(--color-brand) 12%, var(--color-surface)), color-mix(in oklab, var(--color-surface-2) 88%, transparent))"
                        : "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 85%, transparent))",
                    borderColor: index === 0 ? "color-mix(in oklab, var(--color-brand) 28%, transparent)" : "var(--color-border)"
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-brand-600">{String(index + 1).padStart(2, "0")}</span>
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="mt-5 text-base font-black leading-7" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
                  <p className="mt-3 text-xs leading-7" style={{ color: "var(--color-text-secondary)" }}>{body}</p>
                  <p className="mt-4 rounded-2xl border px-3 py-2 text-[11px] font-semibold leading-5" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                    {output}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{data.pricingEyebrow}</p>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{data.pricingSubtitle}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.pricing.map(([title, body, price, cta, packageId], index) => (
              <div
                key={title}
                className="rounded-[32px] border p-6 shadow-card"
                style={{
                  background:
                    index === 0
                      ? "linear-gradient(180deg, color-mix(in oklab, var(--color-brand) 12%, var(--color-surface)), color-mix(in oklab, var(--color-surface-2) 88%, transparent))"
                      : "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 85%, transparent))",
                  borderColor: index === 0 ? "color-mix(in oklab, var(--color-brand) 28%, transparent)" : "var(--color-border)"
                }}
              >
                <p className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>{title}</p>
                <p className="mt-3 min-h-16 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{body}</p>
                <p className="mt-5 font-display text-3xl font-black text-brand-600">{price}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-text-muted)" }}>
                  {isAr ? "دفعة واحدة - وصول دائم - تحديثات مستقبلية" : "One payment - lifetime access - future updates"}
                </p>
                <Link className="mt-6 inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-black no-underline" style={{ background: index === 0 ? "var(--gradient-brand)" : "var(--color-surface-2)", color: index === 0 ? "var(--color-text-invert)" : "var(--color-text-primary)" }} to={`${prefix}/checkout?package=${packageId}`}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{data.faqEyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {data.faqTitle}
            </h2>
          </div>

          <div className="space-y-3">
            {data.faq.map(([question, answer]) => (
              <Disclosure key={question}>
                {({ open }) => (
                  <div
                    className="overflow-hidden rounded-[24px] border shadow-card"
                    style={{
                      background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 85%, transparent))",
                      borderColor: open ? "var(--color-border-strong)" : "var(--color-border)"
                    }}
                  >
                    <DisclosureButton className="flex w-full items-center justify-between gap-4 px-5 py-5 text-start text-sm font-black transition-colors sm:px-6" style={{ color: "var(--color-text-primary)" }}>
                      <span>{question}</span>
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-lg font-light transition-transform" style={{ transform: open ? "rotate(45deg)" : "none", color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}>
                        +
                      </span>
                    </DisclosureButton>
                    <DisclosurePanel className="px-5 pb-5 text-sm leading-8 sm:px-6" style={{ color: "var(--color-text-secondary)" }}>
                      {answer}
                    </DisclosurePanel>
                  </div>
                )}
              </Disclosure>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div
            className="relative overflow-hidden rounded-[36px] border p-8 text-center shadow-elevated sm:p-12"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 90%, transparent))",
              borderColor: "color-mix(in oklab, var(--color-brand) 18%, var(--color-border))"
            }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 120%, rgba(163,230,53,0.2), transparent 42%)" }} />
            <div className="relative">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
                {isAr ? "آخر خطوة قبل البدء" : "Final step before you start"}
              </p>
              <h2 className="mt-4 font-display text-3xl font-black tracking-tight sm:text-5xl" style={{ color: "var(--color-text-primary)" }}>
                {data.finalTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 sm:text-base" style={{ color: "var(--color-text-secondary)" }}>
                {data.finalSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link className="rounded-2xl px-6 py-3.5 text-sm font-black no-underline transition-all" style={{ background: "var(--gradient-brand)", color: "var(--color-text-invert)" }} to={`${prefix}/checkout`}>
                  {data.primaryCta}
                </Link>
                <Link className="rounded-2xl border px-6 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-white/5" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} to={`${prefix}/preview`}>
                  {isAr ? "شاهد المعاينة المجانية" : "Watch the free preview"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
