/**
 * Payment flow test fixtures and mock data
 */

export const testUser = {
  id: "student-1",
  email: "student@example.com",
  password: "Securepass123",
  fullName: "Student One",
  role: "STUDENT",
  locale: "en",
  theme: "light",
  avatarUrl: null
};

export const testUserArabic = {
  id: "student-ar-1",
  email: "student-ar@example.com",
  password: "Securepass123",
  fullName: "الطالب الأول",
  role: "STUDENT",
  locale: "ar",
  theme: "light",
  avatarUrl: null
};

export const courseData = {
  priceEgp: 1000,
  currency: "EGP",
  title: "Complete Course",
  description: "Full course with all modules",
  modules: 10
};

export const paymentOrders = {
  successful: {
    id: "order-success-123",
    amountEgp: 800,
    currency: "EGP",
    status: "COMPLETED" as const,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  },
  failed: {
    id: "order-fail-456",
    amountEgp: 1000,
    currency: "EGP",
    status: "FAILED" as const,
    createdAt: new Date().toISOString(),
    errorCode: "PAYMOB_DECLINED",
    errorMessage: "Card was declined"
  },
  pending: {
    id: "order-pending-789",
    amountEgp: 1000,
    currency: "EGP",
    status: "PENDING" as const,
    createdAt: new Date().toISOString()
  },
  cancelled: {
    id: "order-cancelled-000",
    amountEgp: 1200,
    currency: "EGP",
    status: "CANCELLED" as const,
    createdAt: new Date().toISOString()
  }
};

export const couponData = {
  valid: {
    code: "SAVE20",
    valid: true,
    discountType: "PERCENTAGE" as const,
    discountValue: 20,
    originalAmountEgp: 1000,
    discountedAmountEgp: 800
  },
  expired: {
    code: "EXPIRED20",
    valid: false,
    errorCode: "COUPON_EXPIRED",
    errorMessage: "This coupon has expired"
  },
  limitReached: {
    code: "LIMITED99",
    valid: false,
    errorCode: "COUPON_LIMIT_REACHED",
    errorMessage: "This coupon has reached its usage limit"
  },
  invalid: {
    code: "INVALID999",
    valid: false,
    errorCode: "COUPON_NOT_FOUND",
    errorMessage: "Coupon code not found"
  }
};

export const checkoutResponses = {
  success: {
    paymentKey: "paymob-token-12345",
    orderId: "order-success-123",
    amount: 80000,
    currency: "EGP",
    discountApplied: 20000,
    iframeId: "12345"
  },
  pending: {
    paymentKey: "pending-token",
    orderId: "order-pending-789",
    amount: 100000,
    currency: "EGP"
  },
  alreadyEnrolled: {
    error: "ALREADY_ENROLLED",
    message: "You are already enrolled in this course"
  },
  invalidCoupon: {
    error: "INVALID_COUPON",
    message: "Coupon code is not valid"
  },
  serverError: {
    error: "SERVER_ERROR",
    message: "Temporary server error. Please try again."
  }
};

export const paymentHistoryData = {
  orders: [
    {
      id: "order-history-1",
      amountEgp: 1000,
      currency: "EGP",
      status: "COMPLETED" as const,
      createdAt: new Date("2026-04-20").toISOString()
    },
    {
      id: "order-history-2",
      amountEgp: 800,
      currency: "EGP",
      status: "COMPLETED" as const,
      createdAt: new Date("2026-04-15").toISOString()
    },
    {
      id: "order-history-3",
      amountEgp: 1200,
      currency: "EGP",
      status: "PENDING" as const,
      createdAt: new Date("2026-04-10").toISOString()
    },
    {
      id: "order-history-4",
      amountEgp: 500,
      currency: "EGP",
      status: "FAILED" as const,
      createdAt: new Date("2026-04-05").toISOString()
    },
    {
      id: "order-history-5",
      amountEgp: 2000,
      currency: "EGP",
      status: "COMPLETED" as const,
      createdAt: new Date("2026-03-28").toISOString()
    }
  ]
};

export const errorMessages = {
  PAYMOB_DECLINED: {
    title: "Card Declined",
    message: "Your card was declined. Please try with a different payment method.",
    suggestion: "Check your card details and try again, or use a different card."
  },
  PAYMOB_TIMEOUT: {
    title: "Payment Timeout",
    message: "The payment process took too long to complete.",
    suggestion: "Please try again or contact support if the issue persists."
  },
  ALREADY_ENROLLED: {
    title: "Already Enrolled",
    message: "You are already enrolled in this course.",
    suggestion: "You can access the course from your dashboard."
  },
  INVALID_COUPON: {
    title: "Invalid Coupon",
    message: "The coupon code is not valid or has expired.",
    suggestion: "Check the coupon code and try again."
  },
  SERVER_ERROR: {
    title: "Server Error",
    message: "An unexpected error occurred on our servers.",
    suggestion: "Please try again in a few moments, or contact support."
  }
};

export const urls = {
  login: (locale: string = "en") => `/en/login`,
  checkout: (locale: string = "en") => `/${locale}/checkout`,
  paymentPending: (locale: string = "en", orderId: string) => `/${locale}/payment-pending?orderId=${orderId}`,
  paymentSuccess: (locale: string = "en", orderId: string) => `/${locale}/payment-success?orderId=${orderId}`,
  paymentFailure: (locale: string = "en", orderId: string, error?: string) =>
    `/${locale}/payment-failure?orderId=${orderId}${error ? `&error=${error}` : ""}`,
  paymentHistory: (locale: string = "en") => `/${locale}/payment-history`,
  dashboard: (locale: string = "en") => `/${locale}/dashboard`
};

/**
 * Helper to create mock auth response
 */
export function createAuthResponse(user = testUser) {
  return {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    user
  };
}

/**
 * Helper to create mock payment status response
 */
export function createPaymentStatusResponse(
  orderId: string,
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" = "PENDING"
) {
  return {
    id: orderId,
    status,
    amount: 100000,
    currency: "EGP",
    createdAt: new Date().toISOString(),
    ...(status === "COMPLETED" && { completedAt: new Date().toISOString() }),
    ...(status === "FAILED" && {
      errorCode: "PAYMOB_DECLINED",
      errorMessage: "Card was declined"
    })
  };
}

/**
 * Helper to create mock course response
 */
export function createCourseResponse(override = {}) {
  return {
    ...courseData,
    ...override
  };
}

/**
 * Helper to create mock enrollment response
 */
export function createEnrollmentResponse(enrolled = false) {
  return { enrolled };
}
