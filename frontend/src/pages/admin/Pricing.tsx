import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api, queryClient } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  expiryDate: string | null;
  revenueGenerated: number;
  status: "ACTIVE" | "EXPIRED";
};

type CouponDraft = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: string;
  expiryDate: string;
};

type CoursePackage = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  priceEgp: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

type PackageDraft = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceEgp: string;
  sortOrder: string;
};

const initialDraft: CouponDraft = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: 20,
  maxUses: "",
  expiryDate: ""
};

const initialPackageDraft: PackageDraft = {
  id: "",
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  priceEgp: "",
  sortOrder: "3"
};

const fieldClass =
  "mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-brand-600/30";
const fieldStyle = {
  backgroundColor: "var(--color-surface-2)",
  borderColor: "var(--color-border-strong)",
  color: "var(--color-text-primary)"
};
const labelClass = "text-xs font-semibold uppercase tracking-wide";
const labelStyle = { color: "var(--color-text-muted)" };

const CouponStatsPill = ({ coupon, usedLabel }: { coupon: Coupon; usedLabel: string }) => {
  const maxUsesLabel = coupon.maxUses ?? "INF";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}
    >
      {coupon.usesCount}/{maxUsesLabel} {usedLabel}
    </span>
  );
};

export const AdminPricing = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const [draft, setDraft] = useState<CouponDraft>(initialDraft);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(initialPackageDraft);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => api.get<{ coupons: Coupon[] }>("/admin/coupons").then((response) => response.data.coupons)
  });

  const packagesQuery = useQuery({
    queryKey: ["admin-course-packages"],
    queryFn: () => api.get<{ packages: CoursePackage[] }>("/admin/pricing").then((response) => response.data.packages)
  });

  const createCouponMutation = useMutation({
    mutationFn: () =>
      api.post("/admin/coupons", {
        ...draft,
        maxUses: draft.maxUses ? Number(draft.maxUses) : null,
        expiryDate: draft.expiryDate || null
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDraft(initialDraft);
    }
  });

  const savePackageMutation = useMutation({
    mutationFn: () =>
      packageDraft.id
        ? api.patch(`/admin/pricing/packages/${packageDraft.id}`, {
            titleEn: packageDraft.titleEn,
            titleAr: packageDraft.titleAr,
            descriptionEn: packageDraft.descriptionEn,
            descriptionAr: packageDraft.descriptionAr,
            priceEgp: Number(packageDraft.priceEgp),
            sortOrder: Number(packageDraft.sortOrder)
          })
        : api.post("/admin/pricing/packages", {
            titleEn: packageDraft.titleEn,
            titleAr: packageDraft.titleAr,
            descriptionEn: packageDraft.descriptionEn,
            descriptionAr: packageDraft.descriptionAr,
            priceEgp: Number(packageDraft.priceEgp),
            sortOrder: Number(packageDraft.sortOrder)
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-course-packages"] });
      setPackageDialogOpen(false);
      setPackageDraft(initialPackageDraft);
    }
  });

  const coupons = couponsQuery.data ?? [];
  const packages = packagesQuery.data ?? [];
  const activeCoupons = coupons.filter((coupon) => coupon.status === "ACTIVE").length;
  const activePackages = packages.filter((item) => item.isActive).length;

  return (
    <AdminShell title={t("admin.pricing.title")} description={t("admin.pricing.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.pricing.activePackages, value: activePackages, note: copy.pricing.activePackagesNote },
            { label: copy.pricing.activeCoupons, value: activeCoupons, note: copy.pricing.activeCouponsNote },
            {
              label: copy.pricing.couponRevenue,
              value: `${coupons.reduce((sum, coupon) => sum + coupon.revenueGenerated, 0)} ${copy.common.egp}`,
              note: copy.pricing.couponRevenueNote
            },
            { label: copy.pricing.pricingSurfaces, value: copy.pricing.pricingSurfacesValue, note: copy.pricing.pricingSurfacesNote }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            {copy.pricing.operations}
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {copy.pricing.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
            {copy.pricing.desc}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="space-y-5">
            <div className="dashboard-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.pricing.coursePackages}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    {copy.pricing.publicOptions}
                  </h3>
                </div>
                <button
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  onClick={() => {
                    setPackageDraft(initialPackageDraft);
                    setPackageDialogOpen(true);
                  }}
                  type="button"
                >
                  {copy.pricing.newPackage}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {packagesQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[28px]" />)
                ) : packages.length === 0 ? (
                  <EmptyState
                    description={copy.pricing.noPackagesDesc}
                    eyebrow={copy.pricing.coursePackages}
                    icon="PK"
                    title={copy.pricing.noPackages}
                  />
                ) : (
                  packages.map((item) => (
                    <div key={item.id} className="dashboard-panel p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: item.isActive ? "var(--color-success-bg)" : "var(--color-surface-2)",
                                color: item.isActive ? "var(--color-success)" : "var(--color-text-muted)"
                              }}
                            >
                              {item.isActive ? copy.common.active : copy.common.inactive}
                            </span>
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                            >
                              {copy.pricing.sort} {item.sortOrder}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {item.titleEn}
                          </h4>
                          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {item.titleAr}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <p className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                            {item.priceEgp} {item.currency}
                          </p>
                          <button
                            className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                            onClick={() => {
                              setPackageDraft({
                                id: item.id,
                                titleEn: item.titleEn,
                                titleAr: item.titleAr,
                                descriptionEn: item.descriptionEn ?? "",
                                descriptionAr: item.descriptionAr ?? "",
                                priceEgp: String(item.priceEgp),
                                sortOrder: String(item.sortOrder)
                              });
                              setPackageDialogOpen(true);
                            }}
                            type="button"
                          >
                            {copy.common.editPackage}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.pricing.couponPerformance}
              </p>
              <div className="mt-5 space-y-3">
                {couponsQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-[24px]" />)
                ) : coupons.length === 0 ? (
                  <EmptyState
                    description={copy.pricing.noCouponsDesc}
                    eyebrow={copy.pricing.activeCoupons}
                    icon="CP"
                    title={copy.pricing.noCoupons}
                  />
                ) : (
                  coupons.map((coupon) => (
                    <div key={coupon.id} className="dashboard-panel p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: coupon.status === "ACTIVE" ? "var(--color-success-bg)" : "var(--color-surface-2)",
                                color: coupon.status === "ACTIVE" ? "var(--color-success)" : "var(--color-text-muted)"
                              }}
                            >
                              {coupon.status === "ACTIVE" ? copy.common.active : isAr ? "منتهي" : "EXPIRED"}
                            </span>
                            <CouponStatsPill coupon={coupon} usedLabel={copy.common.used} />
                          </div>
                          <h4 className="text-base font-bold tracking-wide" style={{ color: "var(--color-text-primary)" }}>
                            {coupon.code}
                          </h4>
                          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {coupon.discountType === "PERCENTAGE"
                              ? copy.pricing.percentageOff.replace("{{value}}", String(coupon.discountValue))
                              : copy.pricing.fixedOff.replace("{{value}}", String(coupon.discountValue))}
                          </p>
                        </div>
                        <div className={isAr ? "text-start lg:text-left" : "text-start lg:text-right"}>
                          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                            {copy.pricing.revenueGenerated}
                          </p>
                          <p className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                            {coupon.revenueGenerated} {copy.common.egp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-panel p-5 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.common.createCoupon}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.pricing.createCouponTitle}
              </h3>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>{copy.common.code}</label>
              <input className={fieldClass} style={fieldStyle} value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.discountType}</label>
                <select
                  className={fieldClass}
                  style={fieldStyle}
                  value={draft.discountType}
                  onChange={(event) => setDraft({ ...draft, discountType: event.target.value as CouponDraft["discountType"] })}
                >
                  <option value="PERCENTAGE">{copy.pricing.percentage}</option>
                  <option value="FIXED">{copy.pricing.fixed}</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.discountValue}</label>
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  type="number"
                  value={draft.discountValue}
                  onChange={(event) => setDraft({ ...draft, discountValue: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.maxUses}</label>
                <input className={fieldClass} style={fieldStyle} value={draft.maxUses} onChange={(event) => setDraft({ ...draft, maxUses: event.target.value })} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.expiryDate}</label>
                <input className={fieldClass} style={fieldStyle} type="date" value={draft.expiryDate} onChange={(event) => setDraft({ ...draft, expiryDate: event.target.value })} />
              </div>
            </div>

            <button
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
              disabled={createCouponMutation.isPending}
              onClick={() => void createCouponMutation.mutateAsync()}
              type="button"
            >
              {copy.common.createCoupon}
            </button>
          </div>
        </div>
      </section>

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{packageDraft.id ? copy.pricing.editPackage : copy.pricing.createPackage}</DialogTitle>
            <DialogDescription>{copy.pricing.packageDialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {[
              { label: copy.pricing.titleEn, field: "titleEn" as const },
              { label: copy.pricing.titleAr, field: "titleAr" as const }
            ].map(({ label, field }) => (
              <div key={field}>
                <label className={labelClass} style={labelStyle}>{label}</label>
                <input className={fieldClass} style={fieldStyle} value={packageDraft[field]} onChange={(event) => setPackageDraft({ ...packageDraft, [field]: event.target.value })} />
              </div>
            ))}
            {[
              { label: copy.pricing.descriptionEn, field: "descriptionEn" as const },
              { label: copy.pricing.descriptionAr, field: "descriptionAr" as const }
            ].map(({ label, field }) => (
              <div key={field}>
                <label className={labelClass} style={labelStyle}>{label}</label>
                <textarea className={fieldClass} rows={4} style={{ ...fieldStyle, resize: "vertical" }} value={packageDraft[field]} onChange={(event) => setPackageDraft({ ...packageDraft, [field]: event.target.value })} />
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.priceEgp}</label>
                <input className={fieldClass} style={fieldStyle} type="number" value={packageDraft.priceEgp} onChange={(event) => setPackageDraft({ ...packageDraft, priceEgp: event.target.value })} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>{copy.pricing.sortOrder}</label>
                <input className={fieldClass} style={fieldStyle} type="number" value={packageDraft.sortOrder} onChange={(event) => setPackageDraft({ ...packageDraft, sortOrder: event.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              className="rounded-xl border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setPackageDialogOpen(false)}
              type="button"
            >
              {copy.common.cancel}
            </button>
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
              disabled={savePackageMutation.isPending}
              onClick={() => void savePackageMutation.mutateAsync()}
              type="button"
            >
              {copy.common.savePackage}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
