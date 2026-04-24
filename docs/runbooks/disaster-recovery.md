# Disaster Recovery Guide

## Overview

Procedures for recovering from critical failures:
- Database corruption/loss
- Data center outage
- Application deployment failure
- Security incident

**Recovery Time Objectives (RTO):**
- Database failure: 30 minutes
- Application crash: 5 minutes
- Deployment rollback: 10 minutes
- Data recovery: 1 hour

---

## Backup & Recovery Strategy

### Daily Backups

**Schedule:** 2 AM UTC daily
**Location:** AWS S3 + Remote storage
**Retention:** 30 days

**Backup Contents:**
- PostgreSQL database (full dump)
- Configuration files
- Log archives
- Test data for recovery testing

**Verification:**
```bash
# Test recovery procedure weekly
./scripts/test-backup-recovery.sh

# Verify backup exists
aws s3 ls s3://eduflow-backups/daily/ | tail -5
```

### Point-in-Time Recovery

**Available:** Last 7 days of WAL logs
**RPO:** 1 minute (max data loss)

```bash
# Restore to specific timestamp
RESTORE_TIME="2026-04-24 10:30:00"

pg_basebackup -h backup.server -D /var/lib/postgresql/backup

# In recovery.conf
recovery_target_timeline = 'latest'
recovery_target_time = '$RESTORE_TIME'
```

---

## Database Recovery

### Scenario: Database Corrupted

**Symptoms:**
- Query errors (integrity violations)
- Unable to connect
- Disk full

**Recovery Steps:**

```bash
# 1. Check database integrity
psql $DATABASE_URL -c "REINDEX DATABASE eduflow_payments;"

# 2. If reindex fails, restore from backup
# Stop application first
systemctl stop eduflow-api

# 3. Restore database
./scripts/restore-database.sh --backup-date 2026-04-24 --time 09:00:00

# 4. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM payments;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM enrollments;"

# 5. Check data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM payments WHERE status NOT IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');"

# 6. Restart application
systemctl start eduflow-api

# 7. Monitor for issues
tail -f logs/error.log
```

**Expected Outcome:**
- All payments restored to state at backup time
- Maximum 1 hour of data loss (last backup time)
- No data corruption

**Verification Checklist:**
- [ ] Database connects
- [ ] Payment records count matches
- [ ] Enrollments intact
- [ ] All constraints satisfied
- [ ] Application starting normally

### Scenario: Database Disk Full

**Symptoms:**
- Database write errors
- Application can't create payments
- Disk usage > 95%

**Recovery Steps:**

```bash
# 1. Check disk usage
df -h | grep postgresql

# 2. Find large tables
psql $DATABASE_URL -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) 
  FROM pg_stat_user_tables 
  ORDER BY pg_total_relation_size(relid) DESC 
  LIMIT 10;"

# 3. Check logs table size
du -h logs/

# 4. Archive old logs (> 30 days)
find logs/ -name "*.log" -mtime +30 -exec gzip {} \; -exec mv {}.gz archives/ \;

# 5. Run database cleanup
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 6. Check disk again
df -h | grep postgresql

# 7. If still full, expand disk volume (requires ops)
# Then: ALTER DATABASE eduflow_payments OWNER TO postgres;
```

**Long-term Fix:**
- Implement log rotation (keep 7 days max)
- Archive old payment records to cold storage
- Set up disk usage alerts at 80%

### Scenario: Replication Lag

**Symptoms:**
- Read replicas out of sync
- Reports showing stale data
- Write operations slow

**Recovery Steps:**

```bash
# 1. Check replication status
psql -h replica.host -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"

# 2. If replica is far behind
# Option A: Wait for catch-up (monitor progress)
watch -n 5 'psql -h replica.host -c "SELECT slot_name, confirmed_flush_lsn FROM pg_replication_slots;"'

# Option B: Resync replica (if wait too long)
# On replica:
systemctl stop postgresql
rm -rf /var/lib/postgresql/data/*
pg_basebackup -h primary.host -D /var/lib/postgresql/data -P -v -R
systemctl start postgresql

# 3. Verify replication resumed
psql -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

---

## Application Recovery

### Scenario: Application Crash

**Symptoms:**
- Application not responding
- HTTP 502/503 errors
- Logs show panic/crash

**Recovery Steps:**

```bash
# 1. Check if process is running
ps aux | grep "node.*app"

