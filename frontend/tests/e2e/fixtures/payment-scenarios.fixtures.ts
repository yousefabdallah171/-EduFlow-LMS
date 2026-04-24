/**
 * Payment scenario test fixtures - factory functions for scenario-specific test data
 * Used by E2E scenario tests (happy-path, failure-recovery, timeout-recovery, refund-flow)
 */

import { testUser, testUserArabic, courseData, couponData } from './payment.fixtures';

/**
 * Create a unique student for scenario testing
 * Each scenario gets a fresh user to avoid state conflicts
 */
export const createScenarioUser = (overrides = {}) => ({
  email: `scenario-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
  password: 'ScenarioPass123!',
  fullName: 'Scenario Student',
  ...testUser,
  ...overrides
});

/**
 * Create Arabic locale scenario user
 */
export const createScenarioUserArabic = (overrides = {}) => ({
  email: `scenario-ar-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
  password: 'ScenarioPass123!',
  fullName: 'الطالب السيناريو',
  ...testUserArabic,
  ...overrides
});

/**
 * Create package/course data for scenarios
 */
export const createScenarioPackage = (overrides = {}) => ({
  id: `package-${Date.now()}`,
  title: 'Scenario Course',
  description: 'Test course for scenario',
  priceEgp: 1000,
  currency: 'EGP' as const,
  ...courseData,
  ...overrides
});

/**
 * Create valid coupon for happy path scenario
 */
export const createValidCoupon = (overrides = {}) => ({
  code: `SCENARIO${Date.now()}`,
  valid: true,
  discountType: 'PERCENTAGE' as const,
  discountValue: 20,
  originalAmountEgp: 1000,
  discountedAmountEgp: 800,
  ...couponData.valid,
  ...overrides
});

/**
 * Create expired coupon for failure scenario
 */
export const createExpiredCoupon = (overrides = {}) => ({
  code: `EXPIRED${Date.now()}`,
  ...couponData.expired,
  ...overrides
});

/**
 * Create payment success response (Paymob mock)
 */
export const createPaymobSuccessResponse = (orderId = 'order-' + Date.now(), overrides = {}) => ({
  status: 200,
  body: JSON.stringify({
    paymentKey: `paymob-key-${Date.now()}`,
    iframeRedirectUrl: `https://paymob.example.com/iframe/${Date.now()}`,
    ...overrides
  })
});

/**
 * Create payment failure response (Paymob mock)
 */
export const createPaymobFailureResponse = (error = 'CARD_DECLINED', overrides = {}) => ({
  status: 402,
  body: JSON.stringify({
    error: true,
    message: error,
    ...overrides
  })
});

/**
 * Create payment timeout (Paymob takes > 10 seconds)
 */
export const createPaymobTimeoutResponse = () => ({
  timeout: true,
  delayMs: 15000
});

/**
 * Create webhook success payload
 */
export const createWebhookSuccessPayload = (orderId: string, overrides = {}) => ({
  id: `webhook-${Date.now()}`,
  orderId,
  status: 'success',
  amount: 800,
  currency: 'EGP',
  ...overrides
});

/**
 * Create webhook failure payload
 */
export const createWebhookFailurePayload = (orderId: string, error = 'CARD_DECLINED', overrides = {}) => ({
  id: `webhook-${Date.now()}`,
  orderId,
  status: 'failure',
  error,
  ...overrides
});

/**
 * Create refund payload
 */
export const createRefundPayload = (orderId: string, amount?: number, overrides = {}) => ({
  orderId,
  amount: amount || 800,
  refundType: 'FULL' as const,
  reason: 'User requested',
  ...overrides
});

/**
 * Payment history response mock
 */
export const createPaymentHistoryResponse = (orders: any[] = [], overrides = {}) => ({
  status: 200,
  body: JSON.stringify({
    orders,
    total: orders.length,
    ...overrides
  })
});

/**
 * Student enrollment status response
 */
export const createEnrollmentStatusResponse = (status = 'active', overrides = {}) => ({
  status: 200,
  body: JSON.stringify({
    enrollmentStatus: status,
    courseId: 'course-1',
    enrolledAt: new Date().toISOString(),
    ...overrides
  })
});

/**
 * Checkout status response mock
 */
export const createCheckoutStatusResponse = (orderId: string, status = 'COMPLETED', overrides = {}) => ({
  status: 200,
  body: JSON.stringify({
    id: orderId,
    status,
    amount: 800,
    currency: 'EGP',
    createdAt: new Date().toISOString(),
    completedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
    ...overrides
  })
});

/**
 * Helper to generate unique order IDs
 */
export const generateOrderId = () => `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Helper to generate unique student emails
 */
export const generateStudentEmail = () =>
  `student-${Date.now()}-${Math.random().toString(36).substring(7)}@test.local`;
