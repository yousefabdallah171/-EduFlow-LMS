# Chaos Testing Scenarios

**Purpose:** Verify system resilience and graceful degradation when external services fail or unexpected conditions occur.

**Approach:** Document expected behavior for each scenario. Tests can be implemented using chaos engineering tools (Chaos Monkey, gremlin, etc.) or manual testing.

---

## Scenario 1: Paymob API Down

**Trigger:** Paymob payment API returns 500 or is unreachable

**Expected Behavior:**
- User can initiate checkout
- API call to Paymob fails with timeout or 500 error
- User receives error message: "Payment service temporarily unavailable. Please try again."
- Retry button shown
- Payment record created with status: PENDING (waiting for retry)
- Background job attempts retry every 30 seconds (max 5 retries)
- Email sent to admin: "Failed payment detected - requires manual review"

**Test Cases:**
```javascript
describe('Chaos: Paymob API Down', () => {
  it('returns user-friendly error when Paymob returns 500', async () => {
    // Mock Paymob: status 500
    // Verify error response contains "PAYMOB_SERVER_ERROR"
    // Verify retry button shown to user
  });

  it('auto-retry in background job', async () => {
    // Payment marked PENDING
    // Background job runs, retries Paymob
    // Max 5 retries over ~2.5 minutes
    // Eventually succeeds or gets marked FAILED
  });

  it('admin alert sent on Paymob failure', async () => {
    // Email sent to admin@example.com
    // Contains order ID and error details
    // Actionable: "Retry payment" or "Issue refund"
  });

  it('webhook still processes if Paymob recovers', async () => {
    // Paymob eventually succeeds
    // Webhook received
    // Payment status updated to COMPLETED
    // Enrollment created
  });
});
```

**Recovery Time:** 2-10 minutes (depending on retry attempts)

---

## Scenario 2: Redis Down

**Trigger:** Redis cache unavailable (connection timeout, service crashed)

**Expected Behavior:**
- System continues functioning (Redis is cache, not required)
- All queries hit database directly (slower performance)
- Logging continues normally
- Payments still process
- Session data falls back to database
- Performance degrades but no user-facing errors

**Test Cases:**
```javascript
describe('Chaos: Redis Down', () => {
  it('system works without Redis cache', async () => {
    // Simulate Redis connection failure
    // POST /api/v1/checkout should still succeed
    // GET /api/v1/student/orders should still work
    // Response time increases (no caching benefit)
  });

  it('logging continues without Redis', async () => {
    // Payment events still logged to database
    // No data loss
    // Logs searchable as usual
  });

  it('session data accessible from database', async () => {
    // User still logged in
    // Session persists
    // No forced logout
  });

  it('performance degrades gracefully', async () => {
    // Normal response: 150ms
    // Without cache: 500-1000ms
    // Still within acceptable range
  });

  it('automatic recovery when Redis comes back', async () => {
    // Cache gradually repopulated
    // Performance returns to normal
    // No manual intervention needed
  });
});
```

**Recovery:** Automatic when Redis restarts (no data loss)

---

## Scenario 3: Database Down

**Trigger:** PostgreSQL connection lost, query timeout, or service crashed

