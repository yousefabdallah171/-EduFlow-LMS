import { useParams } from "react-router-dom";

import { PolicyPage } from "@/components/shared/PolicyPage";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const Terms = () => {
  const { locale } = useParams();
  const copy = getPublicTrustCopy(resolveLocale(locale)).policies.terms;

  return (
    <PolicyPage
      title={copy.title}
      accent={copy.accent}
      intro={copy.intro}
      sections={copy.sections}
    />
  );
};
