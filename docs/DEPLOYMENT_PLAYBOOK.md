# Production Deployment Playbook

**Version:** 1.0  
**Last Updated:** April 24, 2026  
**Status:** Ready for Production

---

## Pre-Deployment Checklist

### 48 Hours Before Deployment

- [ ] **Code Review Complete**
  - [ ] All PRs approved
  - [ ] Tests passing (100%)
  - [ ] Security review done
  - [ ] No TODOs in critical code

- [ ] **Testing Complete**
  - [ ] Unit tests: ✅ PASS
  - [ ] Integration tests: ✅ PASS
  - [ ] E2E tests: ✅ PASS
  - [ ] Load tests: ✅ PASS
  - [ ] Security tests: ✅ PASS

- [ ] **Documentation Complete**
  - [ ] API docs updated
  - [ ] Runbooks updated
  - [ ] Deployment guide ready
  - [ ] Rollback procedure documented

- [ ] **Infrastructure Ready**
  - [ ] Database backups configured
  - [ ] Monitoring alerts active
  - [ ] Log aggregation working
  - [ ] SSL certificates valid
  - [ ] Secrets configured

- [ ] **Communication Plan**
  - [ ] Notify stakeholders
  - [ ] Scheduled maintenance window
  - [ ] Status page updated
  - [ ] On-call engineer assigned

---

## Pre-Deployment (Day Of - T-2 Hours)

### 1. Final Verification

```bash
# Verify all changes merged to main
git log --oneline -5 main

# Verify tests passing
npm run test:all
# Expected: 100% pass rate

# Check for uncommitted changes
git status
# Expected: clean

# Verify environment is ready
npm run env:validate
# Expected: All variables set

# Final security scan
npm audit
# Expected: 0 vulnerabilities
```

### 2. Database Backup

```bash
# Create pre-deployment backup
./scripts/backup-database.sh --name "pre-deployment-$(date +%Y%m%d-%H%M%S)"

# Verify backup
pg_dump --host=$DB_HOST --list | head -5
# Expected: Tables listed

# Test restoration
./scripts/test-backup-recovery.sh
# Expected: Database restores successfully
```

### 3. Secrets Verification

```bash
# Verify all secrets configured
./scripts/verify-secrets.sh

# Check Paymob API key
curl -s -X POST https://accept.paymobsolutions.com/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"api_key": "'$PAYMOB_API_KEY'"}' | jq '.response_code'
# Expected: 200 (success)

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
# Expected: 1

# Check Redis connection
redis-cli -h $REDIS_HOST ping
# Expected: PONG
```

### 4. Notification

```bash
# Send deployment notification
./scripts/notify-deployment.sh \
  --status "SCHEDULED" \
  --version "1.0.0" \
  --window "2:00 AM - 2:30 AM UTC" \
  --impact "Minimal (new features only)"

# Update status page
curl -X PATCH https://status.example.com/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{
    "name": "Planned Maintenance",
    "status": "investigating",
    "message": "Deploying payment system v1.0.0"
  }'
```

---

## Deployment (T-0 to T+30 Minutes)

### Phase 1: Build & Package (T-0 to T+5)

```bash
# Build backend
cd backend
npm run build
# Expected: Build succeeds, no errors

# Build frontend
cd ../frontend
npm run build
# Expected: Build succeeds, bundle size reasonable

# Create Docker image
docker build -t eduflow-api:1.0.0 -f backend/Dockerfile .
# Expected: Build succeeds

# Push to registry
docker push eduflow-api:1.0.0
# Expected: Image pushed successfully

# Verify image
docker pull eduflow-api:1.0.0
# Expected: Image available
```

### Phase 2: Pre-Deployment Testing (T+5 to T+10)

```bash
# Smoke test in staging
# 1. Deploy to staging cluster
kubectl set image deployment/eduflow-api-staging \
  eduflow-api=eduflow-api:1.0.0 \
  --namespace=staging

# 2. Wait for rollout
kubectl rollout status deployment/eduflow-api-staging \
  --namespace=staging \
  --timeout=5m

# 3. Run smoke tests
npm run test:smoke \
  --env=staging \
  --api=https://api-staging.example.com
# Expected: All smoke tests pass

# 4. Verify payment flow
# Create test payment in staging
# Verify success page loads
# Verify webhook processing works
# Verify enrollment created
```

