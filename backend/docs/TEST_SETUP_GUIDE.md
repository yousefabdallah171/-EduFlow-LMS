# Test Setup and Execution Guide

## Overview

The EduFlow LMS backend has comprehensive test coverage with four test suites:

- **Unit Tests**: Business logic validation (10 test files)
- **Integration Tests**: API endpoints and database workflows (18 test files)
- **Security Tests**: SQL injection, email injection, XSS, path traversal (1 test file)
- **Performance Tests**: Response time benchmarks and concurrent request handling (1 test file)

---

## Prerequisites

### 1. PostgreSQL Database

Tests require a PostgreSQL database running locally.

**Windows Installation:**

```bash
# Using Chocolatey (if installed)
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
# During installation:
# - Set password for 'postgres' user
# - Use port 5432 (default)
# - Install pgAdmin (optional)

# Verify installation
psql --version
```

**Starting PostgreSQL on Windows:**

```bash
# If installed as Windows service, it starts automatically
# Or start manually:
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start

# Or use pgAdmin to start the database
```

**Create test database:**

```bash
# Connect as postgres user
psql -U postgres

# Inside psql:
CREATE USER eduflow_test WITH PASSWORD 'test_password_123';
CREATE DATABASE eduflow_test OWNER eduflow_test;
GRANT ALL PRIVILEGES ON DATABASE eduflow_test TO eduflow_test;
\q
```

### 2. Redis Server

Tests require Redis running locally for caching.

**Windows Installation:**

```bash
# Using WSL2 (recommended for Windows 10/11)
wsl --install
# Then install Redis in WSL:
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start

# Or use Windows native binary:
# https://github.com/microsoftarchive/redis/releases
# Download and extract MSOpenTech Redis

# Verify connection
redis-cli ping
# Should return: PONG
```

### 3. Node.js Dependencies

```bash
cd backend
pnpm install
# or: npm install
```

---

## Environment Setup

### Test Configuration

The test suite uses `.env.test` file for test environment variables. This file is provided and configured for local development.

**Key differences from production:**
- Database points to localhost:5432 (test instance)
- Redis points to localhost:6379 (test instance)
- SMTP uses localhost:1025 (mock mail server)
- All secrets use test values (NOT production secrets)

### Running with Custom Database URL

If your local database is configured differently:

```bash
# Override DATABASE_URL for a single test run
DATABASE_URL="postgresql://user:password@host:port/db?schema=public" npm run test

# Or set environment variable
export DATABASE_URL="postgresql://user:password@host:port/db?schema=public"
npm run test
```

---

## Running Tests

### 1. Unit Tests Only (No Database Required)

```bash
npm run test:unit
```

This runs tests that don't require external services:
- Payment service logic
- HMAC validation
- Coupon calculations
- Authentication utilities
- Webhook parsing

### 2. Integration Tests (Requires Database & Redis)

```bash
npm run test:integration
```

Tests that verify API endpoints and database workflows:
- User authentication (register, login, refresh token)
- Course enrollment and revocation
- Lesson progress tracking
- Payment processing
- Video token generation
- Admin operations (student search, orders, settings)

### 3. Security Tests (Requires Database & Redis)

```bash
npm run test:security
```

Tests that verify security controls:
- SQL injection prevention (10+ payloads)
- Email header injection prevention
- XSS payload rejection
- Path traversal prevention
- Rate limiting
- JWT validation
- RBAC enforcement

### 4. Performance Tests (Requires Database & Redis)

```bash
npm run test:performance
```

Benchmarks API response times:
- Registration: <500ms target
- Login: <300ms target
- Profile fetch: <150ms target
- Dashboard: <500ms target
- Lesson listing: <300ms target
- Cache performance: Hit vs miss comparison

### 5. All Tests

```bash
npm run test
```

Runs all test suites (unit + integration + security + performance).

### 6. With Coverage Report

```bash
COVERAGE=true npm run test
```

Generates HTML coverage report in `coverage/` directory.

**Coverage Thresholds:**
- Lines: 70%
- Functions: 70%
- Statements: 70%
- Branches: 60%

---

## Test Execution Behavior

### Vitest Configuration

- **File Parallelism**: Disabled (serial execution) for database isolation
- **Global Setup**: Creates unique PostgreSQL schema per test run
- **Cleanup**: Drops schema after tests complete
- **Hook Timeout**: 30 seconds (for database setup)

### Schema Management

Tests automatically:
1. Create unique schema: `vitest_<timestamp>_<uuid>`
2. Run Prisma migrations
3. Seed data if needed
4. Drop schema on completion

This ensures:
- No test data pollution between runs
- Parallel test execution (each gets isolated schema)
- Clean state for every test run

---

## Troubleshooting

### "Can't reach database server"

