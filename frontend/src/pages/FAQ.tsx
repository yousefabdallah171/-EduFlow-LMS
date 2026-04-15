import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { useTranslation } from "react-i18next";

const FAQ_KEYS = ["workflow", "prerequisites", "guarantee", "lifetime"] as const;

export const FAQ = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const items = FAQ_KEYS.map((key) => ({
    key,
    q: t(`faq.items.${key}.q`),
    a: t(`faq.items.${key}.a`)
  }));

  const filtered = search.trim()
    ? items.filter((item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16">

        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("common.noAction")}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("faq.title")}
          </h1>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            {t("faq.subtitle")}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border-strong)",
              color: "var(--color-text-primary)"
            }}
            placeholder={t("faq.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("faq.noResults")}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Disclosure key={item.key}>
                {({ open }) => (
                  <div
                    className="overflow-hidden rounded-xl border transition-all"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: open ? "var(--color-border-strong)" : "var(--color-border)"
                    }}
                  >
                    <DisclosureButton
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-medium transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="flex-shrink-0 text-lg font-thin transition-transform duration-200"
                        style={{ transform: open ? "rotate(45deg)" : "none", color: "var(--color-text-muted)" }}
                      >
                        +
                      </span>
                    </DisclosureButton>
                    <DisclosurePanel className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {item.a}
                    </DisclosurePanel>
                  </div>
                )}
              </Disclosure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