# 2. If crashed, restart
systemctl restart eduflow-api

# 3. Check startup errors
systemctl status eduflow-api -l

# 4. Monitor logs
tail -f logs/error.log

# 5. Check health endpoint
curl http://localhost:3000/api/health

# 6. Test payment creation
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageId":"test","couponCode":null}'
```

**If Won't Start:**
```bash
# 1. Check for port conflicts
lsof -i :3000

# 2. Check disk space
df -h

# 3. Check memory
free -h

# 4. Clear temp files
rm -rf /tmp/node-*
rm -rf node_modules/.cache

# 5. Try starting with extra memory
NODE_OPTIONS="--max-old-space-size=2048" npm start

# 6. If still fails, check logs
cat logs/error.log | head -50
```

### Scenario: Deployment Failure

**Symptoms:**
- New version has bugs
- Error spike after deployment
- Need to rollback

**Recovery Steps:**

```bash
# 1. Quick fix: Scale down bad version
kubectl set replicas deployment/eduflow-api --replicas=0

# 2. Get previous working version
git log --oneline -10

# 3. Rollback deployment
kubectl rollout undo deployment/eduflow-api

# 4. Or manually redeploy previous version
git checkout <previous-commit>
npm run build
docker build -t eduflow-api:$(git rev-parse --short HEAD) .
docker push eduflow-api:$(git rev-parse --short HEAD)
kubectl set image deployment/eduflow-api \
  eduflow-api=eduflow-api:$(git rev-parse --short HEAD)

# 5. Verify deployment
kubectl rollout status deployment/eduflow-api

# 6. Test payment flow
curl -X POST http://localhost:3000/api/v1/checkout ...

# 7. Post-mortem
# - What caused the failure?
# - Add test to prevent
# - Update deployment process
```

---

## Data Recovery Scenarios

### Scenario: Lost Payment Records

**How Can This Happen:**
- Database corruption
- Accidental DELETE (unlikely with constraints)
- Ransomware/malicious deletion
- Replication failure

**Recovery Steps:**

```bash
# 1. Stop application immediately
systemctl stop eduflow-api

# 2. Check if backups exist
ls -la /backups/

# 3. Find latest complete backup before loss
./scripts/list-backups.sh

# 4. Restore to specific time
./scripts/restore-database.sh \
  --backup-date 2026-04-24 \
  --time 08:00:00 \
  --target-database eduflow_payments_recovered

# 5. Verify recovered data
psql eduflow_payments_recovered -c "SELECT COUNT(*) FROM payments;"

# 6. Compare with current database
psql eduflow_payments -c "SELECT COUNT(*) FROM payments;"

# 7. If recovered > current, restore full database
# Backup current: pg_dump eduflow_payments > /tmp/broken.dump
# Drop current: dropdb eduflow_payments
# Rename recovered: psql -c "ALTER DATABASE eduflow_payments_recovered RENAME TO eduflow_payments;"

# 8. Restart application
systemctl start eduflow-api

# 9. Monitor for anomalies
tail -f logs/error.log
```

**Communication:**
```
🚨 INCIDENT: Payment records loss detected
- Recovery initiated from backup (2026-04-24 08:00 UTC)
- Maximum data loss: 1 hour
- Actions: Restoring from backup, verifying integrity
- ETA: 30 minutes to full recovery
```

### Scenario: Enrollment Records Lost

**Recovery:**
```bash
# 1. Identify missing enrollments
SELECT DISTINCT student_id FROM payments WHERE status = 'COMPLETED' 
EXCEPT 
SELECT student_id FROM enrollments;

# 2. Restore enrollments from backup
./scripts/restore-enrollments.sh --from-backup 2026-04-24-08-00

