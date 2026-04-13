import type { ReactNode } from "react";
import { useEffect } from "react";

import { NavBar } from "@/components/layout/NavBar";
import i18n from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale.store";
import { useThemeStore } from "@/stores/theme.store";

type RootLayoutProps = {
  children: ReactNode;
};

export const RootLayout = ({ children }: RootLayoutProps) => {
  const { locale, setLocale } = useLocaleStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    const currentSegment = window.location.pathname.split("/")[1];
    if ((currentSegment === "en" || currentSegment === "ar") && currentSegment !== locale) {
      setLocale(currentSegment);
    }
  }, [locale, setLocale]);

  useEffect(() => {
    void i18n.changeLanguage(locale);

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", theme === "dark");

    const { pathname, search, hash } = window.location;
    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] === "en" || segments[0] === "ar") {
      segments[0] = locale;
    } else {
      segments.unshift(locale);
    }

    const nextPath = `/${segments.join("/")}`;
    const nextUrl = `${nextPath}${search}${hash}`;
    const currentUrl = `${pathname}${search}${hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [locale, theme]);

  return (
    <>
      <NavBar />
      {children}
    </>
  );
};
