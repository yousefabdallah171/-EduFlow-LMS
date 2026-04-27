import { create } from "zustand";
import { persist } from "zustand/middleware";

const getInitialLocale = (): "en" | "ar" => {
  if (typeof window === "undefined") {
    return "en";
  }

  const segment = window.location.pathname.split("/")[1];
  if (segment === "en" || segment === "ar") {
    return segment;
  }

  const browserLanguage =
    typeof navigator === "undefined" ? "" : String(navigator.language || navigator.languages?.[0] || "");
  return String(browserLanguage).toLowerCase().startsWith("ar") ? "ar" : "en";
};

type LocaleState = {
  locale: "en" | "ar";
  setLocale: (locale: "en" | "ar") => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getInitialLocale(),
      setLocale: (locale) => set({ locale })
    }),
    { name: "eduflow-locale" }
  )
);
