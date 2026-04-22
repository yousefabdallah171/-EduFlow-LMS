import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { isAccessTokenExpiringSoon, refreshAccessToken } from "@/lib/api";
import { isDemoMode } from "@/lib/demo";
import { hasStoredRefreshFlag, useAuthStore } from "@/stores/auth.store";

const Landing = lazy(async () => import("@/pages/Landing").then((module) => ({ default: module.Landing })));
const Register = lazy(async () => import("@/pages/Register").then((module) => ({ default: module.Register })));
const Login = lazy(async () => import("@/pages/Login").then((module) => ({ default: module.Login })));
const Checkout = lazy(async () => import("@/pages/Checkout").then((module) => ({ default: module.Checkout })));
const Course = lazy(async () => import("@/pages/Course").then((module) => ({ default: module.Course })));
const Lesson = lazy(async () => import("@/pages/Lesson").then((module) => ({ default: module.Lesson })));
const Lessons = lazy(async () => import("@/pages/Lessons").then((module) => ({ default: module.Lessons })));
const ForgotPassword = lazy(async () =>
  import("@/pages/ForgotPassword").then((module) => ({ default: module.ForgotPassword }))
);
const AdminDashboard = lazy(async () =>
  import("@/pages/admin/Dashboard").then((module) => ({ default: module.AdminDashboard }))
);
const AdminLessons = lazy(async () =>
  import("@/pages/admin/Lessons").then((module) => ({ default: module.AdminLessons }))
);
const AdminStudents = lazy(async () =>
  import("@/pages/admin/Students").then((module) => ({ default: module.AdminStudents }))
);
const AdminPricing = lazy(async () =>
  import("@/pages/admin/Pricing").then((module) => ({ default: module.AdminPricing }))
);
const AdminAnalytics = lazy(async () =>
  import("@/pages/admin/Analytics").then((module) => ({ default: module.AdminAnalytics }))
);
const Preview = lazy(async () =>
  import("@/pages/Preview").then((module) => ({ default: module.Preview }))
);
const About = lazy(async () => import("@/pages/About").then((m) => ({ default: m.About })));
const Testimonials = lazy(async () => import("@/pages/Testimonials").then((m) => ({ default: m.Testimonials })));
const FAQ = lazy(async () => import("@/pages/FAQ").then((m) => ({ default: m.FAQ })));
const Contact = lazy(async () => import("@/pages/Contact").then((m) => ({ default: m.Contact })));
const PublicPricing = lazy(async () => import("@/pages/Pricing").then((m) => ({ default: m.Pricing })));
const PrivacyPolicy = lazy(async () => import("@/pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })));
const Terms = lazy(async () => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const RefundPolicy = lazy(async () => import("@/pages/RefundPolicy").then((m) => ({ default: m.RefundPolicy })));
const Roadmap = lazy(async () => import("@/pages/Roadmap").then((m) => ({ default: m.Roadmap })));
const NotFoundPage = lazy(async () => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const StudentDashboard = lazy(async () => import("@/pages/student/Dashboard").then((m) => ({ default: m.StudentDashboard })));
const StudentProgress = lazy(async () => import("@/pages/student/Progress").then((m) => ({ default: m.StudentProgress })));
const StudentNotes = lazy(async () => import("@/pages/student/Notes").then((m) => ({ default: m.StudentNotes })));
const StudentDownloads = lazy(async () => import("@/pages/student/Downloads").then((m) => ({ default: m.StudentDownloads })));
const StudentOrders = lazy(async () => import("@/pages/student/Orders").then((m) => ({ default: m.StudentOrders })));
const StudentProfile = lazy(async () => import("@/pages/student/Profile").then((m) => ({ default: m.StudentProfile })));
const StudentHelp = lazy(async () => import("@/pages/student/Help").then((m) => ({ default: m.StudentHelp })));
const AdminOrders = lazy(async () => import("@/pages/admin/Orders").then((m) => ({ default: m.AdminOrders })));
const AdminStudentDetail = lazy(async () => import("@/pages/admin/StudentDetail").then((m) => ({ default: m.AdminStudentDetail })));
const AdminMediaLibrary = lazy(async () => import("@/pages/admin/MediaLibrary").then((m) => ({ default: m.AdminMediaLibrary })));
const AdminAuditLog = lazy(async () => import("@/pages/admin/AuditLog").then((m) => ({ default: m.AdminAuditLog })));
const AdminTickets = lazy(async () => import("@/pages/admin/Tickets").then((m) => ({ default: m.AdminTickets })));
const AdminSettings = lazy(async () => import("@/pages/admin/Settings").then((m) => ({ default: m.AdminSettings })));
const AdminNotifications = lazy(async () => import("@/pages/admin/Notifications").then((m) => ({ default: m.AdminNotifications })));
const VerifyEmailPage = lazy(async () => import("@/pages/VerifyEmail").then((m) => ({ default: m.VerifyEmail })));
const ResetPasswordPage = lazy(async () => import("@/pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));

const OAuthCallback = () => {
  const [message, setMessage] = useState("Signing in...");
  const navigate = useNavigate();
  const location = useLocation();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    if (!hasStoredRefreshFlag()) {
      setMessage("Sign-in failed.");
      return;
    }

    void refreshAccessToken()
      .then((token) => {
        if (!token) {
          setMessage("Sign-in failed.");
          return;
        }

        const nextUser = useAuthStore.getState().user;
        const segment = location.pathname.split("/")[1];
        const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
        const target = nextUser?.role === "ADMIN" ? `${prefix}/admin/dashboard` : `${prefix}/dashboard`;

        setMessage("Signed in.");
        navigate(target, { replace: true });
      })
      .catch(() => setMessage("Sign-in failed."));
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{message}</p>
    </div>
  );
};

const AdminHome = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  return <Navigate replace to={`${prefix}/admin/dashboard`} />;
};

const getLocalePrefix = (pathname: string) => {
  const segment = pathname.split("/")[1];
  return segment === "en" || segment === "ar" ? `/${segment}` : "";
};

export const AuthBootstrap = () => {
  const { accessToken, isAuthReady, markAuthReady } = useAuthStore();

  useEffect(() => {
    if (isAuthReady || accessToken) {
      if (!isAuthReady) {
        markAuthReady();
      }
      return;
    }

    const hasRefreshToken = hasStoredRefreshFlag();
    if (!hasRefreshToken) {
      markAuthReady();
      return;
    }

    void refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        markAuthReady();
      });
  }, [accessToken, isAuthReady, markAuthReady]);

  return null;
};

export const SessionKeepAlive = () => {
  const { accessToken, hasRefreshToken, isAuthReady } = useAuthStore();

  useEffect(() => {
    if (!isAuthReady || !hasRefreshToken) {
      return;
    }

    const recoverSession = () => {
      const currentToken = useAuthStore.getState().accessToken;
      if (!currentToken || isAccessTokenExpiringSoon(currentToken, 2 * 60 * 1000)) {
        void refreshAccessToken();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recoverSession();
      }
    };

    recoverSession();
    window.addEventListener("focus", recoverSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", recoverSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, hasRefreshToken, isAuthReady]);

  return null;
};

const RequireRole = ({ role, children }: { role: "ADMIN" | "STUDENT"; children: JSX.Element }) => {
  const location = useLocation();
  const { isAuthReady, user } = useAuthStore();
  const prefix = getLocalePrefix(location.pathname);
  const demo = isDemoMode();
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const recoveryPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || user || !hasStoredRefreshFlag()) {
      if (user) {
        recoveryPathRef.current = null;
      }
      return;
    }

    if (recoveryPathRef.current === location.pathname) {
      return;
    }

    recoveryPathRef.current = location.pathname;
    setIsRecoveringSession(true);

    void refreshAccessToken().finally(() => {
      setIsRecoveringSession(false);
    });
  }, [isAuthReady, location.pathname, user]);

  if (demo && role === "STUDENT") {
    return children;
  }

  if (!isAuthReady || isRecoveringSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to={`${prefix}/login`} />;
  }

  if (user.role !== role) {
    return <Navigate replace to={user.role === "ADMIN" ? `${prefix}/admin/dashboard` : `${prefix}/course`} />;
  }

  return children;
};

export const AppRoutes = () => (
  <Suspense
    fallback={
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
      </div>
    }
  >
    <Routes>
      <Route element={<Landing />} path="/" />
      <Route element={<Register />} path="/register" />
      <Route element={<Login />} path="/login" />
      <Route element={<Checkout />} path="/checkout" />
      <Route element={<Preview />} path="/preview" />
      <Route element={<Course />} path="/course" />
      <Route element={<RequireRole role="STUDENT"><Lesson /></RequireRole>} path="/lessons/:lessonId" />
      <Route element={<RequireRole role="STUDENT"><Lessons /></RequireRole>} path="/lessons" />
      <Route element={<ForgotPassword />} path="/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<VerifyEmailPage />} path="/verify-email" />
      <Route element={<OAuthCallback />} path="/auth/callback" />
      <Route element={<About />} path="/about" />
      <Route element={<Testimonials />} path="/testimonials" />
      <Route element={<FAQ />} path="/faq" />
      <Route element={<Contact />} path="/contact" />
      <Route element={<PublicPricing />} path="/pricing" />
      <Route element={<Roadmap />} path="/roadmap" />
      <Route element={<PrivacyPolicy />} path="/privacy" />
      <Route element={<Terms />} path="/terms" />
      <Route element={<RefundPolicy />} path="/refund" />
      <Route element={<RequireRole role="STUDENT"><StudentDashboard /></RequireRole>} path="/dashboard" />
      <Route element={<RequireRole role="STUDENT"><StudentProgress /></RequireRole>} path="/progress" />
      <Route element={<RequireRole role="STUDENT"><StudentNotes /></RequireRole>} path="/notes" />
      <Route element={<RequireRole role="STUDENT"><StudentDownloads /></RequireRole>} path="/downloads" />
      <Route element={<RequireRole role="STUDENT"><StudentOrders /></RequireRole>} path="/orders" />
      <Route element={<RequireRole role="STUDENT"><StudentProfile /></RequireRole>} path="/profile" />
      <Route element={<RequireRole role="STUDENT"><StudentHelp /></RequireRole>} path="/help" />
      <Route element={<AdminHome />} path="/admin" />
      <Route element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} path="/admin/dashboard" />
      <Route element={<RequireRole role="ADMIN"><AdminLessons /></RequireRole>} path="/admin/lessons" />
      <Route element={<RequireRole role="ADMIN"><AdminStudents /></RequireRole>} path="/admin/students" />
      <Route element={<RequireRole role="ADMIN"><AdminPricing /></RequireRole>} path="/admin/pricing" />
      <Route element={<RequireRole role="ADMIN"><AdminAnalytics /></RequireRole>} path="/admin/analytics" />
      <Route element={<RequireRole role="ADMIN"><AdminOrders /></RequireRole>} path="/admin/orders" />
      <Route element={<RequireRole role="ADMIN"><AdminStudentDetail /></RequireRole>} path="/admin/students/:id" />
      <Route element={<RequireRole role="ADMIN"><AdminMediaLibrary /></RequireRole>} path="/admin/media" />
      <Route element={<RequireRole role="ADMIN"><AdminAuditLog /></RequireRole>} path="/admin/audit" />
      <Route element={<RequireRole role="ADMIN"><AdminTickets /></RequireRole>} path="/admin/tickets" />
      <Route element={<RequireRole role="ADMIN"><AdminSettings /></RequireRole>} path="/admin/settings" />
      <Route element={<RequireRole role="ADMIN"><AdminNotifications /></RequireRole>} path="/admin/notifications" />

      <Route element={<Landing />} path="/:locale" />
      <Route element={<Register />} path="/:locale/register" />
      <Route element={<Login />} path="/:locale/login" />
      <Route element={<Checkout />} path="/:locale/checkout" />
      <Route element={<Preview />} path="/:locale/preview" />
      <Route element={<Course />} path="/:locale/course" />
      <Route element={<RequireRole role="STUDENT"><Lesson /></RequireRole>} path="/:locale/lessons/:lessonId" />
      <Route element={<RequireRole role="STUDENT"><Lessons /></RequireRole>} path="/:locale/lessons" />
      <Route element={<ForgotPassword />} path="/:locale/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/:locale/reset-password" />
      <Route element={<VerifyEmailPage />} path="/:locale/verify-email" />
      <Route element={<OAuthCallback />} path="/:locale/auth/callback" />
      <Route element={<About />} path="/:locale/about" />
      <Route element={<Testimonials />} path="/:locale/testimonials" />
      <Route element={<FAQ />} path="/:locale/faq" />
      <Route element={<Contact />} path="/:locale/contact" />
      <Route element={<PublicPricing />} path="/:locale/pricing" />
      <Route element={<Roadmap />} path="/:locale/roadmap" />
      <Route element={<PrivacyPolicy />} path="/:locale/privacy" />
      <Route element={<Terms />} path="/:locale/terms" />
      <Route element={<RefundPolicy />} path="/:locale/refund" />
      <Route element={<RequireRole role="STUDENT"><StudentDashboard /></RequireRole>} path="/:locale/dashboard" />
      <Route element={<RequireRole role="STUDENT"><StudentProgress /></RequireRole>} path="/:locale/progress" />
      <Route element={<RequireRole role="STUDENT"><StudentNotes /></RequireRole>} path="/:locale/notes" />
      <Route element={<RequireRole role="STUDENT"><StudentDownloads /></RequireRole>} path="/:locale/downloads" />
      <Route element={<RequireRole role="STUDENT"><StudentOrders /></RequireRole>} path="/:locale/orders" />
      <Route element={<RequireRole role="STUDENT"><StudentProfile /></RequireRole>} path="/:locale/profile" />
      <Route element={<RequireRole role="STUDENT"><StudentHelp /></RequireRole>} path="/:locale/help" />
      <Route element={<AdminHome />} path="/:locale/admin" />
      <Route element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} path="/:locale/admin/dashboard" />
      <Route element={<RequireRole role="ADMIN"><AdminLessons /></RequireRole>} path="/:locale/admin/lessons" />
      <Route element={<RequireRole role="ADMIN"><AdminStudents /></RequireRole>} path="/:locale/admin/students" />
      <Route element={<RequireRole role="ADMIN"><AdminPricing /></RequireRole>} path="/:locale/admin/pricing" />
      <Route element={<RequireRole role="ADMIN"><AdminAnalytics /></RequireRole>} path="/:locale/admin/analytics" />
      <Route element={<RequireRole role="ADMIN"><AdminOrders /></RequireRole>} path="/:locale/admin/orders" />
      <Route element={<RequireRole role="ADMIN"><AdminStudentDetail /></RequireRole>} path="/:locale/admin/students/:id" />
      <Route element={<RequireRole role="ADMIN"><AdminMediaLibrary /></RequireRole>} path="/:locale/admin/media" />
      <Route element={<RequireRole role="ADMIN"><AdminAuditLog /></RequireRole>} path="/:locale/admin/audit" />
      <Route element={<RequireRole role="ADMIN"><AdminTickets /></RequireRole>} path="/:locale/admin/tickets" />
      <Route element={<RequireRole role="ADMIN"><AdminSettings /></RequireRole>} path="/:locale/admin/settings" />
      <Route element={<RequireRole role="ADMIN"><AdminNotifications /></RequireRole>} path="/:locale/admin/notifications" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  </Suspense>
);
