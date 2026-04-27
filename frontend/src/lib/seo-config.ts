export const SITE_URL = "https://yousef-abdallah.online";
export const SITE_NAME = "Yousef Abdallah Course";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface PageSEO {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noIndex?: boolean;
}

export const SEO_PAGES: Record<string, PageSEO> = {
  landing: {
    titleEn: "Build a Full Production App with AI — Yousef Abdallah",
    titleAr: "ابنِ تطبيقاً كاملاً بالذكاء الاصطناعي — يوسف عبدالله",
    descriptionEn:
      "A practical hands-on course: from idea to PRD, design, implementation, security, testing, and deployment. Build a real production app step by step.",
    descriptionAr:
      "دورة عملية شاملة: من الفكرة إلى المنتج الحقيقي — تصميم، تطوير، أمان، اختبار، ونشر. ابنِ تطبيقاً حقيقياً خطوة بخطوة.",
    canonical: "/",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
  },
  course: {
    titleEn: "Course Content — 7 Phases | Yousef Abdallah",
    titleAr: "محتوى الدورة — 7 مراحل | يوسف عبدالله",
    descriptionEn:
      "Explore all 7 course phases: Planning, Design, Implementation, Review, Security & Performance, Testing, and Deployment.",
    descriptionAr:
      "استكشف 7 مراحل الدورة: التخطيط، التصميم، التطوير، المراجعة، الأمان والأداء، الاختبار، والنشر.",
    canonical: "/course",
    ogImage: DEFAULT_OG_IMAGE,
  },
  pricing: {
    titleEn: "Pricing — Enroll Today | Yousef Abdallah",
    titleAr: "الأسعار — سجّل الآن | يوسف عبدالله",
    descriptionEn:
      "One-time payment. Lifetime access. Get full access to all course content and build a production-grade app.",
    descriptionAr:
      "دفعة واحدة. وصول مدى الحياة. احصل على وصول كامل لجميع محتوى الدورة.",
    canonical: "/pricing",
    ogImage: DEFAULT_OG_IMAGE,
  },
  about: {
    titleEn: "About Yousef Abdallah — Full-Stack Developer & Instructor",
    titleAr: "عن يوسف عبدالله — مطور ومدرب",
    descriptionEn:
      "Yousef Abdallah is a full-stack developer and instructor teaching production-grade app development using AI-powered workflows.",
    descriptionAr:
      "يوسف عبدالله مطور ومدرب متخصص في تطوير التطبيقات الاحترافية باستخدام أدوات الذكاء الاصطناعي.",
    canonical: "/about",
    ogImage: DEFAULT_OG_IMAGE,
  },
  faq: {
    titleEn: "FAQ — Frequently Asked Questions | Yousef Abdallah",
    titleAr: "الأسئلة الشائعة | يوسف عبدالله",
    descriptionEn:
      "Answers to common questions about prerequisites, course content, refund policy, and how to get started.",
    descriptionAr:
      "إجابات على الأسئلة الشائعة حول المتطلبات والمحتوى وسياسة الاسترداد وكيفية البدء.",
    canonical: "/faq",
  },
  contact: {
    titleEn: "Contact Us | Yousef Abdallah",
    titleAr: "تواصل معنا | يوسف عبدالله",
    descriptionEn:
      "Get in touch with Yousef Abdallah for course questions, support, or business inquiries.",
    descriptionAr:
      "تواصل مع يوسف عبدالله للاستفسار عن الدورة أو للحصول على الدعم.",
    canonical: "/contact",
  },
  testimonials: {
    titleEn: "Student Testimonials | Yousef Abdallah",
    titleAr: "آراء الطلاب | يوسف عبدالله",
    descriptionEn:
      "See what students say about the course and their experience building a production app.",
    descriptionAr: "اقرأ تجارب الطلاب وآراءهم حول بناء تطبيق احترافي.",
    canonical: "/testimonials",
    ogImage: DEFAULT_OG_IMAGE,
  },
  roadmap: {
    titleEn: "Course Roadmap | Yousef Abdallah",
    titleAr: "خارطة الدورة | يوسف عبدالله",
    descriptionEn:
      "See the full learning path: from zero to a deployed, production-ready application.",
    descriptionAr:
      "اطلع على مسار التعلم الكامل: من الصفر إلى تطبيق جاهز للإنتاج.",
    canonical: "/roadmap",
  },
  privacy: {
    titleEn: "Privacy Policy | Yousef Abdallah",
    titleAr: "سياسة الخصوصية | يوسف عبدالله",
    descriptionEn:
      "Read our privacy policy to understand how we collect, use, and protect your data.",
    descriptionAr:
      "اقرأ سياسة الخصوصية لفهم كيفية جمع بياناتك واستخدامها وحمايتها.",
    canonical: "/privacy",
  },
  terms: {
    titleEn: "Terms of Service | Yousef Abdallah",
    titleAr: "شروط الخدمة | يوسف عبدالله",
    descriptionEn:
      "Read the terms of service for using the Yousef Abdallah course platform.",
    descriptionAr: "اقرأ شروط الخدمة لاستخدام منصة دورة يوسف عبدالله.",
    canonical: "/terms",
  },
  refund: {
    titleEn: "Refund Policy | Yousef Abdallah",
    titleAr: "سياسة الاسترداد | يوسف عبدالله",
    descriptionEn:
      "Learn about our refund policy and how to request a refund if you're not satisfied.",
    descriptionAr:
      "تعرف على سياسة استرداد الأموال وكيفية تقديم طلب الاسترداد.",
    canonical: "/refund",
  },
  // noIndex pages — auth, checkout, payment
  login: {
    titleEn: "Login | Yousef Abdallah",
    titleAr: "تسجيل الدخول | يوسف عبدالله",
    descriptionEn: "Sign in to your Yousef Abdallah course account.",
    descriptionAr: "سجّل دخولك إلى حساب دورة يوسف عبدالله.",
    canonical: "/login",
    noIndex: true,
  },
  register: {
    titleEn: "Create Account | Yousef Abdallah",
    titleAr: "إنشاء حساب | يوسف عبدالله",
    descriptionEn: "Create your account to get started with the course.",
    descriptionAr: "أنشئ حسابك للبدء في الدورة.",
    canonical: "/register",
    noIndex: true,
  },
  forgotPassword: {
    titleEn: "Reset Password | Yousef Abdallah",
    titleAr: "إعادة تعيين كلمة المرور | يوسف عبدالله",
    descriptionEn: "Reset your account password.",
    descriptionAr: "إعادة تعيين كلمة مرور حسابك.",
    canonical: "/forgot-password",
    noIndex: true,
  },
  resetPassword: {
    titleEn: "Set New Password | Yousef Abdallah",
    titleAr: "تعيين كلمة مرور جديدة | يوسف عبدالله",
    descriptionEn: "Set a new password for your account.",
    descriptionAr: "تعيين كلمة مرور جديدة لحسابك.",
    canonical: "/reset-password",
    noIndex: true,
  },
  verifyEmail: {
    titleEn: "Verify Email | Yousef Abdallah",
    titleAr: "تأكيد البريد الإلكتروني | يوسف عبدالله",
    descriptionEn: "Verify your email address to activate your account.",
    descriptionAr: "تأكيد عنوان بريدك الإلكتروني لتفعيل حسابك.",
    canonical: "/verify-email",
    noIndex: true,
  },
  checkout: {
    titleEn: "Checkout | Yousef Abdallah",
    titleAr: "إتمام الشراء | يوسف عبدالله",
    descriptionEn: "Complete your enrollment purchase.",
    descriptionAr: "أتمم عملية الشراء والتسجيل.",
    canonical: "/checkout",
    noIndex: true,
  },
  paymentSuccess: {
    titleEn: "Payment Successful | Yousef Abdallah",
    titleAr: "تمت عملية الدفع بنجاح | يوسف عبدالله",
    descriptionEn: "Your payment was successful. Welcome to the course!",
    descriptionAr: "تمت عملية الدفع بنجاح. أهلاً بك في الدورة!",
    canonical: "/payment/success",
    noIndex: true,
  },
  paymentFailure: {
    titleEn: "Payment Failed | Yousef Abdallah",
    titleAr: "فشلت عملية الدفع | يوسف عبدالله",
    descriptionEn: "Your payment could not be processed. Please try again.",
    descriptionAr: "تعذّر إتمام عملية الدفع. يرجى المحاولة مجدداً.",
    canonical: "/payment/failure",
    noIndex: true,
  },
  paymentPending: {
    titleEn: "Payment Processing | Yousef Abdallah",
    titleAr: "جارٍ معالجة الدفع | يوسف عبدالله",
    descriptionEn: "Your payment is being processed. Please wait.",
    descriptionAr: "جارٍ معالجة عملية الدفع. يرجى الانتظار.",
    canonical: "/payment/pending",
    noIndex: true,
  },
  paymentHistory: {
    titleEn: "Payment History | Yousef Abdallah",
    titleAr: "سجل المدفوعات | يوسف عبدالله",
    descriptionEn: "View your payment history and transaction records.",
    descriptionAr: "عرض سجل مدفوعاتك وسجلات المعاملات.",
    canonical: "/payment/history",
    noIndex: true,
  },
  notFound: {
    titleEn: "404 — Page Not Found | Yousef Abdallah",
    titleAr: "404 — الصفحة غير موجودة | يوسف عبدالله",
    descriptionEn: "This page does not exist.",
    descriptionAr: "هذه الصفحة غير موجودة.",
    canonical: "/404",
    noIndex: true,
  },
  preview: {
    titleEn: "Free Preview — Watch Sample Lessons | Yousef Abdallah",
    titleAr: "معاينة مجانية — شاهد دروساً تجريبية | يوسف عبدالله",
    descriptionEn: "Watch free preview lessons before enrolling. See the teaching style and course quality first-hand.",
    descriptionAr: "شاهد دروساً مجانية قبل التسجيل. تعرف على أسلوب التدريس وجودة المحتوى.",
    canonical: "/preview",
    ogImage: DEFAULT_OG_IMAGE,
  },
  lesson: {
    titleEn: "Lesson | Yousef Abdallah",
    titleAr: "الدرس | يوسف عبدالله",
    descriptionEn: "Course lesson.",
    descriptionAr: "درس من الدورة.",
    canonical: "/lessons",
    noIndex: true,
  },
  lessons: {
    titleEn: "My Lessons | Yousef Abdallah",
    titleAr: "دروسي | يوسف عبدالله",
    descriptionEn: "Access your enrolled course lessons.",
    descriptionAr: "الوصول إلى دروس الدورة المسجّل فيها.",
    canonical: "/lessons",
    noIndex: true,
  },
};
