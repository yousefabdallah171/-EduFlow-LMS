import type { AppLocale } from "@/lib/locale";
import type { PolicySection } from "@/lib/public-page-content";

const en = {
  about: {
    badge: "Instructor and workflow",
    title: "Not a tools course.",
    accent: "A complete execution system",
    subtitle: "Yousef Abdallah teaches the practical route from raw idea to launched product: planning, UI direction, AI-assisted implementation, review, security, SEO, Docker, and production deployment.",
    portraitName: "Yousef Abdallah",
    portraitRole: "Course Builder",
    philosophyTitle: "The philosophy is simple: AI gets powerful when the workflow is clear.",
    body: "Instead of starting with a random prompt and hoping for luck, the course gives you a repeatable system: understand the problem, write a PRD, shape the UI, implement with AI, review and test, harden security and performance, then ship with confidence.",
    bullets: [
      "Practical Arabic-first teaching without abstract theory.",
      "Focused on production outcomes, not just demos.",
      "Clear tools: PRD, Spec Kit, Claude Code, Codex, Docker, SEO, and CI/CD."
    ],
    stats: [
      { value: "7", label: "workflow phases" },
      { value: "2", label: "languages" },
      { value: "1", label: "repeatable system" }
    ],
    primary: "Reserve your seat",
    secondary: "Watch the free preview"
  },
  testimonials: {
    badge: "Workflow stories",
    title: "Students build faster",
    accent: "with clearer systems",
    subtitle: "The goal is not memorizing tools. The goal is leaving every phase with a concrete step you can apply to a real project.",
    items: [
      { quote: "The biggest difference was not the tools. It was finally knowing what to do before asking AI to code.", name: "Mariam A.", badge: "Founder building an MVP" },
      { quote: "The PRD and review workflow helped me stop rebuilding the same screen three times.", name: "Omar K.", badge: "Junior developer" },
      { quote: "I used the system to organize my app idea, create the screens, and prepare a cleaner launch plan.", name: "Nour S.", badge: "Product-minded student" }
    ]
  },
  faq: {
    badge: "Questions before joining",
    title: "Have a question?",
    accent: "Start here",
    subtitle: "If your answer is not here, contact us before reserving your seat and we will help you choose confidently.",
    search: "Search questions...",
    empty: "No questions match your search.",
    ctaBadge: "Early access is limited",
    ctaTitle: "Another developer is building with the same workflow now",
    ctaBody: "The early-access price will not stay forever. Reserve your seat or talk to us first if you need more confidence.",
    primary: "Reserve your seat now",
    secondary: "Ask on WhatsApp",
    items: [
      {
        q: "What exactly will I learn?",
        a: "A full 7-phase AI workflow: PRD, specification, UI direction, implementation, review, testing, security, SEO, Docker, and CI/CD.",
        pills: ["PRD", "Spec Kit", "Deployment"]
      },
      {
        q: "Do I need to be advanced?",
        a: "You do not need to be an AI expert, but you should understand basic product or programming concepts. The course is practical and execution-focused.",
        pills: ["Beginner friendly", "Practical"]
      },
      {
        q: "Is the course Arabic or English?",
        a: "The platform supports Arabic and English. The learning experience is designed to feel natural in Arabic, not just translated.",
        pills: ["Arabic", "English", "RTL"]
      },
      {
        q: "Will I keep access after purchase?",
        a: "Yes. You pay once and keep access to the course materials and future updates included in your plan.",
        pills: ["Lifetime access", "Updates"]
      }
    ]
  },
  contact: {
    badge: "Fast support during working hours",
    title: "Talk",
    accent: "to us",
    subtitle: "Have a question before joining? Send us a message or use WhatsApp and we will help you choose the right path.",
    panelTitle: "Contact information",
    panelBody: "WhatsApp is the fastest option, especially for questions about payment, access, or choosing the right package.",
    location: "Alexandria, Egypt",
    whatsappCta: "Message us on WhatsApp",
    formTitle: "Send your message",
    name: "Your name",
    email: "Email address",
    message: "Your message",
    submit: "Send message",
    sending: "Sending...",
    success: "Message sent. We will reply soon.",
    error: "Failed to send. Try again or contact us on WhatsApp."
  },
  policies: {
    updated: "Last updated: April 2026",
    primary: "Reserve your seat",
    secondary: "Contact us",
    privacy: {
      title: "Privacy",
      accent: "Policy",
      intro: "This page explains how we handle your personal data clearly, without ad tracking or selling your information.",
      sections: [
        { title: "1. What we collect", bullets: ["Name and email for your account.", "Payment status from Paymob.", "Course progress and support messages."] },
        { title: "2. How we use it", bullets: ["To provide course access.", "To support payments and student help requests.", "To improve the learning experience."] },
        { title: "3. What we do not do", bullets: ["We do not sell your data.", "We do not store card details on our servers.", "We do not use third-party ad tracking for this course."] }
      ] satisfies PolicySection[]
    },
    terms: {
      title: "Terms",
      accent: "of Service",
      intro: "These terms explain the relationship between you and Yousef Abdallah Course in simple, practical language.",
      sections: [
        { title: "1. Access", paragraphs: ["Your account gives you access to the course materials included in your purchased plan."] },
        { title: "2. Fair use", bullets: ["Do not share your account.", "Do not redistribute course videos or resources.", "Use the material for your own learning and projects."] },
        { title: "3. Support", paragraphs: ["We provide support for course access, payments, and platform issues through the available contact channels."] }
      ] satisfies PolicySection[]
    },
    refund: {
      title: "Refund",
      accent: "Policy",
      intro: "We want serious students to feel safe joining. The refund terms are clear, practical, and easy to understand.",
      calloutTitle: "7-day fit guarantee",
      calloutBody: "If the course is not a fit, contact support within the first 7 days. We will review your request fairly based on your access and usage.",
      sections: [
        { title: "1. Refund window", paragraphs: ["Refund requests are reviewed during the first 7 days after purchase."] },
        { title: "2. How to request", bullets: ["Contact support with your account email.", "Explain why the course was not a fit.", "Wait for the review response."] },
        { title: "3. Payment handling", paragraphs: ["Approved refunds are processed through the available payment workflow. Bank or payment-provider timing may vary."] }
      ] satisfies PolicySection[]
    }
  },
  notFound: {
    title: "Page not found",
    subtitle: "The page you are looking for does not exist or may have moved.",
    body: "Use one of the safe routes below to get back into the product.",
    home: "Back to home",
    pricing: "View pricing",
    help: "Contact support"
  }
};

