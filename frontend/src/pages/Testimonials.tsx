import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const testimonials = [
  { name: "Ahmed K.", initials: "AK", quote: "Finally a platform where I don't worry about my videos being stolen. The security is rock-solid.", rating: 5, badge: "100% complete" },
  { name: "Sara M.", initials: "SM", quote: "The Arabic RTL support works perfectly. My students feel right at home with the layout.", rating: 5, badge: "100% complete" },
  { name: "Omar T.", initials: "OT", quote: "Paymob checkout is seamless. Enrollment happens instantly after payment. No manual work at all.", rating: 5, badge: "100% complete" },
  { name: "Layla H.", initials: "LH", quote: "I finished the course in 3 weeks and landed my first client the week after. Game changer.", rating: 5, badge: "100% complete" },
  { name: "Khalid R.", initials: "KR", quote: "The video quality and secure streaming made the experience feel premium compared to other platforms.", rating: 5, badge: "100% complete" },
  { name: "Nour A.", initials: "NA", quote: "Being able to switch between Arabic and English mid-session without losing my place is incredible.", rating: 5, badge: "100% complete" },
];

export const Testimonials = () => {
  const { locale } = useParams();
  void locale;
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-5xl px-6 py-16">

        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Students</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("testimonials.title")}
          </h1>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            {t("testimonials.subtitle")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border p-6 transition-all hover:shadow-card-hover"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {item.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.name}</p>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}
                  >
                    {item.badge}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5 text-brand-600">
                {"★".repeat(item.rating)}
              </div>
              <p className="mt-3 text-sm italic leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                "{item.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
