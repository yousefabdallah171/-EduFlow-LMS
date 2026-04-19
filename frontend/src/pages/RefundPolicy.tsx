import { PolicyPage } from "@/components/shared/PolicyPage";
import { refundPolicyAr } from "@/lib/public-page-content";

export const RefundPolicy = () => (
  <PolicyPage
    title="سياسة"
    accent="الاسترجاع"
    intro="بنؤمن إن اللي بيشتغل بجد يستاهل ضمان حقيقي. الضمان هنا واضح، عملي، ومن غير لف ودوران."
    sections={refundPolicyAr}
  >
    <div className="policy-callout reference-card reference-card--lime mb-8">
      <h3>ضمان استرجاع كامل — بدون تعقيد</h3>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.9 }}>
        لو مشيت ورا الخطوات وطبقت الـ workflow بجد، ومع ذلك ماقدرتش تطلع فكرة الأبلكيشن اللي في دماغك،
        تقدر تطلب مراجعة استرجاع كاملة حسب الشروط الموجودة هنا.
      </p>
    </div>
  </PolicyPage>
);
