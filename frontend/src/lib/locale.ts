export type AppLocale = "en" | "ar";

export const resolveLocale = (locale?: string | null): AppLocale => (locale === "ar" ? "ar" : "en");

export const pickLocalizedText = (
  locale: AppLocale,
  englishText?: string | null,
  arabicText?: string | null
) => {
  if (locale === "ar") {
    return arabicText || englishText || "";
  }

  return englishText || arabicText || "";
};

export const formatDate = (
  value: string | Date | null | undefined,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
};

export const formatNumber = (value: number, locale: AppLocale) => new Intl.NumberFormat(locale).format(value);

export const formatMinutesShort = (seconds: number, locale: AppLocale) => {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return locale === "ar" ? `${formatNumber(minutes, locale)} د` : `${minutes}m`;
};

export const formatClockDuration = (seconds: number | null) => {
  if (!seconds) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};
