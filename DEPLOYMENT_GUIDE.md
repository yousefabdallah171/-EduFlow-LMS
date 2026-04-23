# EduFlow LMS - Issues & Production Deployment Guide

## 🔴 ISSUES WE FACED

### 1. **Database Credential Mismatch**
- **Problem**: `POSTGRES_PASSWORD` in .env didn't match the password in `DATABASE_URL`
- **Error**: `P1000: Authentication failed against database server`
- **Root Cause**: Wrong password in connection string
- **Solution**: Update DATABASE_URL to match POSTGRES_PASSWORD

### 2. **Special Characters in Password Not URL-Encoded**
- **Problem**: Password contained `@$#` which break PostgreSQL connection URLs
- **Error**: Connection string parser couldn't distinguish between password and host
- **Root Cause**: Special chars need URL encoding (`@` → `%40`, `$` → `%24`, `#` → `%23`)
- **Solution**: URL-encode all special characters in DATABASE_URL

### 3. **Invalid pnpm Commands in Docker**
- **Problem**: `pnpm prisma:generate` ran from `/app` but script only exists in backend package.json
- **Error**: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma:generate" not found`
- **Root Cause**: Using workspace root commands instead of filtered commands
- **Solution**: Use `pnpm --filter backend prisma:generate` for workspace packages

### 4. **Backend Environment Variables Not Passed**
- **Problem**: Backend container wasn't loading `.env` file properly
- **Error**: Missing BACKEND_PORT and other required variables
- **Root Cause**: Missing `env_file` and incomplete environment section in docker-compose
- **Solution**: Add `env_file: .env` and explicit environment variables

### 5. **Missing Service Health Checks**
- **Problem**: Backend started before PostgreSQL was ready
- **Error**: Connection attempts failed, retries consumed
- **Root Cause**: No health check mechanism for postgres
- **Solution**: Add PostgreSQL health check and `condition: service_healthy` dependency

### 6. **Prisma Secrets Validation Failed**
- **Problem**: JWT secrets and API keys were placeholder strings too short
- **Error**: Zod validation failed (min 32 chars for JWT secrets)
- **Root Cause**: Development placeholders don't meet schema requirements
- **Solution**: Provide valid-length dummy values for development

### 7. **Frontend URL Mismatch**
- **Problem**: FRONTEND_URL set to `http://localhost:3000` (backend port)
- **Error**: CORS and redirects point to wrong location
- **Root Cause**: Copy-paste error from template
- **Solution**: Set FRONTEND_URL to `http://localhost` (frontend port 80)

---

## 📋 PRODUCTION DEPLOYMENT STRATEGY

### **Phase 1: Pre-Deployment Planning**

#### A. Infrastructure Requirements
```
Domain: youesf-abdallah-workflow-course
Provider Options: AWS | DigitalOcean | Vercel | Heroku | Self-hosted
Database: PostgreSQL 16+
Cache: Redis 7+
Storage: Video files storage (S3 or local volume)
```

#### B. Environment Variables (Production)
```
Critical Secrets:
- DATABASE_URL (production PostgreSQL)
- REDIS_URL (production Redis)
- JWT_ACCESS_SECRET (32+ chars, random)
- JWT_REFRESH_SECRET (32+ chars, random)
- VIDEO_TOKEN_SECRET (32+ chars, random)

Third-party APIs:
- PAYMOB_API_KEY (payment gateway)
- PAYMOB_HMAC_SECRET
- PAYMOB_INTEGRATION_ID
- PAYMOB_IFRAME_ID
- GOOGLE_CLIENT_ID (OAuth)
- GOOGLE_CLIENT_SECRET
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (email)

Application Settings:
- FRONTEND_URL=https://youesf-abdallah-workflow-course.com
- BACKEND_PORT=3000 (or proxy)
- NODE_ENV=production
```

---

### **Phase 2: Deployment Architecture Options**

#### **OPTION A: Docker Compose on VPS (Recommended for MVP)**
**Best For**: Budget-friendly, full control, learning

