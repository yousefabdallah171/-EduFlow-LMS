# Email Alert System - Quick Reference Guide

**Version:** 1.0  
**Date:** April 24, 2026  
**Alert Email:** yoseabdallah866@gmail.com  
**Purpose:** Automated error detection & notification system  

---

## What It Does

When errors occur in the payment system, you automatically receive an email with:

1. **Error Summary**
   - What happened (error title)
   - How severe (CRITICAL, WARNING, ERROR)
   - How many errors (count)
   - When it happened (timestamp)
   - Which error codes (e.g., PAYMOB_API_ERROR)

2. **Log File Attachment**
   - Complete error logs from the time period
   - Searchable plain text file
   - Easy to download and analyze
   - Named: `error-logs-{timestamp}.log`

3. **Beautiful HTML Email**
   - Color-coded by severity (red for CRITICAL, orange for ERROR, yellow for WARNING)
   - Quick scan view
   - All information in one place
   - Links to admin dashboard (if needed)

---

## How It Works

### 1. Error Tracking
Every error is logged automatically:
```
Error occurs → Error logged with code → Aggregator tracks it
```

### 2. Threshold Checking (Every 5 Minutes)
System checks if errors exceed threshold:
```
If errors in last 5 minutes > 5 → TRIGGER ALERT
If specific error code appears 3+ times → TRIGGER ALERT
If webhook not arriving for 10 minutes → TRIGGER ALERT
If Paymob API down → TRIGGER ALERT
```

### 3. Email Generation & Send
When threshold hit:
```
Collect all errors from time period
↓
Get last 100 log lines from error.log
↓
Create beautiful HTML email
↓
Attach log file
↓
Send to yoseabdallah866@gmail.com
↓
Clear error aggregator (prevent spam)
```

---

## Alert Types & Examples

### CRITICAL (Red Alert)
**When:** > 5 errors in 5 minutes OR Paymob completely down OR Database down

Example subject: `[CRITICAL] Payment System - High Error Rate (12 errors in 5 mins)`

What to do:
1. Check email attachment for error logs
2. Read the error codes
3. Go to admin dashboard
4. Check payment status
5. May need to contact Paymob support if their API is down

### ERROR (Orange Alert)
**When:** 3-5 errors in 5 minutes OR key service failing

Example subject: `[ERROR] Payment System - Webhook Processing Failures (5 errors in 5 mins)`

What to do:
1. Review the error logs
2. Check if pattern (e.g., all enrollment failures)
3. May auto-recover

### WARNING (Yellow Alert)
**When:** Unusual patterns or approaching thresholds

Example subject: `[WARNING] Payment System - Elevated Error Rate (3 errors in 5 mins)`

What to do:
1. Monitor next email
2. Check logs if interested
3. Usually temporary

---

## Configuration

### Default Settings
```
Error Threshold: 5 errors
Check Interval: Every 5 minutes
Time Window: Look back 5 minutes
Alert Email: yoseabdallah866@gmail.com
Attach Logs: Yes (up to 100 lines)
```

### Configurable
- Error threshold (default: 5)
- Check interval (default: 5 minutes)
- Alert email address
- Which error codes to alert on
- Include attachments (yes/no)
- Max log lines in attachment
- Pause/resume alerts temporarily

---

## What Errors Trigger Alerts

### Payment System Errors
- `PAYMOB_API_ERROR` - Paymob API is down or returning errors
- `PAYMOB_AUTH_FAILED` - Authentication with Paymob failed
- `PAYMOB_TIMEOUT` - Paymob API slow or timed out
- `PAYMOB_RATE_LIMITED` - Paymob rate limiting us
- `CHECKOUT_FAILED` - Student checkout failed
- `WEBHOOK_PROCESSING_ERROR` - Webhook handling failed
- `ENROLLMENT_FAILED` - Student enrollment failed after payment
- `EMAIL_FAILED` - Email notification failed
- `DATABASE_ERROR` - Database connection or query failed
- `REDIS_ERROR` - Cache system down
- `PAYMENT_RECONCILIATION_MISMATCH` - Local vs Paymob mismatch

### Network Errors
- `NETWORK_TIMEOUT` - API call timed out
- `CONNECTION_REFUSED` - Can't connect to service
- `DNS_LOOKUP_ERROR` - DNS resolution failed

### Paymob-Specific Errors
- `CARD_DECLINED` - Payment declined (high volume may trigger)
- `INVALID_CARD` - Invalid card number
- `EXPIRED_CARD` - Card expired

---

## Email Contents Explained

### Email Header
```
🚨 Title: Payment System - High Error Rate (5 errors in 5 mins)
Severity: [colored box] CRITICAL
```

### Details Section
```
Timestamp: 2026-04-24T10:30:00Z
Error Count: 5
Time Range: 2026-04-24T10:25:00Z to 2026-04-24T10:30:00Z
Error Codes: WEBHOOK_PROCESSING_ERROR, ENROLLMENT_FAILED, EMAIL_FAILED
```

### Description Section
```
5 webhook processing failures detected in last 5 minutes. 
Check attached logs for details.
```

### Attachment Info
```
Log file attached: error-logs-1703419800000.log
(Download and open in text editor or email)
```

---

## What To Do When You Get An Email

