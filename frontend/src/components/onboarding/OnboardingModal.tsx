import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Play, Gauge, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import type { AuthUser } from "@/stores/auth.store";

const storageKey = (userId: string) => `ya-onboarded-${userId}`;

interface OnboardingModalProps {
  user: AuthUser;
  prefix: string;
  coursePath: string;
  lessonPath?: string;
}

export const OnboardingModal = ({ user, prefix, coursePath, lessonPath }: OnboardingModalProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(storageKey(user.id))) {
      setOpen(true);
    }
  }, [user.id]);

  const dismiss = () => {
    localStorage.setItem(storageKey(user.id), "1");
    setOpen(false);
  };

  const features = [
    {
      icon: Play,
      label: t("student.onboarding.feature1Title"),
      detail: t("student.onboarding.feature1Body")
    },
    {
      icon: Gauge,
      label: t("student.onboarding.feature2Title"),
      detail: t("student.onboarding.feature2Body")
    },
    {
      icon: FileText,
      label: t("student.onboarding.feature3Title"),
      detail: t("student.onboarding.feature3Body")
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="p-0 overflow-hidden gap-0">
        {/* Step indicators + skip row */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2" role="tablist" aria-label={t("student.onboarding.stepsLabel")}>
            {[0, 1].map((i) => (
              <div
                key={i}
                role="tab"
                aria-selected={i === step}
                aria-label={`Step ${i + 1} of 2${i === step ? ', current' : ''}`}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === step ? "20px" : "7px",
                  height: "7px",
                  backgroundColor: i === step ? "var(--color-brand)" : "var(--color-border-strong)"
                }}
              />
            ))}
          </div>
          <DialogClose
            onClick={dismiss}
            className="rounded-full p-1.5 transition-colors hover:bg-[var(--color-surface-2)]"
            aria-label={t("student.onboarding.skip")}
          >
            <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
          </DialogClose>
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface-2))",
                border: "1.5px solid color-mix(in oklab, var(--color-brand) 24%, transparent)"
              }}
              aria-hidden="true"
            >
              <Play className="h-6 w-6" style={{ color: "var(--color-brand)" }} />
            </div>

            {/* Heading */}
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                {t("student.onboarding.welcomeTitle", { name: user.fullName.split(" ")[0] })}
              </h2>
              <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {t("student.onboarding.welcomeSubtitle")}
              </p>
            </div>

            {/* Access checklist */}
            <ul className="space-y-2.5" aria-label={t("student.onboarding.whatYouGetLabel")}>
              {[
                t("student.onboarding.benefit1"),
                t("student.onboarding.benefit2"),
                t("student.onboarding.benefit3")
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-brand) 14%, var(--color-surface-2))",
                      color: "var(--color-brand)"
                    }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => setStep(1)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)", color: "var(--color-brand-text)" }}
            >
              {t("student.onboarding.next")}
              <ArrowRight className="icon-dir h-4 w-4" aria-hidden="true" />
            </button>

            <button
              onClick={dismiss}
              className="w-full text-center text-sm transition-colors hover:underline"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("student.onboarding.skip")}
            </button>
          </div>
        )}

        {/* Step 1 — Platform overview */}
        {step === 1 && (
          <div className="px-6 pb-6 pt-4 space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {t("student.onboarding.overviewTitle")}
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("student.onboarding.overviewSubtitle")}
              </p>
            </div>

            {/* Feature list — numbered, not cards */}
            <ol className="space-y-4" aria-label={t("student.onboarding.featuresLabel")}>
              {features.map(({ icon: Icon, label, detail }, i) => (
                <li key={label} className="flex items-start gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums mt-0.5"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-brand) 10%, var(--color-surface-2))",
                      color: "var(--color-brand)"
                    }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {label}
                    </p>
                    <p className="text-xs leading-5 mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {detail}
                    </p>
                  </div>
                  <Icon className="h-4 w-4 shrink-0 mt-1 ms-auto" style={{ color: "var(--color-brand)" }} aria-hidden="true" />
                </li>
              ))}
            </ol>

            {/* CTA */}
            <Link
              to={lessonPath || coursePath}
              onClick={dismiss}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold no-underline transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)", color: "var(--color-brand-text)" }}
            >
              {t("student.onboarding.startLearning")}
              <ArrowRight className="icon-dir h-4 w-4" aria-hidden="true" />
            </Link>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setStep(0)}
                className="text-sm transition-colors hover:underline inline-flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="icon-dir h-4 w-4" aria-hidden="true" />
                {t("student.onboarding.back")}
              </button>
              <button
                onClick={dismiss}
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("student.onboarding.skip")}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
