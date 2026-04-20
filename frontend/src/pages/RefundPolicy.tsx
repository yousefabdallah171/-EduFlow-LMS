import { useParams } from "react-router-dom";

import { PolicyPage } from "@/components/shared/PolicyPage";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const RefundPolicy = () => {
  const { locale } = useParams();
  const copy = getPublicTrustCopy(resolveLocale(locale)).policies.refund;

  return (
    <PolicyPage
      title={copy.title}
      accent={copy.accent}
      intro={copy.intro}
      sections={copy.sections}
    >
      <div className="policy-callout reference-card reference-card--lime mb-8">
        <h3>{copy.calloutTitle}</h3>
        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.9 }}>
          {copy.calloutBody}
        </p>
      </div>
    </PolicyPage>
  );
};
