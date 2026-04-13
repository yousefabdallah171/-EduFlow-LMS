import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";

import { api, refreshAccessToken } from "@/lib/api";
import { isDemoMode } from "@/lib/demo";
import { useAuthStore } from "@/stores/auth.store";

const Landing = lazy(async () => import("@/pages/Landing").then((module) => ({ default: module.Landing })));
const Register = lazy(async () => import("@/pages/Register").then((module) => ({ default: module.Register })));
const Login = lazy(async () => import("@/pages/Login").then((module) => ({ default: module.Login })));
const Checkout = lazy(async () => import("@/pages/Checkout").then((module) => ({ default: module.Checkout })));
const Course = lazy(async () => import("@/pages/Course").then((module) => ({ default: module.Course })));
const Lesson = lazy(async () => import("@/pages/Lesson").then((module) => ({ default: module.Lesson })));
const ForgotPassword = lazy(async () =>
  import("@/pages/ForgotPassword").then((module) => ({ default: module.ForgotPassword }))
);
const ResetPassword = lazy(async () =>
  import("@/pages/ForgotPassword").then((module) => ({ default: module.ResetPassword }))
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

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying email...");

  useEffect(() => {
    void api
      .get<{ message: string }>("/auth/verify-email", {
        params: { token: searchParams.get("token") }
      })
      .then((response) => setMessage(response.data.message))
      .catch((error) => setMessage(error.response?.data?.message ?? "Email verification failed."));
  }, [searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Email verification</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      </div>
    </div>
  );
};

const OAuthCallback = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const [message, setMessage] = useState("Signing in...");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    void api
      .post<{ accessToken: string; user: Parameters<typeof setSession>[1] }>("/auth/refresh")
      .then((response) => {
        setSession(response.data.accessToken, response.data.user);
        setMessage("Signed in.");
      })
      .catch(() => setMessage("Sign-in failed."));
  }, [setSession]);

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
  const { accessToken, isAuthReady, hasRefreshToken, setSession, clearSession, markAuthReady } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthReady || accessToken) {
      if (!isAuthReady) {
        markAuthReady();
      }
      return;
    }

    const path = location.pathname;
    const isProtected = path.includes("/course") || path.includes("/lessons/") || path.includes("/admin");
    if (!isProtected || !hasRefreshToken) {
      markAuthReady();
      return;
    }

    void refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        if (!useAuthStore.getState().accessToken) {
          clearSession();
        }
        markAuthReady();
      });
  }, [accessToken, clearSession, hasRefreshToken, isAuthReady, location.pathname, markAuthReady, setSession]);

  return null;
};

const RequireRole = ({ role, children }: { role: "ADMIN" | "STUDENT"; children: JSX.Element }) => {
  const location = useLocation();
  const { isAuthReady, user } = useAuthStore();
  const prefix = getLocalePrefix(location.pathname);
  const demo = isDemoMode();

  if (demo && role === "STUDENT") {
    return children;
  }

  if (!isAuthReady) {
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
      <Route element={<ForgotPassword />} path="/forgot-password" />
      <Route element={<ResetPassword />} path="/reset-password" />
      <Route element={<VerifyEmail />} path="/verify-email" />
      <Route element={<OAuthCallback />} path="/auth/callback" />
      <Route element={<AdminHome />} path="/admin" />
      <Route element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} path="/admin/dashboard" />
      <Route element={<RequireRole role="ADMIN"><AdminLessons /></RequireRole>} path="/admin/lessons" />
      <Route element={<RequireRole role="ADMIN"><AdminStudents /></RequireRole>} path="/admin/students" />
      <Route element={<RequireRole role="ADMIN"><AdminPricing /></RequireRole>} path="/admin/pricing" />
      <Route element={<RequireRole role="ADMIN"><AdminAnalytics /></RequireRole>} path="/admin/analytics" />

      <Route element={<Landing />} path="/:locale" />
      <Route element={<Register />} path="/:locale/register" />
      <Route element={<Login />} path="/:locale/login" />
      <Route element={<Checkout />} path="/:locale/checkout" />
      <Route element={<Preview />} path="/:locale/preview" />
      <Route element={<Course />} path="/:locale/course" />
      <Route element={<RequireRole role="STUDENT"><Lesson /></RequireRole>} path="/:locale/lessons/:lessonId" />
      <Route element={<ForgotPassword />} path="/:locale/forgot-password" />
      <Route element={<ResetPassword />} path="/:locale/reset-password" />
      <Route element={<VerifyEmail />} path="/:locale/verify-email" />
      <Route element={<OAuthCallback />} path="/:locale/auth/callback" />
      <Route element={<AdminHome />} path="/:locale/admin" />
      <Route element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} path="/:locale/admin/dashboard" />
      <Route element={<RequireRole role="ADMIN"><AdminLessons /></RequireRole>} path="/:locale/admin/lessons" />
      <Route element={<RequireRole role="ADMIN"><AdminStudents /></RequireRole>} path="/:locale/admin/students" />
      <Route element={<RequireRole role="ADMIN"><AdminPricing /></RequireRole>} path="/:locale/admin/pricing" />
      <Route element={<RequireRole role="ADMIN"><AdminAnalytics /></RequireRole>} path="/:locale/admin/analytics" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  </Suspense>
);
