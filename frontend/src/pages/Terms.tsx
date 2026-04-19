import { PolicyPage } from "@/components/shared/PolicyPage";
import { termsAr } from "@/lib/public-page-content";

export const Terms = () => (
  <PolicyPage
    title="الشروط"
    accent="والأحكام"
    intro="اقرأ الشروط دي قبل الاشتراك. هي بتحدد العلاقة بينك وبين AI Workflow بشكل واضح وبسيط."
    sections={termsAr}
  />
);
