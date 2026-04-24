# Payment Issues Troubleshooting Guide

## Common Payment Problems & Solutions

---

## Issue 1: Payment Stuck in WEBHOOK_PENDING

**Symptom:** Payment created but webhook not received after 10+ minutes

**Detection:**
```bash
# Check for pending payments older than 10 minutes
curl http://localhost:3000/dev/payments | jq '.[] | select(.status == "WEBHOOK_PENDING" and (.createdAt < now - 600s))'

# Or via logs
grep "WEBHOOK_PENDING" logs/combined.log | grep -v "resolved"
```

**Diagnosis:**
```bash
# Check if Paymob webhook was sent
grep "paymob.*webhook" logs/combined.log | grep <payment_id>

# Check if webhook validation failed
grep "HMAC.*failed\|webhook.*invalid" logs/combined.log

# Check admin alerts for error
grep "WEBHOOK_TIMEOUT_ALERT" logs/error.log
```

**Solutions:**

1. **Webhook not received (network issue)**
   - Wait 10-15 minutes (Paymob retries for up to 15 mins)
   - If still pending after 15 mins:
     ```bash
     # Manually trigger webhook processing
     curl -X POST http://localhost:3000/dev/payments/<payment_id>/webhook/success
     ```

2. **Webhook received but validation failed**
   - Check HMAC secret in .env matches Paymob settings
   - Verify Paymob webhook URL is correct
   - Check server logs for HMAC validation errors

3. **Student hasn't received confirmation email**
   - Email system may be down
   - Check email queue: `curl http://localhost:3000/dev/email/queue`
   - Manually resend: `curl -X POST http://localhost:3000/dev/email/resend/<email_id>`

**Prevention:**
- Monitor Paymob webhook delivery status in Paymob dashboard
- Set up alerts for payments > 10 min in WEBHOOK_PENDING status
- Ensure webhook URL is whitelisted in Paymob

---

## Issue 2: Payment Declined (Card Declined)

**Symptom:** User gets error "Card declined" or "Payment failed"

**Detection:**
```bash
grep "CARD_DECLINED\|payment.*failed" logs/combined.log
```

**Diagnosis:**
```bash
# Check payment details
curl http://localhost:3000/dev/payments | jq '.[] | select(.errorCode == "CARD_DECLINED")'

# Check Paymob response
grep "Paymob.*response\|paymob.*error" logs/combined.log | grep <payment_id>
```

**Solutions:**

1. **User should retry with different card** (most common)
   - Checkout page shows retry button
   - System automatically retries up to 3 times with exponential backoff

2. **Card is blocked/flagged**
   - User should contact their bank
   - May need to enable international transactions or online purchases

3. **Test environment issue**
   - If in development: Use test card `4111111111111111`
   - Verify Paymob is in sandbox mode

**Prevention:**
- Use Paymob test cards in development
- Test card validation before showing Paymob form
- Ensure SSL/HTTPS is working (some card issuers block non-HTTPS)

---

## Issue 3: Payment Charged But No Enrollment

**Symptom:** Payment shows COMPLETED but student not enrolled in course

**Detection:**
```bash
# Find payment without corresponding enrollment
curl http://localhost:3000/dev/payments | jq '.[] | select(.status == "COMPLETED" and .enrollmentId == null)'
```

**Diagnosis:**
```bash
# Check enrollment service response
grep "enrollment.*error\|enrollment.*failed" logs/combined.log | grep <payment_id>

# Check if webhook processed successfully
grep "webhook.*success\|payment.*updated" logs/combined.log | grep <payment_id>
```

**Solutions:**

1. **Enrollment service temporarily down**
   - Enrollment queue automatically retries
   - Wait 5 minutes for automatic retry
   - Manually trigger:
     ```bash
     curl -X POST http://localhost:3000/dev/payments/<payment_id>/enroll
     ```

2. **Student already enrolled**
   - System prevents duplicate enrollments
   - Payment is valid, no action needed

3. **Database connection issue during enrollment**
   - Check database logs for connection errors
   - Restart database connection pool

**Prevention:**
- Monitor enrollment service health
- Set up alerts for payments without enrollments after 5 minutes
- Ensure database connection pool is sized correctly

---

## Issue 4: Coupon Not Applied or Expired

**Symptom:** User says coupon isn't working or expired message shown

**Detection:**
```bash
grep "COUPON_EXPIRED\|COUPON_INVALID" logs/combined.log
```

**Diagnosis:**
```bash
# Check coupon details
curl http://localhost:3000/api/v1/checkout/validate-coupon?code=<coupon_code>

# Check coupon in database
psql $DATABASE_URL -c "SELECT * FROM coupons WHERE code = '<code>';"
```

**Solutions:**

1. **Coupon expired**
   - Check expiry date: `SELECT expires_at FROM coupons WHERE code = '<code>';`
   - If expired, extend with: `UPDATE coupons SET expires_at = NOW() + INTERVAL '7 days' WHERE code = '<code>';`

2. **Coupon limit reached**
   - Check usage: `SELECT max_uses, uses FROM coupons WHERE code = '<code>';`
   - If limit reached, increase: `UPDATE coupons SET max_uses = max_uses + 100 WHERE code = '<code>';`

3. **Coupon code typo**
   - Verify code spelling exactly
   - Codes are case-sensitive

