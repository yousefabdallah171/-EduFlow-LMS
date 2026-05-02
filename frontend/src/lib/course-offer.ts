import { formatNumber, resolveLocale } from "@/lib/locale";

export type LandingPricingCard = {
  id: string;
  variant: "starter" | "featured" | "vip";
  featuredBadge?: string;
  kicker: string;
  title: string;
  description?: string;
  soldOutBadge?: string;
  soldOutBody?: string;
  oldPrice: string;
  price: string;
  currency: string;
  savePill: string;
  priceNote?: string;
  features: string[];
  cta?: string;
  ctaDisabled?: string;
};

type TranslationReader = (key: string, options?: Record<string, unknown>) => unknown;

export const getLandingPricingCards = (t: TranslationReader) =>
  t("landing.pricing.cards", { returnObjects: true }) as LandingPricingCard[];

export const getPricingCardById = (t: TranslationReader, packageId?: string | null) =>
  getLandingPricingCards(t).find((card) => card.id === packageId) ?? null;

export const formatOfferPrice = (amount: number, currency: string, locale: string) => {
  const resolvedLocale = resolveLocale(locale);
  const currencyLabel = currency === "EGP"
    ? resolvedLocale === "ar"
      ? "جنيه"
      : "EGP"
    : currency;

  return `${formatNumber(amount, resolvedLocale)} ${currencyLabel}`;
};

export const formatOfferDuration = (seconds: number, locale: string) => {
  if (!seconds) {
    return null;
  }

  const resolvedLocale = resolveLocale(locale);
  const hours = seconds / 3600;
  const roundedHours = hours >= 3 ? Math.round(hours) : Number(hours.toFixed(1));
  const value = formatNumber(roundedHours, resolvedLocale);

  return resolvedLocale === "ar"
    ? `${value} ساعات`
    : `${value} hours`;
};
