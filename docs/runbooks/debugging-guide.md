# Payment System Debugging Guide

## Local Development Debugging

### Enable Debug Logging

```bash
# Start app with debug logging
LOG_LEVEL=debug npm run dev

# Or in .env
LOG_LEVEL=debug
```

### View Logs in Real-Time

```bash
# All logs
tail -f logs/combined.log | jq '.'

# Error logs only
tail -f logs/error.log | jq '.'

# Payment-specific logs
tail -f logs/combined.log | grep "payment\|Payment"

# Webhook logs
tail -f logs/combined.log | grep "webhook\|Webhook"
```

### Filter Logs by Payment ID

```bash
# View all logs for specific payment
grep "payment-id-123" logs/combined.log | jq '.'

# Watch for new logs
tail -f logs/combined.log | grep "payment-id-123"
```

### Browser DevTools Debugging

**Frontend Payment Flow:**

1. Open DevTools (F12)
2. Go to Console tab
3. Access debug helper:
   ```javascript
   // View current payment state
   window.__debugPayment.getCurrentPayment()
   
   // View all logs
   window.__debugPayment.logs
   
   // Add custom log
   window.__debugPayment.addLog("my event", { data: 1 })
   
   // Simulate success
   window.__debugPayment.simulateSuccess()
   
   // Simulate failure
   window.__debugPayment.simulateFailure()
   ```

4. Export logs:
   ```javascript
   // Save to file
   fetch('/dev/logs/export', {
     method: 'POST',
     body: JSON.stringify(window.__debugPayment.logs)
   })
   ```

### Backend API Debugging

**Test Payment Creation:**

```bash
# 1. Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"Pass123!"}' | jq -r '.token')

# 2. Create checkout
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "pkg-123",
    "couponCode": "SAVE10"
  }' | jq '.'

# 3. Check payment status
PAYMENT_ID="pay-123"
curl http://localhost:3000/dev/payments/$PAYMENT_ID | jq '.'
```

### Database Debugging

**Check Payment State:**

```bash
# PostgreSQL connection
psql $DATABASE_URL

# View payment details
SELECT id, student_id, status, amount, created_at 
FROM payments 
WHERE id = 'pay-123';

# View all pending payments
SELECT id, student_id, status, created_at, error_code 
FROM payments 
WHERE status = 'WEBHOOK_PENDING' 
ORDER BY created_at DESC;

# Check enrollment
SELECT * FROM enrollments WHERE student_id = 'student-123';

# Check coupon usage
SELECT code, max_uses, uses, expires_at 
FROM coupons 
WHERE code = 'SAVE10';
```

### Mock Paymob Webhooks

**Simulate Success Webhook:**

```bash
# Get payment ID from dev endpoint
PAYMENT_ID=$(curl http://localhost:3000/dev/payments | jq -r '.[0].id')

# Trigger success webhook
curl -X POST http://localhost:3000/dev/payments/$PAYMENT_ID/webhook/success

# Check payment is now COMPLETED
curl http://localhost:3000/dev/payments/$PAYMENT_ID | jq '.status'
```

**Simulate Failure Webhook:**

```bash
# Trigger failure webhook
curl -X POST http://localhost:3000/dev/payments/$PAYMENT_ID/webhook/failure

# Check payment is now FAILED
curl http://localhost:3000/dev/payments/$PAYMENT_ID | jq '.status'
```

### Redis Debugging

**Check Redis Connection:**

```bash
# Test Redis
redis-cli ping

# View all keys
redis-cli KEYS '*'

# Get cache value
redis-cli GET "payment:pay-123"

# Clear all cache
redis-cli FLUSHALL

# Monitor Redis in real-time
redis-cli MONITOR
```

### Network Debugging

**Check Paymob Connectivity:**

```bash
# Test Paymob API (requires valid API key)
curl -X POST https://accept.paymobsolutions.com/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"api_key": "'$PAYMOB_API_KEY'"}'

# Check webhook delivery status
# Go to Paymob Dashboard → API → Webhooks → View delivery status
```

**Network Tracing:**

```bash
# Capture network traffic
tcpdump -i lo -A 'tcp port 3000'

# Or use Wireshark for GUI
wireshark

# Monitor HTTP requests (during npm start)
# Use Network tab in DevTools
```

### Email Debugging

**Check Email Queue:**

```bash
curl http://localhost:3000/dev/email/queue | jq '.'
```

**Resend Failed Email:**

```bash
curl -X POST http://localhost:3000/dev/email/resend/<email_id>
```

**Test Email Configuration:**

```bash
# Verify SMTP connection
node -e "
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
  transport.verify((err, ok) => {
    console.log('SMTP:', err ? 'FAILED: ' + err : 'OK');
  });
"
```

### Performance Debugging

**Find Slow Queries:**

```bash
# In PostgreSQL
SET log_min_duration_statement = 1000; -- Log queries > 1s

# View slow logs
tail -f logs/combined.log | grep "duration_ms"

# Top slow operations
grep "duration_ms" logs/combined.log | jq '.duration_ms' | sort -nr | head -20
```

**Check Memory Usage:**

```bash
# Monitor Node.js heap
node --inspect app.js

# Then open chrome://inspect in Chrome browser
```

**Profile CPU Usage:**

```bash
# Start with profiling
node --prof app.js

# After running tests, analyze profile
node --prof-process isolate-*.log > profile-results.txt
```

### Test Runner Debugging

**Run Tests with Debug Output:**

```bash
# Unit tests with debug
LOG_LEVEL=debug npm run test:unit

# Integration tests with debug
LOG_LEVEL=debug npm run test:integration

# E2E tests with headed browser (see what happens)
npm run test:e2e -- --headed

# E2E tests with debug output
npm run test:e2e -- --debug
```

**Inspect Test Failures:**

```bash
# Run single test
npm test -- payment.test.ts

# Run specific test case
npm test -- --grep "should create payment"

# Run with verbose output
npm test -- --reporter=verbose
```

### Common Debug Patterns

**Search for Errors:**

```bash
# All errors in today's logs
grep "ERROR\|error" logs/combined.log | tail -100

# Errors for specific payment
grep "pay-123" logs/combined.log | grep -i "error"

# Errors by type
grep "CARD_DECLINED\|TIMEOUT\|NETWORK" logs/combined.log | jq '.errorCode' | sort | uniq -c
```

**Trace Request Flow:**

```bash
# Follow single request by request ID
REQUEST_ID="req-abc-123"
grep $REQUEST_ID logs/combined.log | jq '{time: .timestamp, message: .message, duration: .duration_ms}'
```

**Find Performance Regressions:**

```bash
# Checkout endpoint latency over time
grep "POST.*checkout" logs/combined.log | jq '.duration_ms' | awk '{sum+=$1; count++} END {print "Avg:", sum/count "ms"}'

# Top 10 slowest requests
grep "duration_ms" logs/combined.log | jq '.duration_ms' | sort -nr | head -10
```

### Debugging Checklist

When debugging a payment issue:

- [ ] Check error logs for specific error code
- [ ] Find payment ID in database
- [ ] Trace request through logs (grep payment_id)
- [ ] Check if webhook was received
- [ ] Verify HMAC signature validation
- [ ] Check database state (payment + enrollment tables)
- [ ] Check email queue (if email-related)
- [ ] Verify Paymob connectivity
- [ ] Check system time (clock skew)
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Reproduce in dev environment
- [ ] Add more debug logging if needed
- [ ] Run relevant tests to ensure fix works

### Related Docs
- [Payment Issues Guide](./payment-issues.md)
- [Incident Response](./incident-response.md)
