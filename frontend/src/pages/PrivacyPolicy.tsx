import { PolicyPage } from "@/components/shared/PolicyPage";
import { privacyPolicyAr } from "@/lib/public-page-content";

export const PrivacyPolicy = () => (
  <PolicyPage
    title="سياسة"
    accent="الخصوصية"
    intro="هنا بنوضحلك إزاي بنتعامل مع بياناتك الشخصية بكل شفافية، ومن غير تتبع إعلاني أو بيع بيانات."
    sections={privacyPolicyAr}
  />
);
