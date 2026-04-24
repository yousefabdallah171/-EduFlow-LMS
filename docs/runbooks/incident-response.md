# Incident Response Guide

## Overview

This guide provides step-by-step procedures for responding to payment system incidents.

---

## On-Call Responsibilities

**Duty:** Respond to alerts and production issues within **15 minutes**

**Escalation Path:**
1. On-call engineer (you)
2. Senior engineer (if not resolved in 30 min)
3. Engineering manager (if not resolved in 1 hour)
4. CTO (if customer impact)

---

## Incident Severity Levels

### **P1 - Critical (Immediate Action)**
- Complete payment system down
- No payments processing
- All users affected
- SLA: Acknowledge within 5 min, resolve within 30 min

**Response:** Wake up manager, begin debugging immediately

### **P2 - High (Urgent)**
- Partial payment failures (10-50% of payments failing)
- Some users affected
- SLA: Acknowledge within 15 min, resolve within 2 hours

**Response:** Start investigation, keep manager updated

### **P3 - Medium (Normal)**
- Isolated payment failures (< 10%)
- Few users affected
- SLA: Acknowledge within 1 hour, resolve within 4 hours

**Response:** Log ticket, investigate during work hours

### **P4 - Low (Minor)**
- Performance degradation
- Non-blocking issues
- SLA: Resolve within 24 hours

**Response:** Schedule for next engineering review

---

## Incident Detection

**Alert Sources:**
1. Sentry error tracking
2. PagerDuty incidents
3. Custom error rate alerts
4. Customer reports (via support)
5. Monitoring dashboards

**Key Metrics to Watch:**
- Error rate > 5% of transactions
- Payment processing latency > 5 seconds
- Webhook delivery delays > 15 minutes
- Database connection pool exhausted
- Memory usage > 90%

---

## Initial Response (First 5 Minutes)

### Step 1: Acknowledge Alert
```bash
# Mark as acknowledged in PagerDuty
# This pauses escalation for 30 min

# Notify channel
# Post in #incidents: "Investigating payment system alert"
```

### Step 2: Assess Severity
```bash
# Check error rate
curl http://localhost:3000/dev/metrics | jq '.errorRate'

# Check payment status distribution
curl http://localhost:3000/dev/payments | jq '[.[] | .status] | group_by(.) | map({status: .[0], count: length})'

# Check system health
curl http://localhost:3000/api/health
```

### Step 3: Initial Mitigation (if P1)
- For total outage: Consider graceful degradation
- For Paymob issues: Use fallback payment method (if available)
- For database issues: Restart connection pool
- For memory leaks: Restart application

---

## Debugging Incidents

### What to Check (in order)

**1. Application Logs (30 seconds)**
```bash
tail -50 logs/error.log | jq '.'
tail -50 logs/combined.log | grep "error\|Error\|ERROR"
```

**2. System Health (1 minute)**
```bash
# CPU/Memory/Disk
df -h
top -b -n 1 | head -20

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;" && echo "DB OK"

# Redis connectivity
redis-cli ping && echo "Redis OK"

# Paymob API
curl -s https://accept.paymobsolutions.com/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"api_key": "'$PAYMOB_API_KEY'"}' | jq '.response_code' && echo "Paymob OK"
```

**3. Error Pattern Analysis (2 minutes)**
```bash
# Count errors by type
grep "ERROR\|error" logs/combined.log | jq '.errorCode' | sort | uniq -c | sort -rn

# Check for cascading failures
grep "TIMEOUT\|SERVICE_UNAVAILABLE\|CONNECTION" logs/error.log | wc -l

# Find error spike timestamp
grep "ERROR" logs/combined.log | jq '.timestamp' | sort | uniq -c
```

**4. Recent Changes (1 minute)**
```bash
# Check recent deployments
git log --oneline -10

# Check if any services were restarted
ps aux | grep node
```

**5. Database State (2 minutes)**
```bash
# Check for locked tables
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check disk space
psql $DATABASE_URL -c "SELECT pg_database_size(current_database());"

# Check for transaction backlog
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"
```

---

## Common Incident Resolution

### **P1: Complete Payment System Down**

**Likely Causes:**
1. Database connection lost
2. Application crashed
3. Network issues
4. Paymob API down

**Resolution Steps:**

```bash
# 1. Check if app is running
ps aux | grep node

# 2. Check logs
tail -100 logs/error.log

# 3. If app crashed, restart
npm start

# 4. If database down, check connection
psql $DATABASE_URL -c "SELECT 1;"

# 5. If database locked, restart database
sudo systemctl restart postgresql

# 6. If memory exhausted, restart app with increased memory
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

**Verification:**
```bash
# Test payment creation
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageId":"test","couponCode":null}'
```

### **P2: 10-50% Payment Failures**

**Likely Causes:**
1. Paymob API intermittently failing
2. Database experiencing high load
3. Memory leak causing slowdowns
4. Network timeouts

**Resolution Steps:**

```bash
# 1. Check error distribution
grep "ERROR" logs/combined.log | jq '.errorCode' | sort | uniq -c

