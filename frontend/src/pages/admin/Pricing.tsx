import { useState } from "react";
import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
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
import { api, queryClient } from "@/lib/api";

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

const fieldClass = "mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-brand-600/30";
const fieldStyle = {
  backgroundColor: "var(--color-surface-2)",
  borderColor: "var(--color-border-strong)",
  color: "var(--color-text-primary)"
};

const labelClass = "text-xs font-semibold uppercase tracking-wide";
const labelStyle = { color: "var(--color-text-muted)" };

const CouponStatsPopover = ({ coupon }: { coupon: Coupon }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const statsCopy = {
    usageStats: isAr ? "إحصاءات الاستخدام" : "Usage stats",
    used: isAr ? "المستخدم" : "Used",
    remaining: isAr ? "المتبقي" : "Remaining",
    revenue: isAr ? "الإيراد" : "Revenue",
    expiry: isAr ? "الانتهاء" : "Expiry",
    noExpiry: isAr ? "بدون انتهاء" : "No expiry",
    unlimited: isAr ? "غير محدود" : "Unlimited"
  };
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate
  });
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  return (
    <div className="relative">
      <button
        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
        ref={refs.setReference}
        type="button"
        {...getReferenceProps({ onClick: () => setOpen((v) => !v) })}
      >
        {statsCopy.usageStats}
      </button>
      {open ? (
        <div
          className="z-30 w-72 rounded-[24px] border p-4 shadow-elevated"
          ref={refs.setFloating}
          style={{ ...floatingStyles, backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)" }}
          {...getFloatingProps()}
        >
          <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{coupon.code}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
            {[
              { label: statsCopy.used, value: String(coupon.usesCount) },
              { label: statsCopy.remaining, value: coupon.maxUses === null ? statsCopy.unlimited : String(Math.max(coupon.maxUses - coupon.usesCount, 0)) },
              { label: statsCopy.revenue, value: `${(coupon.revenueGenerated / 100).toFixed(2)} EGP` },
              { label: statsCopy.expiry, value: coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : statsCopy.noExpiry }
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-2)" }}>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.label}</p>
                <p className="mt-1 font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AdminPricing = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const copy = {
    usageStats: isAr ? "إحصاءات الاستخدام" : "Usage stats",
    used: isAr ? "المستخدم" : "Used",
    remaining: isAr ? "المتبقي" : "Remaining",
    revenue: isAr ? "الإيراد" : "Revenue",
    expiry: isAr ? "الانتهاء" : "Expiry",
    noExpiry: isAr ? "بدون انتهاء" : "No expiry",
    unlimited: isAr ? "غير محدود" : "Unlimited",
    unablePrice: isAr ? "تعذّر تحديث السعر الآن." : "Unable to update price right now.",
    unableCoupon: isAr ? "تعذّر حفظ تغييرات القسيمة." : "Unable to save coupon changes.",
    unablePackage: isAr ? "تعذّر حفظ تغييرات الباقة." : "Unable to save package changes.",
    lastUpdated: isAr ? "آخر تحديث" : "Last updated",
    never: isAr ? "أبدًا" : "never",
    newPrice: isAr ? "السعر الجديد (EGP)" : "New price (EGP)",
    saving: isAr ? "جارٍ الحفظ..." : "Saving...",
    savePrice: isAr ? "حفظ السعر" : "Save price",
    packagesTitle: isAr ? "باقات الكورس" : "Course packages",
    packagesBody: isAr ? "هذه الباقات تظهر في صفحة التسعير والدفع. الطالب يدفع سعر الباقة التي يختارها." : "These packages appear on pricing and checkout. Students pay the selected package amount.",
    active: isAr ? "مفعلة" : "Active",
    packageId: isAr ? "معرّف الباقة" : "package-id",
    titleEn: isAr ? "العنوان بالإنجليزية" : "Title EN",
    titleAr: isAr ? "العنوان بالعربية" : "Title AR",
    priceEgp: isAr ? "السعر بالجنيه" : "Price EGP",
    descriptionEn: isAr ? "الوصف بالإنجليزية" : "Description EN",
    descriptionAr: isAr ? "الوصف بالعربية" : "Description AR",
    addPackage: isAr ? "إضافة باقة" : "Add package",
    couponBody: isAr ? "خصومات بالنسبة المئوية أو بالمبلغ الثابت مع حد استخدام أو تاريخ انتهاء اختياري." : "Percentage or fixed discounts with optional limits and expiry.",
    cancelEdit: isAr ? "إلغاء التعديل" : "Cancel edit",
    code: isAr ? "الكود" : "Code",
    discountValue: isAr ? "قيمة الخصم" : "Discount value",
    discountType: isAr ? "نوع الخصم" : "Discount type",
    percentage: isAr ? "نسبة مئوية (%)" : "Percentage (%)",
    fixed: isAr ? "مبلغ ثابت" : "Fixed amount",
    maxUses: isAr ? "أقصى عدد استخدامات (فارغ = غير محدود)" : "Max uses (blank = unlimited)",
    expiryFull: isAr ? "تاريخ الانتهاء (اختياري)" : "Expiry date (optional)",
    updateCoupon: isAr ? "تحديث القسيمة" : "Update coupon",
    createCoupon: isAr ? "إنشاء القسيمة" : "Create coupon",
    inventoryBody: isAr ? "الإيراد هنا يعكس المدفوعات المكتملة المرتبطة بكل قسيمة." : "Revenue reflects completed payments tied to each coupon.",
    uses: isAr ? "الاستخدامات" : "Uses",
    off: isAr ? "خصم" : "off",
    edit: isAr ? "تعديل" : "Edit",
    delete: isAr ? "حذف" : "Delete",
    noCoupons: isAr ? "لا توجد قسائم بعد" : "No coupons yet",
    noCouponsDesc: isAr ? "أنشئ أول قسيمة لتجربة سيناريوهات الخصم داخل الدفع." : "Create the first coupon to test checkout discount scenarios.",
    deleteTitle: isAr ? "حذف القسيمة؟" : "Delete coupon?",
    deleteBody: isAr ? "سيتم إيقاف القسيمة للطلبات الجديدة، لكن سجل المدفوعات الحالي سيبقى كما هو." : "will stop working for new checkouts. Existing payment history stays intact.",
    cancel: isAr ? "إلغاء" : "Cancel"
  };
  const [priceInput, setPriceInput] = useState("");
  const [draft, setDraft] = useState<CouponDraft>(initialDraft);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(initialPackageDraft);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pricingQuery = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const response = await api.get<{
        priceEgp: number;
        pricePiasters: number;
        currency: string;
        updatedAt: string;
        packages: CoursePackage[];
      }>("/admin/pricing");
      return response.data;
    }
  });

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const response = await api.get<{ coupons: Coupon[] }>("/admin/coupons");
      return response.data.coupons;
    }
  });

  const pricingMutation = useMutation({
    mutationFn: async (priceEgp: number) => api.patch("/admin/pricing", { priceEgp }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-pricing"] }); }
  });

  const createPackageMutation = useMutation({
    mutationFn: async (payload: PackageDraft) =>
      api.post("/admin/pricing/packages", {
        id: payload.id || undefined,
        titleEn: payload.titleEn,
        titleAr: payload.titleAr,
        descriptionEn: payload.descriptionEn || null,
        descriptionAr: payload.descriptionAr || null,
        priceEgp: Number(payload.priceEgp || 0),
        sortOrder: Number(payload.sortOrder || 0),
        isActive: true
      }),
    onSuccess: async () => {
      setPackageDraft(initialPackageDraft);
      await queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
    }
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CoursePackage> & { priceEgp?: number } }) =>
      api.patch(`/admin/pricing/packages/${id}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
    }
  });

  const createCouponMutation = useMutation({
    mutationFn: async (payload: CouponDraft) =>
      api.post("/admin/coupons", {
        code: payload.code,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        maxUses: payload.maxUses ? Number(payload.maxUses) : null,
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate).toISOString() : null
      }),
    onSuccess: async () => {
      setDraft(initialDraft);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });

  const updateCouponMutation = useMutation({
    mutationFn: async (payload: CouponDraft) =>
      api.patch(`/admin/coupons/${editingCoupon!.id}`, {
        maxUses: payload.maxUses ? Number(payload.maxUses) : null,
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate).toISOString() : null
      }),
    onSuccess: async () => {
      setEditingCoupon(null);
      setDraft(initialDraft);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => api.delete(`/admin/coupons/${couponId}`),
    onSuccess: async () => {
      setDeletingCoupon(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });

  const handlePriceSubmit = async () => {
    setErrorMessage(null);
    try {
      await pricingMutation.mutateAsync(Number(priceInput || pricingQuery.data?.priceEgp || 0));
    } catch {
      setErrorMessage(copy.unablePrice);
    }
  };

  const handleCouponSubmit = async () => {
    setErrorMessage(null);
    try {
      if (editingCoupon) {
        await updateCouponMutation.mutateAsync(draft);
      } else {
        await createCouponMutation.mutateAsync(draft);
      }
    } catch {
      setErrorMessage(copy.unableCoupon);
    }
  };

  const handlePackageCreate = async () => {
    setErrorMessage(null);
    try {
      await createPackageMutation.mutateAsync(packageDraft);
    } catch {
      setErrorMessage(copy.unablePackage);
    }
  };

  return (
    <AdminShell
      title={t("admin.pricing.title")}
      description={t("admin.pricing.desc")}
    >
      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">

        {/* Price card */}
        <div className="dashboard-panel dashboard-panel--accent p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.pricing.coursePrice")}</p>
          {pricingQuery.isLoading ? (
            <Skeleton className="mt-4 h-32 w-full rounded-xl" />
          ) : (
            <>
              <p className="mt-3 font-display text-4xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {pricingQuery.data?.priceEgp ?? 0} EGP
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {copy.lastUpdated} {pricingQuery.data?.updatedAt ? new Date(pricingQuery.data.updatedAt).toLocaleString() : copy.never}
              </p>
              <div className="mt-5">
                <label className={labelClass} style={labelStyle} htmlFor="price-egp">{copy.newPrice}</label>
                <input
                  id="price-egp"
                  className={fieldClass}
                  style={fieldStyle}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="1000"
                  value={priceInput}
                  type="number"
                  min="0"
                />
              </div>
              <button
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
                disabled={pricingMutation.isPending}
                onClick={() => void handlePriceSubmit()}
                type="button"
              >
                {pricingMutation.isPending ? copy.saving : copy.savePrice}
              </button>
            </>
          )}
        </div>

        <div className="space-y-5">
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{copy.packagesTitle}</p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {copy.packagesBody}
            </p>

            <div className="mt-5 grid gap-3">
              {pricingQuery.data?.packages?.map((coursePackage) => (
                <div key={coursePackage.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_140px_120px]" style={{ borderColor: "var(--color-border)", background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 95%, white), color-mix(in oklab, var(--color-surface-2) 88%, transparent))" }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{coursePackage.titleEn}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{coursePackage.titleAr}</p>
                  </div>
                  <input
                    className={fieldClass}
                    defaultValue={coursePackage.priceEgp}
                    min="1"
                    onBlur={(event) => {
                      const nextPrice = Number(event.target.value);
                      if (Number.isFinite(nextPrice) && nextPrice > 0 && nextPrice !== coursePackage.priceEgp) {
                        updatePackageMutation.mutate({ id: coursePackage.id, payload: { priceEgp: nextPrice } });
                      }
                    }}
                    style={fieldStyle}
                    type="number"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    <input
                      checked={coursePackage.isActive}
                      onChange={(event) => updatePackageMutation.mutate({ id: coursePackage.id, payload: { isActive: event.target.checked } })}
                      type="checkbox"
                    />
                    {copy.active}
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2" style={{ borderColor: "var(--color-border)" }}>
              <input className={fieldClass} style={fieldStyle} placeholder={copy.packageId} value={packageDraft.id} onChange={(e) => setPackageDraft((d) => ({ ...d, id: e.target.value }))} />
              <input className={fieldClass} style={fieldStyle} placeholder={copy.titleEn} value={packageDraft.titleEn} onChange={(e) => setPackageDraft((d) => ({ ...d, titleEn: e.target.value }))} />
              <input className={fieldClass} style={fieldStyle} placeholder={copy.titleAr} value={packageDraft.titleAr} onChange={(e) => setPackageDraft((d) => ({ ...d, titleAr: e.target.value }))} />
              <input className={fieldClass} style={fieldStyle} placeholder={copy.priceEgp} type="number" value={packageDraft.priceEgp} onChange={(e) => setPackageDraft((d) => ({ ...d, priceEgp: e.target.value }))} />
              <textarea className={`${fieldClass} sm:col-span-2`} style={fieldStyle} placeholder={copy.descriptionEn} value={packageDraft.descriptionEn} onChange={(e) => setPackageDraft((d) => ({ ...d, descriptionEn: e.target.value }))} />
              <textarea className={`${fieldClass} sm:col-span-2`} style={fieldStyle} placeholder={copy.descriptionAr} value={packageDraft.descriptionAr} onChange={(e) => setPackageDraft((d) => ({ ...d, descriptionAr: e.target.value }))} />
            </div>

            <button
              className="mt-4 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              disabled={createPackageMutation.isPending}
              onClick={() => void handlePackageCreate()}
              type="button"
            >
              {createPackageMutation.isPending ? copy.saving : copy.addPackage}
            </button>
          </div>

          {/* Create / edit coupon */}
          <div className="dashboard-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {editingCoupon ? t("admin.pricing.editCoupon") : t("admin.pricing.createCoupon")}
                </p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {copy.couponBody}
                </p>
              </div>
              {editingCoupon ? (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  onClick={() => { setEditingCoupon(null); setDraft(initialDraft); }}
                  type="button"
                >
                  {copy.cancelEdit}
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-code">{copy.code}</label>
                <input
                  id="coupon-code"
                  className={`${fieldClass} font-mono uppercase`}
                  style={fieldStyle}
                  disabled={Boolean(editingCoupon)}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                  value={draft.code}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-value">{copy.discountValue}</label>
                <input
                  id="coupon-value"
                  className={fieldClass}
                  style={fieldStyle}
                  type="number"
                  min="0"
                  onChange={(e) => setDraft((d) => ({ ...d, discountValue: Number(e.target.value || 0) }))}
                  value={String(draft.discountValue)}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-type">{copy.discountType}</label>
                <select
                  id="coupon-type"
                  className={fieldClass}
                  style={fieldStyle}
                  disabled={Boolean(editingCoupon)}
                  onChange={(e) => setDraft((d) => ({ ...d, discountType: e.target.value as CouponDraft["discountType"] }))}
                  value={draft.discountType}
                >
                  <option value="PERCENTAGE">{copy.percentage}</option>
                  <option value="FIXED">{copy.fixed}</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-max-uses">{copy.maxUses}</label>
                <input
                  id="coupon-max-uses"
                  className={fieldClass}
                  style={fieldStyle}
                  type="number"
                  min="1"
                  onChange={(e) => setDraft((d) => ({ ...d, maxUses: e.target.value }))}
                  placeholder={copy.unlimited}
                  value={draft.maxUses}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle} htmlFor="coupon-expiry">{copy.expiryFull}</label>
                <input
                  id="coupon-expiry"
                  className={fieldClass}
                  style={fieldStyle}
                  type="datetime-local"
                  onChange={(e) => setDraft((d) => ({ ...d, expiryDate: e.target.value }))}
                  value={draft.expiryDate}
                />
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="mt-5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              disabled={createCouponMutation.isPending || updateCouponMutation.isPending}
              onClick={() => void handleCouponSubmit()}
              type="button"
            >
              {editingCoupon ? copy.updateCoupon : copy.createCoupon}
            </button>
          </div>

          {/* Coupon list */}
          <div className="dashboard-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.pricing.couponInventory")}</p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {copy.inventoryBody}
                </p>
              </div>
            </div>

            {couponsQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : couponsQuery.data?.length ? (
              <div className="mt-5 space-y-3">
                {couponsQuery.data.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <p className="font-mono text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{coupon.code}</p>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: coupon.status === "ACTIVE" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                              color: coupon.status === "ACTIVE" ? "rgb(21,128,61)" : "rgb(185,28,28)"
                            }}
                          >
                            {coupon.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% ${copy.off}` : `${coupon.discountValue / 100} EGP ${copy.off}`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-end">
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{copy.uses}</p>
                          <p className="tabular-nums text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {coupon.usesCount}/{coupon.maxUses ?? copy.unlimited}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{copy.revenue}</p>
                          <p className="tabular-nums text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {(coupon.revenueGenerated / 100).toFixed(2)} EGP
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CouponStatsPopover coupon={coupon} />
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setDraft({
                            code: coupon.code,
                            discountType: coupon.discountType,
                            discountValue: coupon.discountValue,
                            maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
                            expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 16) : ""
                          });
                        }}
                        type="button"
                      >
                        {copy.edit}
                      </button>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                        onClick={() => setDeletingCoupon(coupon)}
                        type="button"
                      >
                        {copy.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title={copy.noCoupons} description={copy.noCouponsDesc} />
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(deletingCoupon)} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.deleteTitle}</DialogTitle>
            <DialogDescription>
              {isAr
                ? `سيتم إيقاف القسيمة ${deletingCoupon?.code ?? ""} للطلبات الجديدة، لكن سجل المدفوعات الحالي سيبقى كما هو.`
                : `${deletingCoupon?.code} ${copy.deleteBody}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setDeletingCoupon(null)}
              type="button"
            >
              {copy.cancel}
            </button>
            <button
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700"
              onClick={() => deletingCoupon && void deleteCouponMutation.mutateAsync(deletingCoupon.id)}
              type="button"
            >
              {copy.delete}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