const ar: typeof en = {
  about: {
    badge: "عن المدرب والـ workflow",
    title: "ليس كورس أدوات.",
    accent: "نظام تنفيذ كامل",
    subtitle: "يوسف عبد الله يشرح المسار العملي لتحويل فكرة خام إلى تطبيق منشور: تخطيط، اتجاه UI، تنفيذ بمساعدة الذكاء الاصطناعي، مراجعة، أمان، SEO، Docker، ونشر production.",
    portraitName: "Yousef Abdallah",
    portraitRole: "Course Builder",
    philosophyTitle: "الفلسفة بسيطة: الذكاء الاصطناعي يصبح قويا عندما يكون الـ workflow واضحا.",
    body: "بدلا من أن تبدأ بـ prompt عشوائي وتنتظر الحظ، الكورس يعطيك نظاما قابلا للتكرار: تفهم المشكلة، تكتب PRD، تحدد اتجاه الواجهة، تنفذ بالـ AI، تراجع وتختبر، تقوي الأمان والأداء، ثم تنشر بثقة.",
    bullets: [
      "شرح عربي عملي بعيد عن الكلام النظري.",
      "تركيز على نتيجة production وليس مجرد demo.",
      "أدوات واضحة: PRD، Spec Kit، Claude Code، Codex، Docker، SEO، و CI/CD."
    ],
    stats: [
      { value: "7", label: "مراحل workflow" },
      { value: "2", label: "لغتان" },
      { value: "1", label: "نظام قابل للتكرار" }
    ],
    primary: "احجز مكانك",
    secondary: "شاهد المعاينة المجانية"
  },
  testimonials: {
    badge: "قصص من الـ workflow",
    title: "طلاب يبنون أسرع",
    accent: "بنظام أوضح",
    subtitle: "الهدف ليس حفظ أدوات جديدة. الهدف أن تخرج من كل مرحلة بخطوة عملية قابلة للتنفيذ على مشروع حقيقي.",
    items: [
      { quote: "أكبر فرق لم يكن في الأدوات، بل في أنني عرفت ماذا أفعل قبل أن أطلب من AI كتابة الكود.", name: "مريم أ.", badge: "Founder تبني MVP" },
      { quote: "مسار الـ PRD والمراجعة جعلني أتوقف عن إعادة بناء نفس الشاشة أكثر من مرة.", name: "عمر ك.", badge: "مطور مبتدئ" },
      { quote: "استخدمت النظام لترتيب فكرة التطبيق، وتجهيز الشاشات، وخطة إطلاق أوضح.", name: "نور س.", badge: "طالبة مهتمة بالمنتج" }
    ]
  },
  faq: {
    badge: "أسئلة قبل الاشتراك",
    title: "عندك سؤال؟",
    accent: "ابدأ هنا",
    subtitle: "لو لم تجد إجابتك هنا، تواصل معنا قبل حجز مقعدك وسنساعدك تختار بثقة.",
    search: "ابحث في الأسئلة...",
    empty: "لا توجد أسئلة تطابق البحث.",
    ctaBadge: "Early Access محدود",
    ctaTitle: "هناك مطور آخر يبني الآن بنفس الـ workflow",
    ctaBody: "سعر الـ Early Access لن يستمر دائما. احجز مقعدك أو تواصل معنا أولا لو تحتاج تتأكد.",
    primary: "احجز مكانك الآن",
    secondary: "اسأل على واتساب",
    items: [
      {
        q: "ماذا سأتعلم بالضبط؟",
        a: "ستتعلم workflow كامل في 7 مراحل: PRD، specification، اتجاه UI، تنفيذ، مراجعة، اختبار، أمان، SEO، Docker، و CI/CD.",
        pills: ["PRD", "Spec Kit", "Deployment"]
      },
      {
        q: "هل يجب أن أكون متقدما؟",
        a: "لا تحتاج أن تكون خبير AI، لكن الأفضل أن يكون لديك فهم بسيط للبرمجة أو المنتج. الكورس عملي وموجه للتنفيذ.",
        pills: ["مناسب للمبتدئين", "عملي"]
      },
      {
        q: "هل الكورس عربي أم إنجليزي؟",
        a: "المنصة تدعم العربية والإنجليزية. التجربة مصممة لتكون طبيعية بالعربية وليست مجرد ترجمة.",
        pills: ["عربي", "إنجليزي", "RTL"]
      },
      {
        q: "هل سيظل الوصول متاحا بعد الشراء؟",
        a: "نعم. تدفع مرة واحدة وتحتفظ بالوصول إلى مواد الكورس والتحديثات المستقبلية حسب خطتك.",
        pills: ["وصول دائم", "تحديثات"]
      }
    ]
  },
  contact: {
    badge: "دعم سريع في أوقات العمل",
    title: "تواصل",
    accent: "معنا",
    subtitle: "عندك سؤال قبل الاشتراك؟ ابعت لنا رسالة أو استخدم واتساب وسنساعدك تختار المسار المناسب.",
    panelTitle: "معلومات التواصل",
    panelBody: "واتساب هو أسرع طريقة للتواصل، خصوصا لو عندك سؤال عن الدفع أو الوصول أو اختيار الباقة المناسبة.",
    location: "الإسكندرية، مصر",
    whatsappCta: "كلّمنا على واتساب",
    formTitle: "ابعت رسالتك",
    name: "اسمك",
    email: "البريد الإلكتروني",
    message: "رسالتك",
    submit: "إرسال الرسالة",
    sending: "جار الإرسال...",
    success: "تم الإرسال. سنرد عليك قريبا.",
    error: "فشل الإرسال. جرب مرة أخرى أو تواصل معنا على واتساب."
  },
  policies: {
    updated: "آخر تحديث: أبريل 2026",
    primary: "احجز مكانك",
    secondary: "تواصل معنا",
    privacy: {
      title: "سياسة",
      accent: "الخصوصية",
      intro: "هنا نوضح كيف نتعامل مع بياناتك الشخصية بوضوح، بدون تتبع إعلاني أو بيع بيانات.",
      sections: [
        { title: "١. ما الذي نجمعه", bullets: ["الاسم والبريد الإلكتروني لحسابك.", "حالة الدفع من Paymob.", "تقدمك في الكورس ورسائل الدعم."] },
        { title: "٢. كيف نستخدمه", bullets: ["لتوفير الوصول إلى الكورس.", "لدعم المدفوعات وطلبات المساعدة.", "لتحسين تجربة التعلم."] },
        { title: "٣. ما الذي لا نفعله", bullets: ["لا نبيع بياناتك.", "لا نخزن بيانات البطاقة على خوادمنا.", "لا نستخدم تتبعا إعلانيا خارجيا لهذا الكورس."] }
      ] satisfies PolicySection[]
    },
    terms: {
      title: "الشروط",
      accent: "والأحكام",
      intro: "هذه الشروط تشرح العلاقة بينك وبين كورس يوسف عبدالله بلغة بسيطة وعملية.",
      sections: [
        { title: "١. الوصول", paragraphs: ["حسابك يمنحك الوصول إلى مواد الكورس الموجودة في الخطة التي اشتريتها."] },
        { title: "٢. الاستخدام العادل", bullets: ["لا تشارك حسابك.", "لا تعيد نشر فيديوهات أو موارد الكورس.", "استخدم المحتوى لتعلمك ومشاريعك الخاصة."] },
        { title: "٣. الدعم", paragraphs: ["نوفر دعما لمشاكل الوصول والدفع والمنصة من خلال قنوات التواصل المتاحة."] }
      ] satisfies PolicySection[]
    },
    refund: {
      title: "سياسة",
      accent: "الاسترجاع",
      intro: "نريد أن يشعر الطالب الجاد بالأمان عند الاشتراك. شروط الاسترجاع واضحة وعملية.",
      calloutTitle: "ضمان ملاءمة لمدة 7 أيام",
      calloutBody: "لو لم يكن الكورس مناسبا لك، تواصل مع الدعم خلال أول 7 أيام. سنراجع طلبك بعدل حسب الوصول والاستخدام.",
      sections: [
        { title: "١. فترة الاسترجاع", paragraphs: ["تتم مراجعة طلبات الاسترجاع خلال أول 7 أيام بعد الشراء."] },
        { title: "٢. طريقة الطلب", bullets: ["تواصل مع الدعم ببريد حسابك.", "اشرح لماذا لم يكن الكورس مناسبا.", "انتظر رد المراجعة."] },
        { title: "٣. تنفيذ الدفع", paragraphs: ["الطلبات المقبولة تتم معالجتها عبر مسار الدفع المتاح. قد يختلف وقت البنك أو بوابة الدفع."] }
      ] satisfies PolicySection[]
    }
  },
  notFound: {
    title: "الصفحة غير موجودة",
    subtitle: "الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.",
    body: "استخدم أحد المسارات الآمنة للعودة إلى المنتج.",
    home: "العودة للرئيسية",
    pricing: "عرض الأسعار",
    help: "تواصل مع الدعم"
  }
};

export const getPublicTrustCopy = (locale: AppLocale) => (locale === "ar" ? ar : en);