# 2. If Paymob errors, check Paymob status
curl -s https://status.paymob.com/api/v2/status.json

# 3. If database load high, check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 4. If memory high, restart app
kill -9 $(pgrep -f "node.*app.js")
npm start

# 5. Enable circuit breaker for Paymob calls
# This will temporarily stop calling Paymob and return cached responses
```

**Mitigation:**
- Scale up database connections (slow query = more connections)
- Implement rate limiting to prevent cascade
- Cache Paymob responses temporarily

### **P3: Isolated Failures (< 10%)**

**Likely Causes:**
1. Specific coupon code invalid
2. Specific package ID missing
3. Database constraint violation
4. Specific user account issue

**Resolution Steps:**

```bash
# 1. Identify affected users
grep "ERROR" logs/combined.log | jq 'select(.studentId != null) | .studentId' | sort | uniq

# 2. Check their specific issue
curl http://localhost:3000/dev/payments | jq '.[] | select(.studentId == "user-123")'

# 3. If coupon issue, check coupon
psql $DATABASE_URL -c "SELECT * FROM coupons WHERE code = 'PROBLEMCODE';"

# 4. If package issue, check package
psql $DATABASE_URL -c "SELECT * FROM packages WHERE id = 'pkg-123';"

# 5. Contact affected users with workaround
```

**No immediate action needed** - monitor and fix in next release

---

## Communication During Incident

### Initial Report (T+0)
```
🚨 Payment system issue detected
Severity: [P1/P2/P3]
Symptoms: [describe issue]
Affected users: [estimate]
ETA: [investigating]
```

### Status Update (every 15 minutes)
```
⚙️ Status update (T+15min)
Latest finding: [what we discovered]
Current action: [what we're doing]
ETA: [updated estimate]
```

### Resolution (when fixed)
```
✅ Incident resolved (T+45min)
Root cause: [what caused it]
Fix applied: [what we did]
Prevention: [how to prevent]
```

### Postmortem (within 24 hours)
```
📋 Incident postmortem
Duration: 45 minutes (T+0 to T+45)
Impact: 150 failed payments, 2 hours downtime
Root cause: Database connection pool exhausted
Prevention: Increase pool size, add monitoring alerts
```

---

## Incident Tracking

**In Jira/Linear:**
```
Title: [P1] Payment system down - April 24
Type: Incident
Severity: Critical
Timeline:
  - T+0: Alert received
  - T+5: Database found restarted
  - T+10: App restarted
  - T+45: System recovered
Resolution: Database memory limit increased
PostmortemETA: April 25
```

---

## Escalation Matrix

| Issue | Owner | On-Call | Manager | CTO |
|-------|-------|---------|---------|-----|
| App crash | Engineer | Alert | Page if >5 min | Page if >15 min |
| Database down | DBA | Alert | Page | Page immediately |
| Paymob down | Paymob | Monitor | Update customers | Monitor |
| Customer data breach | Security | Page | Page | Page immediately |
| 50% payment fail rate | Engineer | Alert | Page | Page immediately |
| Slow payments (but working) | Engineer | Monitor | Schedule review | - |

---

## Runbook Links

- [Payment Issues](./payment-issues.md)
- [Debugging Guide](./debugging-guide.md)
- [Disaster Recovery](./disaster-recovery.md)
- [Monitoring](./monitoring.md)

---

## Emergency Contacts

- **On-Call Engineer:** Check PagerDuty
- **Engineering Manager:** [contact info]
- **CTO:** [contact info]
- **Paymob Support:** support@paymob.com
- **Database Admin:** dba@eduflow.com
- **Security Team:** security@eduflow.com
- **Customer Success:** support@eduflow.com

---

## Incident Post-Mortem Template

```markdown
# Incident Post-Mortem: [Issue Name]

**Date:** [Date]
**Duration:** [Start time] to [End time] ([minutes])
**Impact:** [X payments failed, Y users affected, Z revenue loss]
**Severity:** [P1/P2/P3]

## Timeline
- T+0: Alert received
- T+5: Issue confirmed
- T+15: Root cause identified
- T+45: Fix deployed
- T+60: Verification complete

## Root Cause
[Detailed explanation of what caused the issue]

## Immediate Action
[What we did to fix it]

## Prevention
[How to prevent this in the future]

## Follow-ups
- [ ] Increase monitoring alert sensitivity
- [ ] Add automated tests for this scenario
- [ ] Update runbooks
- [ ] Team training on this issue

## Lessons Learned
[What we learned from this incident]

## Assigned Owner
[Who will implement prevention measures]
```