```
Infrastructure:
├── Single VPS (Ubuntu 20.04+, 4GB RAM min)
├── Docker Engine + Docker Compose
├── Nginx (reverse proxy)
├── SSL/TLS (Let's Encrypt)
└── Systemd service (auto-restart)

Advantages:
- Simple, all-in-one setup
- Low cost
- Full control

Disadvantages:
- Single point of failure
- Manual scaling
- Need to manage updates
```

**Deployment Steps:**
1. Provision VPS
2. Install Docker & Docker Compose
3. Clone repository
4. Create production `.env` file
5. Build images: `docker-compose -f docker-compose.prod.yml build`
6. Start services: `docker-compose -f docker-compose.prod.yml up -d`
7. Configure Nginx reverse proxy
8. Setup SSL with Certbot

#### **OPTION B: Kubernetes (Scalable)**
**Best For**: High traffic, auto-scaling needs

```
Infrastructure:
├── K8s Cluster (EKS/AKS/GKE)
├── RDS PostgreSQL
├── ElastiCache Redis
├── S3 for videos
└── CloudFront CDN

Components:
- Backend Pods (replicated)
- Frontend Static (CDN)
- Ingress Controller (SSL)
- PVC for persistent data
```

#### **OPTION C: Serverless (Full PaaS)**
**Best For**: Minimal ops, fast deployment

```
Services:
├── Vercel (Frontend)
├── AWS Lambda / Google Cloud Run (Backend API)
├── RDS / Firebase (Database)
├── S3 (Storage)
```

---

### **Phase 3: Database Considerations**

#### **Production Database Setup**
```
PostgreSQL Configuration:
- Version: 16+ 
- Backup Strategy: Automated daily + incremental
- Replication: Read replica for scaling (optional)
- Connection Pool: PgBouncer (if load > 100 connections)
- Encryption: SSL/TLS for connections
- Monitoring: CloudWatch / Datadog

Initial Data:
1. Create production database
2. Run migrations: `prisma migrate deploy`
3. Create admin user (manually or script)
4. Run seed (optional, or custom production seed)
```

#### **Video Storage Strategy**
```
Option 1: AWS S3 (Cloud)
- Cost: Pay-per-use
- Bandwidth: CloudFront CDN
- Durability: 99.99%

Option 2: Local Volume (VPS)
- Cost: Included in server
- Setup: `/var/eduflow/videos`
- Backup: Daily snapshots

Option 3: Azure Blob / GCS
- Similar to S3
```

---

### **Phase 4: Reverse Proxy & SSL Setup**

#### **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/youesf-abdallah-workflow-course

upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name youesf-abdallah-workflow-course.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name youesf-abdallah-workflow-course.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/youesf-abdallah-workflow-course.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/youesf-abdallah-workflow-course.com/privkey.pem;

    # Frontend static files
    location / {
        root /var/www/eduflow/frontend/dist;
        try_files $uri /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Video files (from storage)
    location /videos/ {
        alias /var/eduflow/videos/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### **SSL Setup (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d youesf-abdallah-workflow-course.com

# Auto-renewal (runs daily)
sudo systemctl enable certbot.timer
```

---

### **Phase 5: Production Docker Compose**

#### **docker-compose.prod.yml** (Create this file)
```yaml
services:
  backend:
    image: eduflow-lms-backend:prod
    restart: always
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - eduflow_net
    volumes:
      - /var/eduflow/storage:/app/backend/storage
      - /var/eduflow/videos:/app/backend/videos
    command: sh -c "pnpm --filter backend exec prisma migrate deploy && node dist/src/server.js"

  postgres:
    image: postgres:16-alpine
    restart: always
    env_file:
      - .env.production
    networks:
      - eduflow_net
    volumes:
      - /var/eduflow/pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - eduflow_net
    volumes:
      - /var/eduflow/redisdata:/data

networks:
  eduflow_net:
    driver: bridge

volumes:
  eduflow_net:
```

---

### **Phase 6: Deployment Checklist**

#### **Pre-Deployment (On Local Machine)**
```
☐ Update FRONTEND_URL in .env to https://youesf-abdallah-workflow-course.com
☐ Generate strong secrets (32+ chars): openssl rand -hex 32
☐ Create .env.production with all required vars
☐ Test locally: docker-compose -f docker-compose.prod.yml build
☐ Run migrations locally against test DB
☐ Build frontend: npm run build (or pnpm build)
☐ Commit all changes to git
```

#### **Server Setup**
```
☐ Create Ubuntu 20.04+ VPS (4GB+ RAM, 20GB+ SSD)
☐ SSH key authentication (no passwords)
☐ Update system: apt update && apt upgrade
☐ Install Docker: curl -fsSL https://get.docker.com | sh
☐ Install Docker Compose: apt install docker-compose
☐ Create app directory: mkdir -p /var/eduflow
☐ Create storage directories:
  - mkdir -p /var/eduflow/{pgdata,redisdata,storage,videos}
  - chmod 755 /var/eduflow/*
☐ Clone repository: git clone <repo> /var/eduflow/app
☐ Setup environment: cp .env.example .env.production
☐ Configure Nginx (see Phase 4)
☐ Setup SSL (Let's Encrypt)
☐ Create Systemd service for auto-restart
```

#### **Deployment**
```
☐ SSH into server
☐ cd /var/eduflow/app
☐ git pull origin main
☐ Build production images: 
  docker-compose -f docker-compose.prod.yml build --no-cache
☐ Start services: 
  docker-compose -f docker-compose.prod.yml up -d
☐ Verify migrations: 
  docker-compose logs backend | grep "All migrations"
☐ Test endpoints:
  curl https://youesf-abdallah-workflow-course.com/health
☐ Monitor logs: 
  docker-compose logs -f backend
```

---

### **Phase 7: Post-Deployment Monitoring**

#### **Health Checks**
```bash
# Check all services running
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Database connection test
docker-compose exec postgres pg_isready

# Redis connection test
docker-compose exec redis redis-cli ping
```

#### **Monitoring Setup**
```
Tools Options:
1. Uptime Robot (free, simple)
   - Monitor: https://youesf-abdallah-workflow-course.com/health
   - Alert on failure

2. DataDog / New Relic
   - Full APM monitoring
   - Performance metrics

3. Self-hosted: Prometheus + Grafana
```

---

### **Phase 8: Backup & Disaster Recovery**

#### **Database Backups**
```bash
# Manual backup
docker-compose exec postgres pg_dump -U eduflow eduflow_dev > backup.sql

# Automated daily backup (cron)
0 2 * * * cd /var/eduflow/app && docker-compose exec -T postgres pg_dump -U eduflow eduflow_dev > /var/backups/db_$(date +\%Y\%m\%d).sql
```

#### **Video Files Backup**
```bash
# Daily backup to S3
0 3 * * * aws s3 sync /var/eduflow/videos s3://my-backup-bucket/videos/
```

#### **Restore Procedure**
```bash
# Restore database
docker-compose exec postgres psql -U eduflow eduflow_dev < backup.sql

# Restore videos from S3
aws s3 sync s3://my-backup-bucket/videos/ /var/eduflow/videos/
```

---

### **Phase 9: CI/CD Pipeline (Optional but Recommended)**

#### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: youesf-abdallah-workflow-course.com
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/eduflow/app
            git pull origin main
            docker-compose -f docker-compose.prod.yml build --no-cache
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose exec -T backend pnpm --filter backend exec prisma migrate deploy
```

---

### **Phase 10: Security Hardening**

```
✓ Firewall rules
  - Open only: 80 (HTTP), 443 (HTTPS), 22 (SSH)
  - Block: All others

✓ Environment variables
  - Store in .env.production (NOT in code)
  - Use chmod 600 on .env file
  - Rotate secrets quarterly

✓ Database security
  - Strong password (32+ chars, mixed case, numbers, symbols)
  - No default users
  - Enable SSL connections
  - Restrict access to localhost only

✓ API security
  - Rate limiting (already in backend)
  - CORS configured for domain only
  - HTTPS enforced
  - Helmet.js enabled

✓ Application
  - Keep dependencies updated
  - Regular security audits: npm audit
  - Monitor error logs for attacks
```

---

## 📝 STEP-BY-STEP DEPLOYMENT SUMMARY

### **Quick Path (Docker Compose on VPS)**
```
1. Provision VPS (Ubuntu, 4GB RAM)
2. Install Docker + Docker Compose
3. Clone repo: git clone <repo>
4. Create .env.production with secrets
5. Build: docker-compose -f docker-compose.prod.yml build
6. Start: docker-compose -f docker-compose.prod.yml up -d
7. Configure Nginx + SSL
8. Point domain DNS to VPS IP
9. Test: https://youesf-abdallah-workflow-course.com
```

### **Production .env Template**
```env
# Database (RDS PostgreSQL)
POSTGRES_USER=eduflow_prod
POSTGRES_PASSWORD=<strong-32-char-password>
POSTGRES_DB=eduflow_prod
DATABASE_URL=postgresql://eduflow_prod:<encoded-password>@db.example.com:5432/eduflow_prod?schema=public

# Redis
REDIS_URL=redis://:<redis-password>@redis.example.com:6379

# JWT Secrets (use: openssl rand -hex 32)
JWT_ACCESS_SECRET=<32-char-random>
JWT_REFRESH_SECRET=<32-char-random>
VIDEO_TOKEN_SECRET=<32-char-random>

# Payment Gateway
PAYMOB_API_KEY=<live-api-key>
PAYMOB_HMAC_SECRET=<live-secret>
PAYMOB_INTEGRATION_ID=<live-id>
PAYMOB_IFRAME_ID=<live-iframe>

# OAuth
GOOGLE_CLIENT_ID=<production-client-id>
GOOGLE_CLIENT_SECRET=<production-secret>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@youesf-abdallah-workflow-course.com
SMTP_PASS=<app-password>

# Application
FRONTEND_URL=https://youesf-abdallah-workflow-course.com
BACKEND_PORT=3000
NODE_ENV=production
```

---

## 🚀 ESTIMATED TIMELINE

| Phase | Time | Complexity |
|-------|------|-----------|
| 1. Planning & Setup | 2-4 hours | Low |
| 2. VPS Provisioning | 30 mins | Low |
| 3. Docker Setup | 1 hour | Low |
| 4. Database & Secrets | 1-2 hours | Medium |
| 5. Nginx & SSL | 1 hour | Medium |
| 6. Deployment | 30 mins | Low |
| 7. Testing & Monitoring | 1-2 hours | Medium |
| **Total** | **7-14 hours** | **Medium** |

---

## 📞 TROUBLESHOOTING DURING DEPLOYMENT

### Common Issues & Solutions

**Issue: Connection refused on port 3000**
- Check if backend container is running: `docker-compose ps`
- View logs: `docker-compose logs backend`
- Ensure .env has DATABASE_URL

**Issue: Database migration fails**
- Check PostgreSQL is healthy: `docker-compose logs postgres`
- Verify DATABASE_URL credentials
- Check for special characters (URL-encode them)

**Issue: CORS errors in frontend**
- Verify FRONTEND_URL in backend .env matches actual domain
- Check API endpoint in frontend points to correct backend URL

**Issue: SSL certificate not working**
- Verify domain DNS points to server IP
- Check Certbot renewal: `certbot renew --dry-run`
- View nginx logs: `tail -f /var/log/nginx/error.log`

**Issue: Storage/Videos not persisting**
- Ensure volumes mounted: `docker volume ls`
- Check permissions: `ls -la /var/eduflow/`
- Verify in docker-compose volumes section

