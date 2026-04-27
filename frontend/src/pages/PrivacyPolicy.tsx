import { useParams } from "react-router-dom";

import { PolicyPage } from "@/components/shared/PolicyPage";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

export const PrivacyPolicy = () => {
  const { locale } = useParams();
  const resolved = resolveLocale(locale);
  const policy = getPublicTrustCopy(resolved).policies.privacy;

  return (
    <>
      <SEO page={SEO_PAGES.privacy} />
      <PolicyPage title={policy.title} accent={policy.accent} intro={policy.intro} sections={policy.sections} />
    </>
  );
};