**Expected Behavior:**
- User sees error: "Service temporarily unavailable. Please try again later."
- HTTP 503 Service Unavailable returned
- No stack traces shown
- Alert sent to ops team
- Graceful shutdown (don't accept new requests)
- Health check returns 503

**Test Cases:**
```javascript
describe('Chaos: Database Down', () => {
  it('returns 503 when database unreachable', async () => {
    // Simulate Prisma connection timeout
    // GET /api/v1/student/orders returns 503
    // POST /api/v1/checkout returns 503
  });

  it('graceful error messages shown to user', async () => {
    // No stack trace
    // No SQL error details
    // User-friendly: "Service temporarily unavailable"
  });

  it('health check returns 503', async () => {
    // GET /api/health returns 503 Service Unavailable
    // Load balancer stops routing traffic
  });

  it('ops team alerted immediately', async () => {
    // Email/Slack to on-call engineer
    // Includes error details and timestamp
  });

  it('no data corruption on recovery', async () => {
    // Database comes back online
    // All data consistent
    // No partial writes
  });
});
```

**Recovery:** Requires ops intervention to restart database

**RTO:** 5-30 minutes (ops response time)

---

## Scenario 4: Email Service Down

**Trigger:** Email service unreachable or returns errors

**Expected Behavior:**
- Payment still completes successfully
- Email queued for retry
- User sees success message (email delivery is not blocking)
- Background job retries email delivery (exponential backoff)
- Alert sent to admin about failed emails

**Test Cases:**
```javascript
describe('Chaos: Email Service Down', () => {
  it('payment completes even if email fails', async () => {
    // Mock email service: 500 error
    // POST /api/v1/checkout succeeds (200)
    // Enrollment created
    // Email queued for retry
  });

  it('user sees success message immediately', async () => {
    // Redirect to success page
    // No waiting for email delivery
    // "Your payment confirmed" message shown
  });

  it('email job retried in background', async () => {
    // Failed email queued
    // Retry attempts: immediately, +1min, +5min, +15min, +60min
    // After 5 attempts, marked as failed
  });

  it('admin alert on email failure', async () => {
    // Email to admin@example.com
    // Subject: "Email delivery failed"
    // Lists failed emails with details
  });

  it('admin can manually retry failed emails', async () => {
    // Dashboard shows "Pending Emails"
    // Admin can click "Retry All"
    // Emails resent immediately
  });
});
```

**Recovery:** Automatic with exponential backoff (no user action needed)

---

## Scenario 5: Network Partition

**Trigger:** Student's network connection lost mid-transaction

**Expected Behavior:**
- Payment request times out
- User sees "Timeout" message (don't refresh, payment may still process)
- Student navigates to Payment Pending page
- Paymob webhook eventually arrives (after network recovers)
- System receives webhook and completes payment
- User page auto-redirects to success OR manual refresh shows success

**Test Cases:**
```javascript
describe('Chaos: Network Partition', () => {
  it('handles timeout gracefully', async () => {
    // Student network down during checkout
    // Request times out (10+ seconds)
    // User sees timeout message
    // Suggests: "Payment may still process, check your email"
  });

  it('system recovers when network returns', async () => {
    // Student's network comes back online
    // Webhook was delivered in background
    // Payment status is COMPLETED
    // User's page auto-redirects or shows status when refreshed
  });

  it('prevents duplicate charges during partition', async () => {
    // Student clicks Pay button twice during network issue
    // Both requests eventually reach server
    // Concurrent checkout prevention prevents duplicate charge
  });

  it('user doesnt lose money on partition', async () => {
    // Even if student loses connection
    // Payment either completes or fails completely
    // No partial charges
    // Webhook idempotency prevents double-charging
  });

  it('admin notification for timeout scenarios', async () => {
    // Payment marked PENDING due to timeout
    // Auto-retry or webhook completes it
    // If neither: admin alerted after 15 minutes
  });
});
```

**Recovery:** Automatic when network restored (webhook provides recovery)

---

## Scenario 6: Clock Skew (Time Mismatch)

**Trigger:** System time differs from Paymob server time (±1 hour)

**Expected Behavior:**
- HMAC validation still succeeds (should not depend on timestamp)
- Token expiration still works correctly
- Cache TTLs still valid
- No security issues despite time difference

**Test Cases:**
```javascript
describe('Chaos: Clock Skew', () => {
  it('webhook validation works with clock skew', async () => {
    // System time: UTC 2:00 PM
    // Paymob time: UTC 1:00 PM (1 hour behind)
    // HMAC validation: must NOT depend on timestamp
    // Webhook still processed successfully
  });

  it('token expiration still enforced', async () => {
    // Token exp: 2:30 PM (system time: 2:10 PM)
    // Even with clock skew, expiration enforced
    // Token valid until 2:30 PM system time
  });

  it('cache TTLs still valid', async () => {
    // Cache: TTL 5 minutes
    // Even with system clock wrong, TTL respected
    // Cache expires after ~5 minutes elapsed
  });

  it('session timeouts still enforced', async () => {
    // Session timeout: 24 hours
    // Even with clock skew, enforced correctly
    // User session expires after 24 hours elapsed
  });

  it('no security issues from time difference', async () => {
    // Tokens cannot be forged using time skew
    // HMAC validation time-independent
    // System maintains security integrity
  });
});
```

**Recovery:** Automatic when system time syncs (no action needed)

---

## Running Chaos Tests

### Manual Testing
1. Simulate each scenario manually
2. Document observed behavior
3. Compare to expected behavior
4. File issues if differences found

### Automated Testing (Optional)
- Use chaos engineering tools:
  - **Chaos Monkey** - Kill random services
  - **Gremlin** - Simulate failures
  - **Toxiproxy** - Proxy for network failures
  - **Docker/Kubernetes** - Stop containers

### Monitoring During Chaos
- Monitor logs for errors
- Check user-facing error messages
- Verify admin alerts sent
- Monitor database for data corruption
- Track recovery time

---

## Success Criteria

✅ All 6 scenarios tested and documented
✅ Expected behavior matches actual behavior
✅ No data corruption during failures
✅ User sees appropriate error messages
✅ Recovery is automatic or well-documented
✅ Admin receives necessary alerts
✅ Payment data integrity maintained

---

## Notes

- These scenarios should be tested in **staging environment** first
- Coordinate with ops team before testing
- Monitor production metrics during any production testing
- Document actual recovery times
- Update runbooks based on findings