### Phase 3: Production Deployment (T+10 to T+20)

```bash
# 1. Drain existing pods (graceful shutdown)
kubectl set replicas deployment/eduflow-api --replicas=0 \
  --namespace=production

# Wait for pods to terminate gracefully (max 30s)
kubectl wait --for=delete pod \
  -l app=eduflow-api \
  --namespace=production \
  --timeout=30s

# 2. Update deployment
kubectl set image deployment/eduflow-api \
  eduflow-api=eduflow-api:1.0.0 \
  --namespace=production

# 3. Scale to desired replica count
kubectl set replicas deployment/eduflow-api --replicas=3 \
  --namespace=production

# 4. Monitor rollout
kubectl rollout status deployment/eduflow-api \
  --namespace=production \
  --timeout=5m
# Expected: All replicas running

# 5. Verify pods healthy
kubectl get pods -l app=eduflow-api --namespace=production
# Expected: All pods in Running state
```

### Phase 4: Health Checks (T+20 to T+25)

```bash
# 1. API Health Check
curl https://api.example.com/api/health
# Expected: { "status": "healthy" }

# 2. Database Health Check
curl https://api.example.com/api/health/db
# Expected: { "status": "healthy" }

# 3. Paymob Connectivity
curl https://api.example.com/api/health/paymob
# Expected: { "status": "healthy" }

# 4. Create test payment
curl -X POST https://api.example.com/api/v1/checkout \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "test-pkg",
    "couponCode": null
  }'
# Expected: 200 response with paymentKey

# 5. Check logs for errors
kubectl logs -l app=eduflow-api \
  --namespace=production \
  --tail=50 | grep -i error
# Expected: No recent errors
```

### Phase 5: Verify Metrics (T+25 to T+30)

```bash
# 1. Check error rate
curl https://monitoring.example.com/api/metrics/error-rate
# Expected: < 1%

# 2. Check response latency
curl https://monitoring.example.com/api/metrics/latency
# Expected: p95 < 2.0s

# 3. Check payment success rate
curl https://monitoring.example.com/api/metrics/payment-success-rate
# Expected: > 95%

# 4. Check webhook processing
curl https://monitoring.example.com/api/metrics/webhook-latency
# Expected: p95 < 500ms
```

---

## Post-Deployment (T+30 to T+60)

### Monitoring

```bash
# 1. Watch logs in real-time
kubectl logs -l app=eduflow-api \
  --namespace=production \
  -f | grep -E "ERROR|error"

# 2. Monitor metrics dashboard
# Open https://monitoring.example.com/grafana
# Watch: Error rate, Latency, Payment success, Webhook delivery

# 3. Check for issues
# - Any error spikes?
# - Any slow requests?
# - Any failed webhooks?
# - Any unusual patterns?
```

### Final Verification

```bash
# 1. Real payment flow test (with real card, if possible)
# Or use Paymob test card in webhook simulation

# 2. Check payment history loads
curl https://api.example.com/api/v1/student/orders \
  -H "Authorization: Bearer $TEST_TOKEN"
# Expected: Orders returned

# 3. Check email notifications working
# Monitor email logs for confirmation emails
# Expected: Confirmation emails sent

# 4. Check database state
psql $DATABASE_URL -c "SELECT COUNT(*) FROM payments WHERE created_at > NOW() - INTERVAL '1 hour';"
# Expected: Payments created successfully
```

### Communication

```bash
# Send success notification
./scripts/notify-deployment.sh \
  --status "SUCCESS" \
  --version "1.0.0" \
  --duration "28 minutes" \
  --impact "0 payment failures"

# Update status page
curl -X PATCH https://status.example.com/incidents/deployment \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{
    "status": "resolved",
    "message": "Payment system v1.0.0 deployed successfully"
  }'

# Post in Slack #deployments
# "✅ Deployed payment system v1.0.0 successfully - 0 issues"
```

---

## Rollback Procedure (If Needed)

### Immediate Rollback