# 3. Verify all completed payments have enrollments
SELECT COUNT(*) FROM payments p 
WHERE p.status = 'COMPLETED' 
AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = p.student_id);

# 4. If zero rows, recovery complete
```

---

## Security Incident Recovery

### Scenario: API Key Compromised

**Symptoms:**
- Unusual API usage patterns
- Unauthorized payments
- Customer reports suspicious activity

**Recovery Steps:**

```bash
# 1. Immediate: Revoke compromised key
# In Paymob dashboard: Settings → API Keys → Deactivate

# 2. Generate new API key
# Paymob dashboard → Generate new key

# 3. Update environment
echo "PAYMOB_API_KEY=<new_key>" >> .env
systemctl restart eduflow-api

# 4. Audit suspicious transactions
grep "<suspicious_date>" logs/combined.log | grep "checkout\|payment"

# 5. Refund unauthorized payments
./scripts/refund-payments.sh --filter suspicious --reason "Unauthorized - API key compromise"

# 6. Notify affected customers
./scripts/send-security-notification.sh --customers affected --incident "API key compromise"

# 7. Review access logs
grep "PAYMOB_API_KEY\|payment.*error" logs/combined.log | head -100

# 8. Enable 2FA on Paymob account
# Paymob dashboard → Account Settings → Enable 2FA
```

### Scenario: Customer Data Breach

**Symptoms:**
- Unauthorized data access
- Customer emails in logs
- Payment card data exposed

**Recovery Steps:**

```bash
# 1. Immediate: Isolate database
# Restrict network access to database

# 2. Check what was exposed
grep -r "4111\|5555\|card\|email" logs/combined.log | wc -l

# 3. Verify encryption
grep "encrypted\|hash" logs/combined.log | grep -c "password\|card"

# 4. Notify Security team
# Email: security@eduflow.com

# 5. Identify source of exposure
grep "2026-04-24" logs/combined.log | grep -i "select.*email\|email.*from"

# 6. Rotate affected credentials
# Change database password
# Change API keys
# Update .env with new credentials

# 7. Audit trail
grep "2026-04-24" logs/combined.log | jq '{time: .timestamp, user: .userId, action: .action, resource: .resource}' | head -50

# 8. Fix vulnerability
# Example: Remove email from logs
# In logger: sanitize({ email: '***REDACTED***' })

# 9. Re-deploy fix
npm run build
systemctl restart eduflow-api

# 10. Notify customers
./scripts/notify-data-breach.sh --customers affected --action "Password reset required"
```

---

## Recovery Testing

**Monthly:** Test backup restoration
```bash
./scripts/test-backup-recovery.sh

# Verify:
# - Database restores in < 30 minutes
# - All data intact
# - Application starts normally
# - Payments queryable
```

**Quarterly:** Full disaster recovery drill
```bash
# Simulate complete infrastructure failure
# - Restore database from backup
# - Deploy application
# - Restore all configurations
# - Run smoke tests
# - Measure RTO (should be < 2 hours)
```

---

## Disaster Recovery Contacts

- **Database Admin:** dba@eduflow.com
- **Infrastructure Team:** ops@eduflow.com
- **Security Team:** security@eduflow.com
- **CTO:** cto@eduflow.com
- **Backup Vendor:** backup-support@company.com

---

## Critical Resources

**Backup Location:** 
- Primary: AWS S3 `s3://eduflow-backups/`
- Secondary: Digital Ocean `backup.eduflow.com`

**Documentation:**
- Backup procedures: `./scripts/backup.sh`
- Restore procedures: `./scripts/restore-database.sh`
- Disaster recovery plan: `./docs/DISASTER_RECOVERY_PLAN.md`

**Access:**
- Database: `psql $DATABASE_URL`
- Backups: `aws s3 ls s3://eduflow-backups/`
- Logs: `/var/log/postgresql/postgresql.log`

---

## Related Docs
- [Incident Response](./incident-response.md)
- [Debugging Guide](./debugging-guide.md)
- [Monitoring](./monitoring.md)