**Problem**: `PrismaClientInitializationError: Can't reach database server at localhost:5432`

**Solutions:**
1. Verify PostgreSQL is running: `psql -U postgres`
2. Verify database exists: `psql -U eduflow_test -d eduflow_test`
3. Check DATABASE_URL is correct in `.env.test`
4. Ensure firewall allows localhost:5432

### "Connection refused" (Redis)

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
1. Start Redis: `redis-server` (or `sudo service redis-server start` on WSL)
2. Verify Redis is running: `redis-cli ping` (should return PONG)
3. Check REDIS_URL in `.env.test`

### "Timeout" errors

**Problem**: Tests take longer than expected or timeout

**Solutions:**
1. Check database is responsive: `psql -U eduflow_test -d eduflow_test -c "SELECT 1"`
2. Check Redis is responsive: `redis-cli ping`
3. Clear test storage: `rm -rf .vitest-storage/`
4. Increase hook timeout in `vitest.config.ts` if needed

### "Permission denied" (Windows)

**Problem**: Cannot start PostgreSQL or other services

**Solutions:**
1. Run Command Prompt as Administrator
2. Check Windows Defender isn't blocking services
3. Verify port 5432 isn't in use: `netstat -ano | findstr :5432`

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: eduflow_test
          POSTGRES_PASSWORD: test_password_123
          POSTGRES_DB: eduflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://eduflow_test:test_password_123@localhost:5432/eduflow_test?schema=public
          REDIS_URL: redis://localhost:6379
        run: pnpm run test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Organization

### Unit Tests (`tests/unit/`)
- `analytics.test.ts` - Analytics calculations
- `coupon.test.ts` - Coupon validation and redemption
- `hmac.test.ts` - Payment signature verification
- `payment-errors.test.ts` - Payment error handling
- `payment.service.test.ts` - Payment service logic
- `refund.service.test.ts` - Refund processing
- `repositories/payment.repository.test.ts` - Payment repository queries
- `services/admin-payment.service.test.ts` - Admin payment operations
- `services/payment-event.service.test.ts` - Payment event processing
- `webhook.service.test.ts` - Webhook parsing and validation

### Integration Tests (`tests/integration/`)
- `auth.test.ts` - Registration, login, token refresh
- `complete-user-journey.test.ts` - Full user flow: register → enroll → watch → complete
- `enrollment.test.ts` - Enrollment and revocation
- `student-dashboard.test.ts` - Dashboard data and caching
- `progress.test.ts` - Lesson progress tracking
- `payment-webhook.test.ts` - Payment webhook processing
- `video-token.test.ts` - Video token generation and validation
- `video-hardening.test.ts` - Video security and streaming
- `admin-orders.test.ts` - Admin order management
- `admin-payments.integration.test.ts` - Admin payment operations
- `audit-log.test.ts` - Audit logging
- `notes.test.ts` - Student note-taking
- `preview.test.ts` - Course preview access
- `tus-upload.test.ts` - Media file uploads
- `webhook.integration.test.ts` - Webhook validation
- `single-session.test.ts` - Session management
- `failure-recovery.integration.test.ts` - Error recovery
- `refund.integration.test.ts` - Refund workflows

### Security Tests (`tests/security/`)
- `injection-prevention.test.ts` - SQL injection, email injection, XSS, path traversal

### Performance Tests (`tests/performance/`)
- `api-performance.test.ts` - Response time benchmarks

---

## Next Steps After Tests Pass

1. **Code Coverage Review**
   - Review coverage report: `open coverage/index.html`
   - Target: 70% lines, 70% functions, 70% statements, 60% branches

2. **Production Readiness Checklist**
   - Review: `backend/docs/PRODUCTION_READINESS_CHECKLIST.md`
   - Complete all security, infrastructure, and compliance items

3. **Performance Optimization**
   - Review performance benchmarks from test results
   - Ensure all API endpoints meet <500ms p95 target

4. **Monitoring Setup**
   - Configure Prometheus for metrics collection
   - Set up Grafana dashboards
   - Configure Sentry error tracking
   - Set up log aggregation (ELK Stack)

5. **Deployment Preparation**
   - Build Docker image: `npm run build`
   - Prepare Kubernetes manifests
   - Configure CI/CD pipeline
   - Set up blue-green deployment strategy

---

## Running Individual Test Files

To run a specific test file:

```bash
npm run test -- tests/integration/auth.test.ts
npm run test -- tests/security/injection-prevention.test.ts
npm run test -- tests/performance/api-performance.test.ts
```

To run tests matching a pattern:

```bash
npm run test -- --grep "should register user"
npm run test -- --grep "SQL injection"
```

---

For issues or questions, refer to the test files themselves for detailed test cases and expectations.