4. **Coupon not applicable to package**
   - Check package eligibility
   - Some coupons only work for specific packages

**Prevention:**
- Email reminder to admins before coupon expiry
- Show expiry date in admin dashboard
- Log all coupon validations with request ID

---

## Issue 5: Webhook Signature Invalid

**Symptom:** Webhook received but returns 403 "Invalid signature"

**Detection:**
```bash
grep "HMAC.*validation\|signature.*invalid" logs/combined.log
```

**Diagnosis:**
```bash
# Check HMAC secret
echo $PAYMOB_WEBHOOK_SECRET

# Verify against Paymob settings
# Go to Paymob Dashboard → Settings → Webhooks → Check secret
```

**Solutions:**

1. **HMAC secret mismatch**
   - Get correct secret from Paymob webhook settings
   - Update .env: `PAYMOB_WEBHOOK_SECRET=<correct_secret>`
   - Restart application

2. **Clock skew between servers**
   - System handles ±5 minute clock skew
   - Sync server time if > 5 minutes off
   - Run: `ntpdate -s time.nist.gov`

3. **Webhook URL misconfigured**
   - Verify Paymob points to: `https://yourdomain.com/api/v1/webhooks/paymob`
   - Check HTTPS is enabled and certificate valid

**Prevention:**
- Store webhook secret in .env, not hardcoded
- Rotate webhook secret quarterly
- Monitor webhook signature validation failures

---

## Issue 6: High Latency on Checkout Page

**Symptom:** Checkout page takes >3 seconds to load

**Detection:**
```bash
# Check performance logs
grep "POST.*checkout\|GET.*checkout" logs/combined.log | jq '.duration_ms'
```

**Diagnosis:**
```bash
# Check database performance
EXPLAIN ANALYZE
SELECT * FROM packages WHERE id = '<package_id>';

# Check Redis connectivity
redis-cli ping

# Check Paymob auth token generation latency
grep "Paymob.*auth\|paymob.*token" logs/combined.log | jq '.duration_ms'
```

**Solutions:**

1. **Database query slow**
   - Add indexes: `CREATE INDEX idx_packages_id ON packages(id);`
   - Check for N+1 queries
   - Use query caching

2. **Redis down (cache unavailable)**
   - System continues without cache but slower
   - Restart Redis: `redis-cli shutdown && redis-server`
   - Performance returns to normal once Redis up

3. **Paymob auth slow**
   - Cache auth token for 55 minutes (expires at 60)
   - Reduce calls to Paymob auth endpoint

4. **Network latency to Paymob**
   - May be geographic distance
   - Use CDN for static assets
   - Implement local caching strategy

**Prevention:**
- Monitor checkout endpoint performance
- Set up alerts if p95 latency > 2 seconds
- Run load tests monthly to catch regressions

---

## Issue 7: Duplicate Enrollments

**Symptom:** Student enrolled twice in same course

**Detection:**
```bash
# Check for duplicate enrollments
psql $DATABASE_URL -c "
  SELECT student_id, course_id, COUNT(*) FROM enrollments 
  GROUP BY student_id, course_id 
  HAVING COUNT(*) > 1;
"
```

**Diagnosis:**
```bash
# Check if webhook processed twice
grep "webhook.*processed\|enrollment.*created" logs/combined.log | grep <student_id> | grep <course_id>

# Check payment status
curl http://localhost:3000/dev/payments | jq '.[] | select(.studentId == "<student_id>")'
```

**Solutions:**

1. **Webhook processed twice (idempotency key failed)**
   - System should prevent this with idempotency
   - Check idempotency key in webhook handler
   - Manually fix: `DELETE FROM enrollments WHERE id = (SELECT id FROM enrollments WHERE student_id = '<id>' ORDER BY created_at DESC LIMIT 1);`

2. **User clicked checkout twice**
   - System should prevent concurrent checkouts
   - If occurred: Remove duplicate enrollment

3. **Admin manually enrolled + payment processed**
   - Check admin audit log
   - Clarify process with team

**Prevention:**
- Enforce idempotency keys on all webhooks
- Block concurrent checkouts for same user
- Log all enrollment events with source (webhook/manual/API)

---

## Quick Diagnostic Commands

```bash
# View all pending payments
curl http://localhost:3000/dev/payments | jq '.[] | select(.status == "PENDING")'

# View all failed payments
curl http://localhost:3000/dev/payments | jq '.[] | select(.status == "FAILED")'

# Search logs by payment ID
grep "<payment_id>" logs/combined.log | jq '.'

# Search logs by request ID
grep "<request_id>" logs/combined.log | jq '.'

# View recent errors
tail -50 logs/error.log | jq '.'

# Check alert emails sent
grep "ALERT_EMAIL_SENT" logs/error.log

# Monitor in real-time
tail -f logs/combined.log | grep "payment\|webhook\|error"
```

---

## Escalation Contacts

- **Engineering Team:** engineering@eduflow.com
- **On-Call Engineer:** Check PagerDuty schedule
- **Paymob Support:** support@paymob.com
- **Database Admin:** dba@eduflow.com
- **Security Team:** security@eduflow.com

---

## Related Docs
- [Debugging Guide](./debugging-guide.md)
- [Incident Response](./incident-response.md)
- [Performance Monitoring](./monitoring.md)
