import { ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";

import { PolicyPage } from "@/components/shared/PolicyPage";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const RefundPolicy = () => {
  const { locale } = useParams();
  const resolved = resolveLocale(locale);
  const policy = getPublicTrustCopy(resolved).policies.refund;

  return (
    <PolicyPage title={policy.title} accent={policy.accent} intro={policy.intro} sections={policy.sections}>
      <div className="reference-card reference-card--lime mt-10 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 flex-shrink-0 text-brand-600" />
          <div>
            <p className="m-0 text-sm font-black" style={{ color: "var(--color-text-primary)" }}>{policy.calloutTitle}</p>
            <p className="m-0 mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{policy.calloutBody}</p>
          </div>
        </div>
      </div>
    </PolicyPage>
  );
};

