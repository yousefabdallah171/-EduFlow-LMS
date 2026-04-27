import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, type PageSEO } from "@/lib/seo-config";

interface SEOProps {
  page: PageSEO;
  structuredData?: object | object[];
}

export const SEO = ({ page, structuredData }: SEOProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const title = isArabic ? page.titleAr : page.titleEn;
  const description = isArabic ? page.descriptionAr : page.descriptionEn;
  const canonicalUrl = `${SITE_URL}${page.canonical}`;
  const ogImage = page.ogImage ?? DEFAULT_OG_IMAGE;
  const ogType = page.ogType ?? "website";

  const jsonLdScripts = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      {/* Language and direction */}
      <html lang={isArabic ? "ar" : "en"} dir={isArabic ? "rtl" : "ltr"} />

      {/* Primary */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {page.noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={isArabic ? "ar_EG" : "en_US"} />
      <meta property="og:locale:alternate" content={isArabic ? "en_US" : "ar_EG"} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* hreflang — only for indexable pages */}
      {!page.noIndex && (
        <>
          <link rel="alternate" hrefLang="en" href={`${SITE_URL}${page.canonical}`} />
          <link rel="alternate" hrefLang="ar" href={`${SITE_URL}/ar${page.canonical}`} />
          <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${page.canonical}`} />
        </>
      )}

      {/* JSON-LD Structured Data */}
      {jsonLdScripts.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Helmet>
  );
};
