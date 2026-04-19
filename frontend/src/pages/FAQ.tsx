import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { contactInfo, faqItemsAr } from "@/lib/public-page-content";

export const FAQ = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? faqItemsAr.filter((item) =>
        `${item.q} ${item.a} ${item.pills.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())
      )
    : faqItemsAr;

  return (
    <main className="reference-page">
      <div className="reference-shell reference-shell--narrow">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            أسئلة شايفها كتير
          </span>
          <h1 className="reference-title">
            عندك سؤال؟ <span className="accent-word">الإجابة هنا</span>
          </h1>
          <p className="reference-subtitle">
            ولو مش لاقي إجابتك، كلمني على الواتساب مباشرة قبل ما تحجز.
          </p>
        </header>

        <input
          className="reference-field mb-5"
          placeholder="ابحث في الأسئلة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="faq-stack">
          {filtered.map((item, index) => (
            <Disclosure defaultOpen={index === 0} key={item.q}>
              {({ open }) => (
                <article className="reference-card faq-item-reference">
                  <DisclosureButton className="faq-question-reference">
                    <span>{item.q}</span>
                    <span className="faq-toggle-reference">{open ? "×" : "+"}</span>
                  </DisclosureButton>
                  <DisclosurePanel className="faq-answer-reference">
                    <p className="m-0">{item.a}</p>
                    <div className="faq-pills-reference">
                      {item.pills.map((pill) => (
                        <span className="reference-chip" key={pill}>{pill}</span>
                      ))}
                    </div>
                  </DisclosurePanel>
                </article>
              )}
            </Disclosure>
          ))}
        </div>

        <section className="reference-card reference-card--lime mt-14 p-8 text-center">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            Early Access بيقفل قريب
          </span>
          <h2 className="mt-5 font-display text-3xl font-black">
            في developer تاني بيبني دلوقتي بنفس الـ workflow
          </h2>
          <p className="mx-auto mt-3 max-w-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
            سعر الـ Early Access مش هيفضل. احجز مقعدك أو ابعتلنا الأول لو محتاج تتأكد.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="reference-button" to={`${prefix}/pricing`}>احجز مكانك دلوقتي</Link>
            <a className="reference-button-secondary" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              واتساب الأول
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};
