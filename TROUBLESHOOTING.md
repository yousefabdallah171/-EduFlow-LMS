# Troubleshooting Guide - EduFlow LMS

## Issues Fixed (April 27, 2026)

### Issue 1: 502 Bad Gateway Errors
**Problem:** Website returned 502 Bad Gateway, backend was completely down.

**Root Cause:** Backend process crashed after deploy and was never restarted. Used bare `nohup` with no process manager = no auto-restart on crash.

**Solution:**
- Started backend with PM2 (process manager)
- PM2 auto-restarts backend if it crashes
- PM2 survives server reboots
- `pm2 restart eduflow-backend` to restart manually

**Prevention:**
- Backend is now in `PM2`. Check status: `pm2 status`
- Backend logs: `pm2 logs eduflow-backend`
- Kill/restart: `pm2 kill`, `pm2 resurrect`

---

### Issue 2: Database Connection Failures
**Problem:** Errors: `Can't reach database server at 172.18.0.2:5432`

**Root Cause:** `backend/.env` had Docker IPs backwards:
- Wrong: `DATABASE_URL=...@172.18.0.2` (was pointing to Redis)
- Wrong: `REDIS_URL=redis://172.18.0.3` (was pointing to Postgres)

**Solution:**
- Fixed `backend/.env` with correct Docker IPs:
  - Postgres: `172.18.0.3:5432`
  - Redis: `172.18.0.2:6379`

**Prevention:**
- After `docker-compose up`, always verify IPs:
  ```bash
  sudo docker network inspect workflow-courseyouesf-abdallahonline_eduflow_net | grep -A 20 "Containers"
  ```

---

### Issue 3: Sessions Expiring Too Quickly
**Problem:** Users logged out after session TTL expired. Previous sessions were forcibly killed when user logged in from another device.

**Root Cause:** 
- `ENFORCE_SINGLE_SESSION=true` in env (killed old sessions)
- `REFRESH_SESSION_WINDOW_DAYS=30` (short TTL)

**Solution:**
- Changed `backend/.env`: `ENFORCE_SINGLE_SESSION=false`
- Extended session TTL: `REFRESH_SESSION_WINDOW_DAYS=365` (1 year)
- Modified `backend/src/utils/jwt.ts` line 20: `30` → `365`

**Prevention:**
- Sessions now last 365 days
- Multi-device login works (no conflict)
- User won't be logged out for a year

---

### Issue 4: Deploy Script Unreliable
**Problem:** Backend started with `nohup npm run start`, no monitoring, crashes go unnoticed.

**Root Cause:** 
- `nohup` output discarded to `/dev/null`
- No process manager
- No health checks after deploy
- No restart capability

**Solution:**
- Updated `deploy.sh` to use PM2:
  ```bash
  npm run build
  pm2 restart eduflow-backend || pm2 start "node dist/src/server.js" --name eduflow-backend
  pm2 save
  ```

**Prevention:**
- Future deploys automatically restart via PM2
- If backend crashes mid-deploy, PM2 brings it back online
- No more manual intervention needed

---

## Current Infrastructure Setup

### Backend
- **Process Manager:** PM2
- **Port:** 3008
- **Health Check:** `curl http://localhost:3008/api/v1/health`
- **Restart Backend:** `pm2 restart eduflow-backend --update-env`
- **View Logs:** `pm2 logs eduflow-backend`

### Database (Docker)
- **PostgreSQL Container:** `workflow-courseyouesf-abdallahonline_postgres_1`
- **Docker IP:** `172.18.0.3:5432`
- **Status:** `sudo docker-compose ps`

### Cache (Docker)
- **Redis Container:** `workflow-courseyouesf-abdallahonline_redis_1`
- **Docker IP:** `172.18.0.2:6379`
- **Status:** `sudo docker-compose ps`

### CI/CD
- **Pipeline:** GitHub Actions (`.github/workflows/deploy.yml`)
- **Trigger:** Push to `main` branch
- **Runner:** Self-hosted (on this VPS)
- **Deployment Path:** `/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online`

---

## Maintenance Checklist

### Daily
- [ ] Check website: `https://workflow-course.youesf-abdallah.online`
- [ ] Verify backend: `curl https://workflow-course.youesf-abdallah.online/api/v1/health`

