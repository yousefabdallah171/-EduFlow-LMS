import { useState } from "react";
import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";

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

const initialDraft: CouponDraft = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: 20,
  maxUses: "",
  expiryDate: ""
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
        Usage stats
      </button>
      {open ? (
        <div
          className="z-30 w-72 rounded-2xl border p-4 shadow-elevated"
          ref={refs.setFloating}
          style={{ ...floatingStyles, backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)" }}
          {...getFloatingProps()}
        >
          <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{coupon.code}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
            {[
              { label: "Used",      value: String(coupon.usesCount) },
              { label: "Remaining", value: coupon.maxUses === null ? "∞" : String(Math.max(coupon.maxUses - coupon.usesCount, 0)) },
              { label: "Revenue",   value: `${(coupon.revenueGenerated / 100).toFixed(2)} EGP` },
              { label: "Expiry",    value: coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "No expiry" }
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
  const [priceInput, setPriceInput] = useState("");
  const [draft, setDraft] = useState<CouponDraft>(initialDraft);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pricingQuery = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const response = await api.get<{ priceEgp: number; pricePiasters: number; currency: string; updatedAt: string }>("/admin/pricing");
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
      setErrorMessage("Unable to update price right now.");
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
      setErrorMessage("Unable to save coupon changes.");
    }
  };

  return (
    <AdminShell
      title="Pricing and coupons"
      description="Manage course pricing, create limited promos, and monitor how each coupon converts into paid enrollments."
    >
      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">

        {/* Price card */}
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Course price</p>
          {pricingQuery.isLoading ? (
            <Skeleton className="mt-4 h-32 w-full rounded-xl" />
          ) : (
            <>
              <p className="mt-3 text-4xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {pricingQuery.data?.priceEgp ?? 0} EGP
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Last updated {pricingQuery.data?.updatedAt ? new Date(pricingQuery.data.updatedAt).toLocaleString() : "never"}
              </p>
              <div className="mt-5">
                <label className={labelClass} style={labelStyle} htmlFor="price-egp">New price (EGP)</label>
                <input
                  id="price-egp"
                  className={fieldClass}
                  style={fieldStyle}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="499"
                  value={priceInput}
                  type="number"
                  min="0"
                />
              </div>
              <button
                className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
                disabled={pricingMutation.isPending}
                onClick={() => void handlePriceSubmit()}
                type="button"
              >
                {pricingMutation.isPending ? "Saving…" : "Save price"}
              </button>
            </>
          )}
        </div>

        <div className="space-y-5">
          {/* Create / edit coupon */}
          <div
            className="rounded-2xl border p-5 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  {editingCoupon ? "Edit coupon" : "Create coupon"}
                </p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Percentage or fixed discounts with optional limits and expiry.
                </p>
              </div>
              {editingCoupon ? (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  onClick={() => { setEditingCoupon(null); setDraft(initialDraft); }}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-code">Code</label>
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
                <label className={labelClass} style={labelStyle} htmlFor="coupon-value">Discount value</label>
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
                <label className={labelClass} style={labelStyle} htmlFor="coupon-type">Discount type</label>
                <select
                  id="coupon-type"
                  className={fieldClass}
                  style={fieldStyle}
                  disabled={Boolean(editingCoupon)}
                  onChange={(e) => setDraft((d) => ({ ...d, discountType: e.target.value as CouponDraft["discountType"] }))}
                  value={draft.discountType}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor="coupon-max-uses">Max uses (blank = unlimited)</label>
                <input
                  id="coupon-max-uses"
                  className={fieldClass}
                  style={fieldStyle}
                  type="number"
                  min="1"
                  onChange={(e) => setDraft((d) => ({ ...d, maxUses: e.target.value }))}
                  placeholder="Unlimited"
                  value={draft.maxUses}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle} htmlFor="coupon-expiry">Expiry date (optional)</label>
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
              className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
              disabled={createCouponMutation.isPending || updateCouponMutation.isPending}
              onClick={() => void handleCouponSubmit()}
              type="button"
            >
              {editingCoupon ? "Update coupon" : "Create coupon"}
            </button>
          </div>

          {/* Coupon list */}
          <div
            className="rounded-2xl border p-5 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Coupon inventory</p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Revenue reflects completed payments tied to each coupon.
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
                          {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% off` : `${coupon.discountValue / 100} EGP off`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-end">
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Uses</p>
                          <p className="tabular-nums text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {coupon.usesCount}/{coupon.maxUses ?? "∞"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Revenue</p>
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
                        Edit
                      </button>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                        onClick={() => setDeletingCoupon(coupon)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="No coupons yet" description="Create the first coupon to test checkout discount scenarios." />
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(deletingCoupon)} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon?</DialogTitle>
            <DialogDescription>
              {deletingCoupon?.code} will stop working for new checkouts. Existing payment history stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setDeletingCoupon(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700"
              onClick={() => deletingCoupon && void deleteCouponMutation.mutateAsync(deletingCoupon.id)}
              type="button"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
