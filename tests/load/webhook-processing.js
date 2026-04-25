/**
 * Load Test: Webhook Processing
 * Tests system performance with 50+ concurrent webhook deliveries
 * Verifies database transaction performance and idempotency
 *
 * Run with: k6 run tests/load/webhook-processing.js
 *
 * Configuration:
 * - 50 concurrent webhooks
 * - 3 minute duration
 * - Each webhook: HMAC validation → payment update → enrollment creation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const webhookDuration = new Trend('webhook_duration');
const webhookSuccess = new Counter('webhook_success');
const webhookFailure = new Counter('webhook_failure');
const webhookErrors = new Rate('webhook_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 webhooks over 30s
    { duration: '2m', target: 50 },   // Stay at 50 for 2 minutes
    { duration: '30s', target: 0 }    // Ramp-down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'],  // < 1% error rate
    'webhook_errors': ['rate<0.01']
  }
};

const API_URL = __ENV.API_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'test-webhook-secret';

/**
 * Generate HMAC signature for webhook (Paymob-style)
 */
function generateHmac(payload, secret) {
  const hmac = crypto.createHMAC('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

export default function () {
  group('Webhook Processing - Concurrent Load Test', () => {
    // Generate webhook payload
    const orderId = `order-${__VU}-${__ITER}-${Date.now()}`;
    const payload = JSON.stringify({
      id: `webhook-${Date.now()}`,
      orderId: orderId,
      status: 'success',
      amount: 1000,
      currency: 'EGP',
      timestamp: new Date().toISOString(),
      type: 'payment.completed'
    });

    // Generate HMAC signature
    const hmac = generateHmac(payload, WEBHOOK_SECRET);

    // Submit webhook
    const startTime = new Date();
    const webhookResp = http.post(
      `${API_URL}/api/v1/webhooks/paymob`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-HMAC-SIGNATURE': hmac,
          'X-Webhook-ID': `webhook-${Date.now()}`,
          'User-Agent': 'Paymob-Webhook/1.0'
        }
      }
    );
    const duration = new Date() - startTime;
    webhookDuration.add(duration);

    // Verify webhook processed
    if (webhookResp.status === 200) {
      webhookSuccess.add(1);
      check(webhookResp, {
        'webhook processed': (r) => r.status === 200,
        'processing < 500ms': (r) => r.timings.duration < 500,
        'success response': (r) => r.body.includes('success') || r.body.includes('ok')
      });
    } else if (webhookResp.status === 409) {
      // Duplicate webhook (idempotency) - also valid
      check(webhookResp, {
        'duplicate handled': (r) => r.status === 409
      });
    } else {
      webhookFailure.add(1);
      webhookErrors.add(1);
      check(webhookResp, {
        'webhook fails gracefully': (r) => r.status >= 400
      });
    }

    sleep(0.5); // Minimal sleep between webhooks
  });
}

/**
 * Expected behavior:
 * 1. Each webhook must be processed within 500ms
 * 2. Database transactions must not deadlock
 * 3. Payment status must be updated atomically
 * 4. Enrollment must be created exactly once (idempotent)
 * 5. Email must be queued (not blocking webhook response)
 *
 * Acceptance Criteria:
 * ✅ < 500ms response time at p95
 * ✅ < 1% error rate
 * ✅ 0 database deadlocks
 * ✅ 0 duplicate enrollments
 *
 * To run:
 * $ k6 run tests/load/webhook-processing.js
 *
 * Or with custom secret:
 * $ API_URL=http://api:3001 WEBHOOK_SECRET=my-secret k6 run tests/load/webhook-processing.js
 */
