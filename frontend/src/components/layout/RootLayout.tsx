import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import i18n from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale.store";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";

const replaceLocaleInPathname = (pathname: string, locale: "en" | "ar") => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "en" || parts[0] === "ar") { parts[0] = locale; } else { parts.unshift(locale); }
  return `/${parts.join("/")}`;
};

const getLocaleFromPathname = (pathname: string): "en" | "ar" | null => {
  const segment = pathname.split("/")[1];
  return segment === "en" || segment === "ar" ? segment : null;
};

type RootLayoutProps = {
  children: ReactNode;
};

export const RootLayout = ({ children }: RootLayoutProps) => {
  const { locale, setLocale } = useLocaleStore();
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const appliedUserId = useRef<string | null>(null);

  // Apply saved locale + theme from account whenever the user logs in (or refreshes with an existing session)
  useEffect(() => {
    if (!user || appliedUserId.current === user.id) return;
    appliedUserId.current = user.id;

    const pathLocale = getLocaleFromPathname(location.pathname);

    if (!pathLocale && user.locale && user.locale !== locale) {
      setLocale(user.locale);
      navigate(
        `${replaceLocaleInPathname(location.pathname, user.locale)}${location.search}${location.hash}`,
        { replace: true }
      );
    }
    if (user.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [location.hash, location.pathname, location.search, locale, navigate, setLocale, setTheme, theme, user]);

  // Reset tracking when user logs out so next login re-applies preferences
  useEffect(() => {
    if (!user) appliedUserId.current = null;
  }, [user]);

  useEffect(() => {
    const pathLocale = getLocaleFromPathname(location.pathname);

    if (pathLocale && pathLocale !== locale) {
      setLocale(pathLocale);
    }
  }, [location.pathname, locale, setLocale]);

  useEffect(() => {
    void i18n.changeLanguage(locale);

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [locale, theme]);

  return (
    <>
      <NavBar />
      {children}
      <Footer />
    </>
  );
};