### Weekly
- [ ] Check Docker containers: `sudo docker-compose ps`
- [ ] Check PM2 status: `pm2 status`
- [ ] Review PM2 logs: `pm2 logs eduflow-backend --lines 50`

### Monthly
- [ ] Backup PostgreSQL data
- [ ] Review API error logs
- [ ] Check disk space: `df -h`

---

## Common Commands

```bash
# Backend Management (PM2)
pm2 status                              # Show all processes
pm2 restart eduflow-backend             # Restart backend
pm2 restart eduflow-backend --update-env # Restart with new env vars
pm2 logs eduflow-backend                # View live logs
pm2 logs eduflow-backend --lines 100    # View last 100 lines
pm2 kill                                # Kill all PM2 processes
pm2 resurrect                           # Restore from previous state

# Docker Management
sudo docker-compose ps                  # Show Docker container status
sudo docker-compose up -d postgres redis # Start only DB containers
sudo docker-compose down                # Stop all containers
sudo docker-compose logs postgres       # View postgres logs

# GitHub Actions Runner
sudo -u youesf-abdallah-workflow-course bash -c "cd /home/youesf-abdallah-workflow-course/actions-runner && nohup ./run.sh > /tmp/runner.log 2>&1 &"
ps aux | grep Runner.Listener           # Check if runner is running
tail -f /tmp/runner.log                 # View runner logs

# Testing
curl http://localhost:3008/api/v1/health
curl https://workflow-course.youesf-abdallah.online/api/v1/auth/health
curl https://workflow-course.youesf-abdallah.online/api/v1/course

# Files Modified
cat /home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online/backend/.env
cat /home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online/deploy.sh
cat /home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online/docker-compose.yml
```

---

## If Something Goes Wrong

### Backend Not Responding (502 error)

1. Check if PM2 process is running:
   ```bash
   pm2 status
   ```

2. Check logs for errors:
   ```bash
   pm2 logs eduflow-backend
   ```

3. If process is offline, restart:
   ```bash
   pm2 restart eduflow-backend --update-env
   ```

4. If that fails, check Docker DB connection:
   ```bash
   sudo docker-compose ps
   ```

5. If Docker containers are down, restart them:
   ```bash
   sudo docker-compose up -d postgres redis
   ```

### Database Connection Error

1. Verify Docker containers are running:
   ```bash
   sudo docker-compose ps
   ```

2. Check IP configuration:
   ```bash
   sudo docker network inspect workflow-courseyouesf-abdallahonline_eduflow_net
   ```

3. Verify `backend/.env` has correct IPs:
   - Postgres: `172.18.0.3:5432`
   - Redis: `172.18.0.2:6379`

4. Restart backend to reload env:
   ```bash
   pm2 restart eduflow-backend --update-env
   ```

### GitHub Actions Deploy Taking Too Long

**Problem:** Job stuck in "Waiting for a runner to pick up this job..." for 30+ minutes.

**Root Cause:** Self-hosted GitHub Actions runner was not running.

**Solution:**
```bash
cd /home/youesf-abdallah-workflow-course/actions-runner
sudo -u youesf-abdallah-workflow-course bash -c "nohup ./run.sh > /tmp/runner.log 2>&1 &"
```

**Verification:**
```bash
ps aux | grep Runner.Listener    # Should show runner process
tail -f /tmp/runner.log          # Should show "Connected to GitHub"
```

**Prevention (Persistent Auto-Start):**

Create systemd service `/etc/systemd/system/github-runner.service`:
```ini
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
Type=simple
User=youesf-abdallah-workflow-course
WorkingDirectory=/home/youesf-abdallah-workflow-course/actions-runner
ExecStart=/home/youesf-abdallah-workflow-course/actions-runner/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable github-runner
sudo systemctl start github-runner
```

Check status:
```bash
sudo systemctl status github-runner
sudo journalctl -u github-runner -f
```

---

## Key Metrics

| Metric | Target | Check |
|--------|--------|-------|
| Backend response time | < 500ms | `curl -w "@curl-format.txt"` |
| Session TTL | 365 days | Check `backend/.env` |
| Database uptime | 99.9% | `sudo docker-compose ps` |
| API uptime | 99.9% | External uptime monitor |

---

Last Updated: April 27, 2026  
Maintained by: DevOps Team