### Step 1: Read the Email (1 minute)
- Check severity (red, orange, yellow?)
- Check error code
- Check time range

### Step 2: Download Logs (1 minute)
- Click attachment link
- Save file to computer
- Or view directly in email

### Step 3: Analyze Logs (5-10 minutes)
Open log file in text editor:
```
[2026-04-24T10:25:30Z] WEBHOOK_PROCESSING_ERROR - payment_xxx failed
[2026-04-24T10:26:15Z] ENROLLMENT_FAILED - Could not create enrollment for user_xxx
[2026-04-24T10:27:02Z] EMAIL_FAILED - SMTP timeout sending to student@example.com
[2026-04-24T10:28:45Z] WEBHOOK_PROCESSING_ERROR - Duplicate webhook detected
[2026-04-24T10:29:31Z] DATABASE_ERROR - Connection lost to PostgreSQL
```

### Step 4: Take Action
Based on error type:

**If PAYMOB errors:**
- Check Paymob status page (https://status.paymob.com)
- Contact Paymob support if down for > 30 minutes

**If DATABASE errors:**
- Check database connection
- Restart if needed
- Contact DevOps

**If EMAIL_FAILED:**
- Check SMTP credentials
- Verify Gmail app password (if using Gmail)
- Check email service status

**If ENROLLMENT_FAILED:**
- Check logs for which students failed
- May need manual enrollment
- Use admin dashboard to manually mark paid

**If WEBHOOK errors:**
- Check if Paymob webhook delivery is working
- Verify webhook endpoint is accessible
- Check firewall rules

---

## Quick Commands to Check Status

### Check if system is having issues
```bash
# SSH into server
ssh user@server

# View live error logs
tail -f logs/error.log | grep "CRITICAL\|ALERT"

# Count errors in last hour
grep "$(date -d '1 hour ago' +%H:%M)" logs/error.log | wc -l

# See all error codes
grep "error_code" logs/error.log | jq '.error_code' | sort | uniq -c
```

### Check Paymob status
```bash
# Test Paymob API
curl -X POST https://accept.paymob.com/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_KEY"}'

# Should return: {"token": "..."}
```

### Check Admin Dashboard
Login to admin dashboard:
1. Go to /admin/payments
2. Filter by status "FAILED"
3. Look at recent failures
4. Check error messages

---

## Alert Frequency

### You Will Receive
- **CRITICAL alerts:** Immediately when > 5 errors
- **ERROR alerts:** When 3-5 errors occur
- **WARNING alerts:** When 1-2 errors occur (optional)
- **Daily summary:** (optional) All errors that day

### You Will NOT Receive
- Alert for every single error (batched to prevent spam)
- Alerts for single expected errors (requires threshold)
- Alerts when paused (during maintenance)

---

## Troubleshooting Email Alerts

### "I'm not getting emails"

1. Check email address in .env:
   ```bash
   grep ALERT_EMAIL .env
   # Should show: ALERT_EMAIL=yoseabdallah866@gmail.com
   ```

2. Check SMTP is configured:
   ```bash
   grep SMTP .env
   # Should show SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
   ```

3. Test SMTP connection:
   ```bash
   npm run test:smtp
   ```

4. Check email was sent:
   ```bash
   grep "Alert email sent" logs/combined.log
   ```

5. Check email spam folder (Gmail)

### "Emails are too frequent"

Adjust error threshold in admin dashboard:
1. Go to /admin/alert-settings
2. Increase ERROR_THRESHOLD from 5 to 10
3. Save

Or pause alerts temporarily:
```bash
curl -X POST /api/v1/admin/alert-settings/pause -d '{"pauseMinutes": 60}'
```

### "Attachment is too large"

Admin can configure max log lines:
1. Go to /admin/alert-settings
2. Set MAX_LOG_LINES_IN_ATTACHMENT to smaller number (e.g., 50)
3. Save

---

## Integration with Other Systems

The email alert system works with:

✅ **Sentry** - Errors also sent to Sentry dashboard  
✅ **Prometheus** - Metrics also collected  
✅ **Admin Dashboard** - Can pause/resume from there  
✅ **Logging System** - Errors logged to files  
✅ **Monitoring Alerts** - Works with monitoring tools  

---

## Support

If email alerts not working:

1. **Check logs:**
   ```bash
   grep "ALERT" logs/error.log | tail -20
   grep "email\|SMTP" logs/combined.log | tail -20
   ```

2. **Test manually:**
   ```bash
   npm run test:alert-email
   ```

3. **Check configuration:**
   ```bash
   curl http://localhost:3000/api/v1/admin/alert-settings
   ```

4. **Contact Support:**
   - For Paymob issues: Paymob support team
   - For system issues: DevOps team
   - For email issues: Check Gmail/email provider

---

## Summary

✅ **Automatic Error Detection** - You don't need to monitor logs constantly  
✅ **Email Notifications** - Get alerted when issues happen  
✅ **Log Attachments** - Full context in email attachment  
✅ **Configurable Thresholds** - Adjust sensitivity to your needs  
✅ **Beautiful Emails** - Easy to read and understand  
✅ **Fast Detection** - Alerts sent within minutes of issue  

---

**Last Updated:** April 24, 2026  
**Next Review:** Before Production Deployment  