```bash
# 1. Identify previous good version
git log --oneline | head -5
# Find last known working commit

# 2. Rollback deployment immediately
kubectl rollout undo deployment/eduflow-api \
  --namespace=production

# 3. Wait for rollback
kubectl rollout status deployment/eduflow-api \
  --namespace=production \
  --timeout=5m

# 4. Verify old version running
kubectl get pods -l app=eduflow-api --namespace=production
# Expected: All pods running with previous version

# 5. Health check
curl https://api.example.com/api/health
# Expected: healthy

# 6. Notify team
./scripts/notify-deployment.sh \
  --status "ROLLED_BACK" \
  --version "1.0.0 → <previous_version>" \
  --reason "Issue detected: [description]"
```

### Post-Rollback Investigation

```bash
# 1. Collect logs from failed deployment
kubectl logs -l app=eduflow-api,version=1.0.0 \
  --namespace=production > /tmp/failed-deployment.log

# 2. Check for root cause
grep -i "error\|panic\|fatal" /tmp/failed-deployment.log

# 3. Create incident report
./scripts/create-incident.sh \
  --title "Deployment 1.0.0 Rollback" \
  --severity "High" \
  --cause "[description]"

# 4. Schedule postmortem
# - What went wrong?
# - Why did tests miss it?
# - How to prevent?
```

---

## Emergency Rollback (Service Down)

```bash
# If service completely down (not responding)

# 1. Switch to previous stable version immediately
kubectl rollout undo deployment/eduflow-api \
  --to-revision=<previous-stable-revision> \
  --namespace=production

# 2. If still failing, scale down and investigate
kubectl set replicas deployment/eduflow-api --replicas=0 \
  --namespace=production

# 3. Start debugging in staging
# - Can we reproduce the issue?
# - What changed?
# - Revert the change and rebuild

# 4. Redeploy when fixed
# Follow normal deployment procedure
```

---

## Deployment Windows

### Recommended Windows

**Time:** 2:00 AM UTC (low traffic)  
**Duration:** 30-60 minutes  
**Rollback Buffer:** 30 minutes after deployment

### Notify Users

- Status page: 24 hours before
- Email: 48 hours before  
- In-app banner: 2 hours before
- Slack: At start and completion

---

## Quick Reference - Deployment Commands

```bash
# Deploy new version
kubectl set image deployment/eduflow-api \
  eduflow-api=eduflow-api:<VERSION> \
  --namespace=production

# Check rollout status
kubectl rollout status deployment/eduflow-api \
  --namespace=production --timeout=5m

# Watch logs
kubectl logs -f deployment/eduflow-api \
  --namespace=production

# Scale replicas
kubectl set replicas deployment/eduflow-api --replicas=<N> \
  --namespace=production

# Rollback last change
kubectl rollout undo deployment/eduflow-api \
  --namespace=production

# View rollout history
kubectl rollout history deployment/eduflow-api \
  --namespace=production

# Get pod status
kubectl get pods -l app=eduflow-api \
  --namespace=production
```

---

## Deployment Metrics

### Success Criteria

- ✅ All replicas running
- ✅ Health checks passing
- ✅ Error rate < 1%
- ✅ Latency < 2.5s (p95)
- ✅ Payment success > 95%
- ✅ Webhook delivery > 95%
- ✅ No data corruption
- ✅ No security alerts

### Deployment Timeline

| Phase | Duration | Task |
|-------|----------|------|
| Build | 5 min | Build & test images |
| Staging | 5 min | Deploy and smoke test |
| Production | 10 min | Roll out to production |
| Verification | 5 min | Health checks & monitoring |
| **Total** | **25 min** | |

---

## Deployment Checklist (Print & Use)

```
PRE-DEPLOYMENT (48 Hours Before)
☐ Code review complete
☐ All tests passing
☐ Security review done
☐ Database backups ready
☐ Monitoring alerts active

PRE-DEPLOYMENT (Day Of)
☐ Final tests passing
☐ Backup created
☐ Secrets verified
☐ Team notified
☐ Rollback plan ready

DEPLOYMENT
☐ Build Docker image
☐ Push to registry
☐ Staging smoke tests pass
☐ Production deployment started
☐ Health checks passing
☐ Metrics verified
☐ Team notified

POST-DEPLOYMENT
☐ Logs monitoring
☐ Error rate normal
☐ Payment flow tested
☐ Webhooks processing
☐ Success notification sent
```

---

## Support & Questions

**During Deployment:**
- Engineering Slack: #deployments
- On-call: [contact info]
- Status: [status page URL]

**After Issues:**
- Postmortem within 24 hours
- Root cause analysis
- Prevention measures
- Team training if needed

