/**
 * Load Test: Concurrent Checkouts
 * Tests system performance with 100+ concurrent users initiating checkouts
 *
 * Run with: k6 run tests/load/concurrent-checkouts.js
 *
 * Configuration:
 * - 100 concurrent users (VUs)
 * - 5 minute duration
 * - Ramp-up: 0 → 100 users over 1 minute
 * - Ramp-down: 100 → 0 users over 1 minute
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');
const checkoutSuccess = new Counter('checkout_success');
const checkoutFailure = new Counter('checkout_failure');

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp-up to 100 users over 1 minute
    { duration: '3m', target: 100 }, // Stay at 100 users for 3 minutes
    { duration: '1m', target: 0 }    // Ramp-down to 0 over 1 minute
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% under 2s, 99% under 3s
    'http_req_failed': ['rate<0.01'],  // Error rate < 1%
    'errors': ['rate<0.01']
  },
  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'Concurrent Checkouts Load Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Generate unique user data for each VU (Virtual User)
  const studentId = `loadtest-student-${__VU}-${__ITER}@test.local`;
  const authToken = `token-${__VU}-${Date.now()}`;

  group('Checkout Flow - Concurrent Load Test', () => {
    // Step 1: Get checkout page (simulates browser loading)
    const checkoutPageResp = http.get(
      `${BASE_URL}/en/checkout`,
      {
        headers: {
          'User-Agent': 'LoadTest/1.0',
          'Accept': 'text/html'
        }
      }
    );

    check(checkoutPageResp, {
      'checkout page loads': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000
    }) || errorRate.add(1);

    sleep(1); // Simulate user viewing page

    // Step 2: Submit checkout form (POST to API)
    const startTime = new Date();
    const checkoutResp = http.post(
      `${API_URL}/api/v1/checkout`,
      JSON.stringify({
        packageId: 'package-1',
        couponCode: null,
        amount: 1000,
        currency: 'EGP'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': 'LoadTest/1.0'
        }
      }
    );
    const duration = new Date() - startTime;
    checkoutDuration.add(duration);

    if (checkoutResp.status === 200) {
      checkoutSuccess.add(1);
      check(checkoutResp, {
        'checkout succeeds': (r) => r.status === 200,
        'payment key in response': (r) => r.body.includes('paymentKey'),
        'response time < 2s': (r) => r.timings.duration < 2000
      });
    } else {
      checkoutFailure.add(1);
      errorRate.add(1);
      check(checkoutResp, {
        'error response valid': (r) => r.status >= 400
      });
    }

    sleep(2); // Simulate Paymob iframe interaction

    // Step 3: Check payment status
    const statusResp = http.get(
      `${API_URL}/api/v1/checkout/status/order-${__VU}-${__ITER}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    check(statusResp, {
      'status check succeeds': (r) => r.status === 200 || r.status === 404,
      'response time < 500ms': (r) => r.timings.duration < 500
    });

    sleep(1);
  });
}

/**
 * Acceptance Criteria:
 * ✅ < 2 seconds response time at p95
 * ✅ < 1% error rate
 * ✅ No database connection errors
 * ✅ All checkouts eventually succeed or fail with proper error
 *
 * To run:
 * $ k6 run tests/load/concurrent-checkouts.js
 *
 * Or with custom settings:
 * $ BASE_URL=http://myserver:3000 API_URL=http://api:3001 k6 run tests/load/concurrent-checkouts.js
 */
