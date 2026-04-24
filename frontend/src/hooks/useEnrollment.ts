import { useMutation, useQuery } from "@tanstack/react-query";

import { demoEnrollment, isDemoMode } from "@/lib/demo";
import { api } from "@/lib/api";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryInvalidation } from "./useQueryInvalidation";

type EnrollmentStatus = {
  enrolled: boolean;
  status?: "ACTIVE" | "REVOKED" | "EXPIRED";
  enrollmentType?: "PAID" | "ADMIN_ENROLLED";
  enrolledAt?: string;
};

type CouponValidationResponse =
  | {
      valid: true;
      discountType: "PERCENTAGE" | "FIXED";
      discountValue: number;
      originalAmountEgp: number;
      discountedAmountEgp: number;
    }
  | {
      valid: false;
      reason: string;
    };

type CheckoutResponse = {
  paymentKey: string;
  orderId: string;
  amount: number;
  currency: string;
  discountApplied: number;
  iframeId: string;
};

export const useEnrollment = () => {
  const { user, accessToken } = useAuthStore();
  const demo = isDemoMode();
  const canFetchEnrollment = demo || Boolean(accessToken && user?.role === "STUDENT");
  const { invalidateAfterEnrollment } = useQueryInvalidation();

  const statusQuery = useQuery({
    queryKey: ["enrollment-status"],
    enabled: canFetchEnrollment,
    queryFn: async () => {
      if (demo) {
        return demoEnrollment;
      }
      const response = await api.get<EnrollmentStatus>("/enrollment");
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
    gcTime: getGCTime(CACHE_TIME.SHORT)
  });

  const validateCoupon = useMutation({
    mutationFn: async ({ couponCode, packageId }: { couponCode: string; packageId?: string }) => {
      if (!canFetchEnrollment) {
        throw new Error("Please log in as a student to apply a coupon.");
      }
      if (demo) {
        return {
          valid: true as const,
          discountType: "PERCENTAGE" as const,
          discountValue: 20,
          originalAmountEgp: 1000,
          discountedAmountEgp: 800
        };
      }
      const response = await api.post<CouponValidationResponse>("/checkout/validate-coupon", { couponCode, packageId });
      return response.data;
    }
  });

  const checkout = useMutation({
    mutationFn: async (payload?: { couponCode?: string; packageId?: string }) => {
      if (!canFetchEnrollment) {
        throw new Error("Please log in as a student to continue checkout.");
      }
      if (demo) {
        return {
          paymentKey: "demo-payment-key",
          orderId: "demo-order-1",
          amount: 80_000,
          currency: "EGP",
          discountApplied: 20_000,
          iframeId: "12345"
        };
      }
      const response = await api.post<CheckoutResponse>("/checkout", payload ?? {});
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterEnrollment();
    }
  });

  return {
    statusQuery,
    validateCoupon,
    checkout
  };
};
