import { useParams } from "react-router-dom";

import { PolicyPage } from "@/components/shared/PolicyPage";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const PrivacyPolicy = () => {
  const { locale } = useParams();
  const resolved = resolveLocale(locale);
  const policy = getPublicTrustCopy(resolved).policies.privacy;

  return <PolicyPage title={policy.title} accent={policy.accent} intro={policy.intro} sections={policy.sections} />;
};

