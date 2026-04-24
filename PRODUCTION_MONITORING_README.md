# Phase 7: Production Monitoring Setup Guide

**Last Updated:** April 24, 2026  
**Purpose:** Complete guide for running monitoring in production  
**Audience:** DevOps engineers, System administrators, Operations teams

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Docker Deployment](#docker-deployment)
3. [Non-Docker Production Setup](#non-docker-production-setup)
4. [Accessing Monitoring Systems](#accessing-monitoring-systems)
5. [Configuration for Production](#configuration-for-production)
6. [Security & Authentication](#security--authentication)
7. [Maintenance & Backup](#maintenance--backup)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)

---

## 🚀 Quick Start

### Option 1: Docker (Recommended for testing)
```bash
cd /path/to/eduflow-lms
docker-compose --profile monitoring up -d
```

### Option 2: Non-Docker (Recommended for production)
```bash
# See "Non-Docker Production Setup" section below
./setup-monitoring.sh
```

---

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM available
- 50GB disk space (for 30-day Prometheus retention)

### Starting the Stack

**Development:**
```bash
docker-compose --profile monitoring up -d
```

**Production:**
```bash
docker-compose -f docker-compose.yml \
  -f docker-compose.monitoring.yml \
  --profile monitoring up -d
```

### Verify Services

```bash
docker-compose ps

# Expected output:
# NAME                      SERVICE         STATUS
# eduflow-lms-prometheus-1  prometheus      Up (port 9090)
# eduflow-lms-grafana-1     grafana         Up (port 3001)
# eduflow-lms-alertmanager-1 alertmanager   Up (port 9093)
# eduflow-lms-backend-1     backend         Up (port 3000)
```

### Useful Commands

```bash
# View logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs alertmanager

# Stop services
docker-compose --profile monitoring down

# Restart specific service
docker-compose restart prometheus

# Scale Prometheus (if needed)
docker-compose up -d --scale prometheus=1
```

---

## 🖥️ Non-Docker Production Setup

This is the **recommended approach for production** as it provides better control, performance, and integration with production infrastructure.

### Prerequisites

**System Requirements:**
- Linux (Ubuntu 20.04+ recommended)
- 4GB RAM minimum
- 50GB free disk space
- User: `monitoring` (non-root)
- Ports: 9090 (Prometheus), 3000 (Grafana), 9093 (Alertmanager)

**Required Software:**
```bash
# Prometheus
https://github.com/prometheus/prometheus/releases
# Latest: v2.53.0

# Grafana
https://grafana.com/grafana/download
# Latest: 11.1.0

# Alertmanager
https://github.com/prometheus/alertmanager/releases
# Latest: v0.27.0

# Node Exporter (optional, for system metrics)
https://github.com/prometheus/node_exporter/releases
```

### Step 1: Create Monitoring User

```bash
# Create non-root user
sudo useradd --system --home /var/lib/monitoring --shell /bin/false monitoring

# Create directories
sudo mkdir -p /etc/monitoring/prometheus
sudo mkdir -p /etc/monitoring/alertmanager
sudo mkdir -p /var/lib/prometheus
sudo mkdir -p /var/lib/alertmanager
sudo mkdir -p /var/log/monitoring

# Set permissions
sudo chown -R monitoring:monitoring /etc/monitoring
sudo chown -R monitoring:monitoring /var/lib/prometheus
sudo chown -R monitoring:monitoring /var/lib/alertmanager
sudo chown -R monitoring:monitoring /var/log/monitoring

sudo chmod 750 /var/lib/prometheus
sudo chmod 750 /var/lib/alertmanager
```

### Step 2: Download & Install Prometheus

```bash
cd /tmp

# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.53.0/prometheus-2.53.0.linux-amd64.tar.gz

# Extract
tar xzf prometheus-2.53.0.linux-amd64.tar.gz

# Copy binaries
sudo cp prometheus-2.53.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.53.0.linux-amd64/promtool /usr/local/bin/

# Verify installation
prometheus --version

# Clean up
rm -rf prometheus-2.53.0.linux-amd64*
```

### Step 3: Configure Prometheus

**File:** `/etc/monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'eduflow-monitor'

rule_files:
  - '/etc/monitoring/prometheus/alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

scrape_configs:
  - job_name: 'backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3000']
        labels:
          env: 'production'
          service: 'eduflow-backend'

  # Optional: Node Exporter for system metrics
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
        labels:
          env: 'production'
          service: 'system'
```

**Copy to system:**
```bash
sudo cp docker/monitoring/prometheus/prometheus.yml /etc/monitoring/prometheus/
sudo cp docker/monitoring/prometheus/alerts.yml /etc/monitoring/prometheus/
sudo chown -R monitoring:monitoring /etc/monitoring
```

### Step 4: Create Prometheus Systemd Service

**File:** `/etc/systemd/system/prometheus.service`

```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/monitoring/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=30d \
  --web.enable-lifecycle

SyslogIdentifier=prometheus
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
sudo systemctl status prometheus
```

### Step 5: Download & Install Grafana

```bash
cd /tmp

# Add Grafana repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update

# Install Grafana
sudo apt-get install -y grafana-server

# Or download manually:
# wget https://dl.grafana.com/oss/release/grafana-11.1.0.linux-amd64.tar.gz
# tar xzf grafana-11.1.0.linux-amd64.tar.gz
# sudo cp -r grafana-11.1.0/bin/grafana-server /usr/local/bin/
```

**Configure Grafana:**

**File:** `/etc/grafana/grafana.ini`

```ini
[server]
http_addr = 0.0.0.0
http_port = 3000
domain = monitoring.yourdomain.com
root_url = https://monitoring.yourdomain.com

[security]
admin_user = admin
admin_password = CHANGE_THIS_PASSWORD
secret_key = GENERATE_SECURE_KEY_HERE
cookie_secure = true
cookie_samesite = Lax

[auth]
# Enable OAuth/LDAP if desired
# disable_login_form = false
# oauth_auto_login = false

[users]
allow_sign_up = false
allow_org_create = false

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[paths]
data = /var/lib/grafana
logs = /var/log/grafana
plugins = /var/lib/grafana/plugins

[alerting]
enabled = true
execute_alerts = true
```

**Add datasource:**
```bash
# Create provisioning file for Prometheus datasource
cat > /etc/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://localhost:9090
    access: proxy
    isDefault: true
    editable: true
EOF
```

**Add dashboard:**
```bash
# Copy Grafana dashboard
sudo cp docker/monitoring/grafana/dashboards/eduflow-api.json \
  /var/lib/grafana/dashboards/

# Copy provisioning config
sudo cp docker/monitoring/grafana/provisioning/dashboards/dashboards.yml \
  /etc/grafana/provisioning/dashboards/
```

**Start Grafana:**
```bash
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

### Step 6: Download & Install Alertmanager

```bash
cd /tmp

# Download Alertmanager
wget https://github.com/prometheus/alertmanager/releases/download/v0.27.0/alertmanager-0.27.0.linux-amd64.tar.gz

# Extract
tar xzf alertmanager-0.27.0.linux-amd64.tar.gz

# Copy binaries
sudo cp alertmanager-0.27.0.linux-amd64/alertmanager /usr/local/bin/
sudo cp alertmanager-0.27.0.linux-amd64/amtool /usr/local/bin/

# Verify
alertmanager --version

# Clean up
rm -rf alertmanager-0.27.0.linux-amd64*
```

**Configure Alertmanager:**

**File:** `/etc/monitoring/alertmanager/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: 'YOUR_APP_PASSWORD'
  smtp_from: 'alerts@yourdomain.com'

route:
  receiver: 'ops-team'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  routes:
    - match:
        severity: critical
      receiver: 'critical-team'
      group_wait: 0s

receivers:
  - name: 'ops-team'
    email_configs:
      - to: 'ops@yourdomain.com'
        headers:
          Subject: 'Alert: {{ .GroupLabels.alertname }}'

  - name: 'critical-team'
    email_configs:
      - to: 'oncall@yourdomain.com'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts-critical'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
```

**Create Alertmanager Systemd Service:**

**File:** `/etc/systemd/system/alertmanager.service`

```ini
[Unit]
Description=Alertmanager
Wants=network-online.target
After=network-online.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/monitoring/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager \
  --web.external-url=https://alerting.yourdomain.com

SyslogIdentifier=alertmanager
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable alertmanager
sudo systemctl start alertmanager
sudo systemctl status alertmanager
```

### Step 7: (Optional) Install Node Exporter

For system metrics (CPU, memory, disk):

```bash
cd /tmp

# Download
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.0/node_exporter-1.8.0.linux-amd64.tar.gz

# Extract and install
tar xzf node_exporter-1.8.0.linux-amd64.tar.gz
sudo cp node_exporter-1.8.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/node_exporter

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### Step 8: Verify Everything is Running

```bash
# Check services
sudo systemctl status prometheus
sudo systemctl status grafana-server
sudo systemctl status alertmanager
sudo systemctl status node_exporter  # if installed

# Check logs
sudo journalctl -u prometheus -n 20
sudo journalctl -u grafana-server -n 20
sudo journalctl -u alertmanager -n 20

# Check ports
sudo netstat -tlnp | grep -E '9090|3000|9093|9100'

# Expected:
# tcp 0 0 0.0.0.0:9090 LISTEN
# tcp 0 0 0.0.0.0:3000 LISTEN
# tcp 0 0 0.0.0.0:9093 LISTEN
```

---

## 🔐 Accessing Monitoring Systems

### Prometheus Web UI

**URL:** `http://your-server:9090`

**What you can do:**
- Query metrics with PromQL
- View scrape targets
- Check alert rules
- Browse metrics

**Example PromQL Queries:**
```promql
# Payment success rate
rate(eduflow_payments_total{status="success"}[5m])

# Payment processing latency P95
histogram_quantile(0.95, eduflow_payment_processing_time_ms)

# Database query latency
histogram_quantile(0.95, eduflow_db_query_time_ms)

# Active payments
eduflow_active_payments

# API error rate
rate(eduflow_paymob_api_errors_total[5m])
```

### Grafana Dashboards

**URL:** `http://your-server:3000`

**Login:**
- Username: `admin`
- Password: (set in grafana.ini)

**First Time Setup:**
1. Change admin password
2. Add Prometheus datasource (usually auto-detected)
3. Import dashboard: "EduFlow Payment Monitoring"
4. Create user accounts for team members

**Dashboard Panels:**
- Payment Success Rate
- Payment Volume
- Processing Time (P95/P99)
- API Latency
- Error Rate by Type
- Database Performance
- Active Payments
- Webhook Processing
- Enrollment Success
- System Resources

### Alertmanager

**URL:** `http://your-server:9093`

**What you can do:**
- View active alerts
- Check alert history
- Silence alerts temporarily
- View routing rules

**Common Tasks:**
```bash
# View all active alerts
curl http://localhost:9093/api/v1/alerts

# View alert groups
curl http://localhost:9093/api/v1/alerts/groups

# Check Alertmanager status
curl http://localhost:9093/api/v1/status
```

---

## ⚙️ Configuration for Production

### Performance Tuning

**For High-Volume Environments (>1000 metrics/sec):**

**prometheus.yml:**
```yaml
global:
  scrape_interval: 30s        # Increase from 15s
  evaluation_interval: 30s    # Increase from 15s
```

**prometheus.service:**
```ini
ExecStart=/usr/local/bin/prometheus \
  --storage.tsdb.max-block-duration=2h \
  --storage.tsdb.min-block-duration=2h \
  --query.max-concurrency=20
```

**Grafana (grafana.ini):**
```ini
[database]
max_open_conn = 300

[server]
max_body_size = 50
```

### Retention Policy

**Adjust Prometheus retention:**

```ini
# Keep 60 days of data
--storage.tsdb.retention.time=60d

# Or set by size
--storage.tsdb.retention.size=100GB
```

### Enable HTTPS

**Create self-signed certificate:**
```bash
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/monitoring.key \
  -out /etc/ssl/certs/monitoring.crt
```

**Prometheus:**
```ini
--web.tls-server-cert=/etc/ssl/certs/monitoring.crt \
--web.tls-server-key=/etc/ssl/private/monitoring.key
```

**Grafana (grafana.ini):**
```ini
[server]
protocol = https
cert_file = /etc/ssl/certs/monitoring.crt
cert_key = /etc/ssl/private/monitoring.key
```

---

## 🔐 Security & Authentication

### Enable Authentication

**Prometheus (basic auth via reverse proxy):**

Use nginx with HTTP basic auth:

```nginx
server {
    listen 80;
    server_name prometheus.yourdomain.com;

    location / {
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://localhost:9090;
    }
}
```

**Create .htpasswd:**
```bash
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

**Grafana (built-in authentication):**

In `/etc/grafana/grafana.ini`:
```ini
[security]
admin_user = admin
admin_password = STRONG_PASSWORD_HERE
secret_key = $(openssl rand -base64 32)
cookie_secure = true
cookie_samesite = Lax

[auth]
disable_login_form = false
```

### Firewall Rules

```bash
# Allow only from internal network
sudo ufw allow from 192.168.1.0/24 to any port 9090
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 9093

# Allow backend to send metrics
sudo ufw allow from 127.0.0.1 to any port 9090
```

### Backup Configuration

**Backup cron job:**

```bash
cat > /usr/local/bin/backup-monitoring.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/monitoring"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configurations
tar -czf $BACKUP_DIR/prometheus-config-$DATE.tar.gz /etc/monitoring/prometheus/
tar -czf $BACKUP_DIR/alertmanager-config-$DATE.tar.gz /etc/monitoring/alertmanager/
tar -czf $BACKUP_DIR/grafana-config-$DATE.tar.gz /etc/grafana/

# Backup Grafana database
cp /var/lib/grafana/grafana.db $BACKUP_DIR/grafana-db-$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-monitoring.sh
```

**Add to crontab:**
```bash
# Backup daily at 2 AM
0 2 * * * /usr/local/bin/backup-monitoring.sh
```

---

## 🛠️ Maintenance & Backup

### Daily Tasks

```bash
# Check service status
sudo systemctl status prometheus grafana-server alertmanager

# Check disk usage
du -h /var/lib/prometheus
du -h /var/lib/grafana

# Monitor log files
sudo journalctl -u prometheus -n 50
```

### Weekly Tasks

```bash
# Verify metrics are being collected
curl http://localhost:9090/api/v1/query?query=up

# Check Alertmanager alert count
curl http://localhost:9093/api/v1/alerts | jq '.data | length'

# Backup configurations and databases
/usr/local/bin/backup-monitoring.sh
```

### Monthly Tasks

```bash
# Review and optimize alert rules
# - Check false positives
# - Adjust thresholds based on baselines
# - Disable irrelevant alerts

# Review Prometheus retention
du -h /var/lib/prometheus

# Update monitoring software
sudo apt-get update
sudo apt-get upgrade prometheus grafana-server alertmanager
```

### Disaster Recovery

**Restore from backup:**

```bash
# Restore configurations
tar -xzf /backups/monitoring/prometheus-config-20260424_020000.tar.gz -C /

# Restore Grafana database
sudo cp /backups/monitoring/grafana-db-20260424_020000.db /var/lib/grafana/grafana.db
sudo chown grafana:grafana /var/lib/grafana/grafana.db

# Restart services
sudo systemctl restart prometheus grafana-server alertmanager
```

---

## 🔧 Troubleshooting

### Prometheus Not Scraping Backend

**Check:**
```bash
# Verify backend is running
curl http://localhost:3000/api/v1/health

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Prometheus logs
sudo journalctl -u prometheus -n 50
```

**Solutions:**
```bash
# If backend is not in targets, edit prometheus.yml
# Verify static_configs has correct target: localhost:3000

# If metrics endpoint is 404
# Verify backend has PROMETHEUS_METRICS_ENABLED=true

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload
```

### Grafana Shows No Data

**Check:**
```bash
# Verify datasource is configured
curl http://localhost:3000/api/datasources

# Test datasource query
curl http://localhost:3000/api/datasources/1/health
```

**Solutions:**
```bash
# Recreate datasource if broken
# Check Prometheus is running and returning metrics
# Verify dashboard is using correct datasource
```

### Alerts Not Firing

**Check:**
```bash
# View all alerts in Prometheus
curl http://localhost:9090/api/v1/alerts

# Check Alertmanager configuration
sudo alertmanager -version
sudo amtool config routes
```

**Solutions:**
```bash
# Verify alert rules in prometheus.yml
# Check alert thresholds are being met
# Verify Alertmanager is receiving alerts
curl http://localhost:9093/api/v1/alerts

# Manually test email config
sudo -u monitoring /usr/local/bin/alertmanager --config.file=/etc/monitoring/alertmanager/alertmanager.yml
```

### High Memory Usage

**Check:**
```bash
ps aux | grep prometheus
ps aux | grep grafana
```

**Solutions:**
```bash
# Reduce scrape interval in prometheus.yml
scrape_interval: 30s  # Increase from 15s

# Reduce Prometheus retention
--storage.tsdb.retention.time=14d  # Reduce from 30d

# Restart services
sudo systemctl restart prometheus
```

### Disk Space Issues

**Check:**
```bash
df -h /var/lib/prometheus
du -sh /var/lib/prometheus/*
```

**Solutions:**
```bash
# Reduce retention
--storage.tsdb.retention.size=50GB

# Or clean old data manually
sudo -u monitoring /usr/local/bin/prometheus --storage.tsdb.path=/var/lib/prometheus
# Ctrl+C after data cleanup

# Restart
sudo systemctl restart prometheus
```

---

## 📊 Performance Tuning

### Query Performance

**Optimize PromQL queries:**
```promql
# Bad (slow)
{job="backend"}

# Good (fast)
{job="backend", instance="localhost:3000"}

# Bad (very slow)
rate(eduflow_payments_total[1d])

# Good (fast)
rate(eduflow_payments_total[5m])
```

### Prometheus Optimization

```bash
# Increase query concurrency
--query.max-concurrency=20

# Limit samples per query
--query.max-samples=10000000

# Enable compression
--storage.tsdb.compression=snappy
```

### Grafana Optimization

**grafana.ini:**
```ini
[database]
max_open_conn = 300
log_queries = false

[server]
cache_type = memory
cache_default_ttl = 60s
```

---

## ✅ Production Checklist

Before deploying to production:

- [ ] All services running and healthy
- [ ] HTTPS enabled with valid certificates
- [ ] Authentication configured (admin passwords changed)
- [ ] Email notifications configured and tested
- [ ] Slack notifications configured and tested
- [ ] Backup scripts running daily
- [ ] Firewall rules configured
- [ ] Monitoring for the monitors (Prometheus monitoring itself)
- [ ] Disk space monitoring enabled
- [ ] Team trained on Grafana dashboards
- [ ] Runbooks created for common alerts
- [ ] On-call rotation established
- [ ] SLO targets defined
- [ ] Alert thresholds tuned after baseline observation

---

## 📞 Support & Resources

### Quick Reference

**Service Files:**
- Prometheus: `/etc/systemd/system/prometheus.service`
- Grafana: `/etc/systemd/system/grafana-server.service`
- Alertmanager: `/etc/systemd/system/alertmanager.service`

**Configuration Files:**
- Prometheus config: `/etc/monitoring/prometheus/prometheus.yml`
- Alertmanager config: `/etc/monitoring/alertmanager/alertmanager.yml`
- Grafana config: `/etc/grafana/grafana.ini`

**Data Directories:**
- Prometheus data: `/var/lib/prometheus`
- Grafana data: `/var/lib/grafana`
- Alertmanager data: `/var/lib/alertmanager`
- Logs: `/var/log/monitoring`

**Management Commands:**
```bash
# Start/stop/restart
sudo systemctl start|stop|restart prometheus
sudo systemctl start|stop|restart grafana-server
sudo systemctl start|stop|restart alertmanager

# Check status
sudo systemctl status prometheus

# View logs
sudo journalctl -u prometheus -n 50 -f

# Reload configuration
curl -X POST http://localhost:9090/-/reload
```

### Documentation Links

- **Prometheus Docs:** https://prometheus.io/docs/
- **Grafana Docs:** https://grafana.com/docs/grafana/latest/
- **Alertmanager Docs:** https://prometheus.io/docs/alerting/latest/alertmanager/
- **PromQL Guide:** https://prometheus.io/docs/prometheus/latest/querying/basics/

---

## 🎯 Next Steps After Deployment

1. **Monitor the Monitors**
   - Set up alerting for Prometheus/Grafana/Alertmanager themselves
   - Monitor disk space and memory usage

2. **Establish Baselines**
   - Run for 1-2 weeks to collect baseline metrics
   - Observe normal patterns
   - Tune alert thresholds based on baselines

3. **Create Runbooks**
   - Document response procedures for each alert
   - Who should be notified
   - What actions to take

4. **Train Team**
   - Train ops team on Grafana dashboards
   - Train on-call engineers on alert procedures
   - Share runbooks and escalation procedures

5. **Continuous Improvement**
   - Review alerts monthly for false positives
   - Update thresholds based on improvements
   - Add new metrics as needed
   - Archive old data to manage disk space

---

**Version:** 1.0  
**Last Updated:** April 24, 2026  
**Status:** Production Ready ✅
