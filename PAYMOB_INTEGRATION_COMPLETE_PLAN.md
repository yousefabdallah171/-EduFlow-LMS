# EduFlow LMS - Complete Paymob Integration Plan with Testing, Debugging & UI

**Document Version:** 2.0 (UPDATED)  
**Date:** April 24, 2026  
**Status:** Comprehensive Plan - Ready for Implementation  
**Total Phases:** 11 (was 9, expanded with UI + Testing)  
**Total Tasks:** 88 (was 72, expanded with testing/debugging)  
**Key Addition:** Every phase has dedicated testing, debugging, and edge case handling  

---

## Overview: What Changed from v1.0

✅ Added **Phase 0: Debugging Infrastructure** - Logging, error tracking, diagnostics  
✅ Added **Phase 10: Payment Page UI Design** - Complete UX/UI for checkout, success, failure pages  
✅ Added **Testing tasks to every phase** - Unit + Integration + E2E tests with debugging  
✅ Added **Edge case testing** for all scenarios  
✅ Added **Diagnostics tools** - Tools to debug issues in production  
✅ Added **Error tracking setup** - Sentry/Rollbar integration for error reporting  
✅ Added **Local debugging tools** - For development environment  
✅ Added **Mock server setup** - Mock Paymob API for testing without secrets  

---

# PHASE 0: Debugging Infrastructure & Error Tracking

**Objective:** Set up comprehensive logging, error tracking, and debugging tools

---

## [0.1] Backend Logging Infrastructure

**Description:** Structured logging for all payment operations

**Subtasks:**
- [ ] Create `backend/src/observability/logger.ts`:
  ```typescript
  import winston from "winston";
  
  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.errors({ stack: true })
    ),
    defaultMeta: { service: "eduflow-payment" },
    transports: [
      new winston.transports.File({ 
        filename: "logs/error.log", 
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({ 
        filename: "logs/combined.log",
        maxsize: 5242880,
        maxFiles: 10
      })
    ]
  });
  
  if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
  ```
- [ ] Create logging helper with context:
  ```typescript
  export function createPaymentLogger(paymentId: string, userId: string) {
    return {
      info: (msg: string, data?: any) => 
        logger.info(msg, { paymentId, userId, ...data }),
      error: (msg: string, error: Error, data?: any) => 
        logger.error(msg, { paymentId, userId, error: error.message, stack: error.stack, ...data }),
      debug: (msg: string, data?: any) => 
        logger.debug(msg, { paymentId, userId, ...data }),
      warn: (msg: string, data?: any) => 
        logger.warn(msg, { paymentId, userId, ...data })
    };
  }
  ```
- [ ] Install dependencies:
  - [ ] `npm install winston`
  - [ ] `npm install --save-dev @types/winston`
- [ ] Create `logs/` directory in project root
- [ ] Add to `.gitignore`:
  ```
  /logs/**
  !/logs/.gitkeep
  ```
- [ ] Test logging:
  - [ ] Create payment
  - [ ] Verify log files created
  - [ ] Verify correct format (JSON)
  - [ ] Verify searchable fields (paymentId, userId, timestamp)

**Acceptance Criteria:**
- [ ] Logger configured
- [ ] All log files created
- [ ] Logs searchable by paymentId/userId
- [ ] Test passes

---

## [0.2] Sentry Error Tracking Setup

**Description:** Integrate Sentry for production error reporting

**Subtasks:**
- [ ] Create Sentry project (if not exists):
  - [ ] Sign up at sentry.io (or self-hosted)
  - [ ] Create project for "EduFlow Payment"
  - [ ] Get DSN (Data Source Name)
  - [ ] Add to `.env`: `SENTRY_DSN=https://...@sentry.io/...`
- [ ] Install Sentry SDK:
  - [ ] `npm install @sentry/node @sentry/tracing`
- [ ] Configure in `backend/src/app.ts`:
  ```typescript
  import * as Sentry from "@sentry/node";
  import * as Tracing from "@sentry/tracing";
  
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% of transactions
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({
          app: true,
          request: true,
          transaction: "middleware"
        })
      ]
    });
    
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
  ```
- [ ] Add error handler with Sentry:
  ```typescript
  app.use((error, req, res, next) => {
    Sentry.captureException(error, {
      tags: {
        userId: req.user?.userId,
        paymentId: req.body?.paymentId
      },
      contexts: {
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body // Be careful with sensitive data
        }
      }
    });
    
    // Return error response
    res.status(500).json({ error: "Internal server error" });
  });
  
  app.use(Sentry.Handlers.errorHandler());
  ```
- [ ] Configure data scrubbing to remove sensitive info:
  - [ ] Scrub card data
  - [ ] Scrub email addresses
  - [ ] Scrub API keys
- [ ] Test error tracking:
  - [ ] Cause an error
  - [ ] Verify error appears in Sentry dashboard
  - [ ] Verify context (userId, paymentId) included
  - [ ] Verify stack trace readable

**Acceptance Criteria:**
- [ ] Sentry integrated
- [ ] Errors tracked
- [ ] Context included
- [ ] Sensitive data scrubbed
- [ ] Test passes

---

## [0.3] Frontend Error Logging & Tracking

**Description:** Track frontend errors and user actions

**Subtasks:**
- [ ] Create `frontend/src/lib/error-tracking.ts`:
  ```typescript
  import * as Sentry from "@sentry/react";
  
  export function initErrorTracking() {
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        integrations: [
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true
          })
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0 // Capture all replays on error
      });
    }
  }
  
  export function captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      contexts: {
        react: context
      }
    });
  }
  ```
- [ ] Create frontend logger:
  ```typescript
  export const frontendLogger = {
    info: (msg: string, data?: any) => {
      console.log(`[INFO] ${msg}`, data);
      if (import.meta.env.DEV) localStorage.setItem(
        `payment_log_${Date.now()}`,
        JSON.stringify({ level: "info", msg, data, time: new Date().toISOString() })
      );
    },
    error: (msg: string, error: Error, data?: any) => {
      console.error(`[ERROR] ${msg}`, error, data);
      captureException(error, { msg, ...data });
    },
    debug: (msg: string, data?: any) => {
      if (import.meta.env.DEV) {
        console.debug(`[DEBUG] ${msg}`, data);
      }
    }
  };
  ```
- [ ] Install Sentry React:
  - [ ] `npm install @sentry/react @sentry/tracing`
- [ ] Add to `frontend/src/main.tsx`:
  ```typescript
  import { initErrorTracking } from "@/lib/error-tracking";
  initErrorTracking();
  ```
- [ ] Add error boundary component:
  ```typescript
  import * as Sentry from "@sentry/react";
  
  const ErrorBoundary = Sentry.withErrorBoundary(
    ({ children }) => children,
    { 
      fallback: <ErrorFallback />,
      showDialog: true 
    }
  );
  ```
- [ ] Test frontend error tracking:
  - [ ] Cause an error
  - [ ] Verify Sentry receives it
  - [ ] Verify browser console shows error
  - [ ] Verify localStorage has logs (dev mode)

**Acceptance Criteria:**
- [ ] Frontend error tracking integrated
- [ ] Errors sent to Sentry
- [ ] Local logging works
- [ ] Test passes

---

## [0.4] Request/Response Logging Middleware

**Description:** Log all API requests and responses for debugging

**Subtasks:**
- [ ] Create `backend/src/middleware/request-logging.middleware.ts`:
  ```typescript
  export const requestLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || crypto.randomUUID();
    
    // Store in request for later use
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    
    // Log incoming request
    logger.debug("Incoming request", {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    // Capture response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      logger.info("Request completed", {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.user?.userId
      });
      
      // Add request ID to response
      if (typeof data === "object") {
        data._requestId = requestId;
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
  ```
- [ ] Add to app middleware stack:
  ```typescript
  app.use(requestLoggingMiddleware);
  ```
- [ ] Log payment-specific requests with more detail:
  ```typescript
  // In payment controller
  logPaymentRequest(req, "checkout", { couponCode, packageId });
  ```
- [ ] Create log query tool:
  ```typescript
  // Can search logs by requestId to see full flow
  // Example: grep -r "req-xxx" logs/
  ```
- [ ] Test request logging:
  - [ ] Make payment API call
  - [ ] Verify request logged
  - [ ] Verify response logged
  - [ ] Verify request ID in response header
  - [ ] Search logs by request ID

**Acceptance Criteria:**
- [ ] All requests logged
- [ ] Request IDs tracked
- [ ] Can trace full request flow
- [ ] Test passes

---

## [0.5] Payment Operation Audit Trail

**Description:** Log every payment operation for compliance and debugging

**Subtasks:**
- [ ] Create `backend/src/middleware/audit-trail.middleware.ts`:
  ```typescript
  export const auditTrailMiddleware = (req, res, next) => {
    const auditLog = {
      timestamp: new Date(),
      requestId: req.requestId,
      action: getActionFromPath(req.path, req.method),
      actor: {
        userId: req.user?.userId,
        role: req.user?.role,
        ip: req.ip
      },
      resource: {
        type: "payment",
        id: req.params.paymentId || req.body?.paymentId
      },
      details: {
        method: req.method,
        path: req.path,
        status: res.statusCode
      }
    };
    
    storeAuditLog(auditLog);
    next();
  };
  ```
- [ ] Store audit logs in database:
  ```typescript
  model AuditLog {
    id: String @id @default(cuid())
    timestamp: DateTime @default(now())
    requestId: String
    action: String // CREATE_PAYMENT, PROCESS_WEBHOOK, REFUND, etc.
    actorUserId: String?
    actorRole: String?
    actorIp: String?
    resourceType: String // "payment", "refund", etc.
    resourceId: String?
    details: Json
    
    @@index([timestamp])
    @@index([action])
    @@index([actorUserId])
    @@index([resourceId])
  }
  ```
- [ ] Add audit log endpoints:
  - [ ] Admin can query audit trail by payment ID
  - [ ] Admin can export audit logs for compliance
- [ ] Test audit trail:
  - [ ] Perform payment operation
  - [ ] Query audit log
  - [ ] Verify action recorded
  - [ ] Verify actor info included

**Acceptance Criteria:**
- [ ] All operations logged
- [ ] Audit trail queryable
- [ ] Compliance data captured
- [ ] Test passes

---

## [0.6] Development Debug Tools

**Description:** Tools to debug payment flow locally

**Subtasks:**
- [ ] Create `backend/src/dev/payment-debugger.ts`:
  ```typescript
  export const paymentDebugger = {
    // Simulate webhook without Paymob
    simulateWebhook: async (paymentId: string, success: boolean) => {
      const payment = await paymentRepository.findById(paymentId);
      if (!success) {
        return await paymentService.processWebhook({
          obj: {
            success: false,
            error: { code: "CARD_DECLINED", message: "Test decline" }
          }
        }, "test-hmac");
      } else {
        return await paymentService.processWebhook({
          obj: {
            success: true,
            id: `test-tx-${Date.now()}`,
            order: { merchant_order_id: paymentId }
          }
        }, "test-hmac");
      }
    },
    
    // List all payments in order
    listPaymentsWithDetails: async (limit = 10) => {
      return await prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { events: true, user: { select: { email: true } } }
      });
    },
    
    // Get payment timeline
    getPaymentTimeline: async (paymentId: string) => {
      const payment = await paymentRepository.getDetailWithEvents(paymentId);
      return {
        payment: {
          id: payment.id,
          status: payment.status,
          created: payment.createdAt,
          amount: payment.amountPiasters
        },
        timeline: payment.events.map(e => ({
          time: e.createdAt,
          type: e.eventType,
          status: e.status,
          note: getEventDescription(e.eventType)
        }))
      };
    }
  };
  ```
- [ ] Add debug endpoints (dev only):
  - [ ] POST /dev/payments/:paymentId/webhook/success - simulate success
  - [ ] POST /dev/payments/:paymentId/webhook/failure - simulate failure
  - [ ] GET /dev/payments - list recent payments
  - [ ] GET /dev/payments/:paymentId/timeline - show event timeline
- [ ] Add guard to only allow in dev:
  ```typescript
  if (process.env.NODE_ENV === "production") {
    throw new Error("Debug endpoints not available in production");
  }
  ```
- [ ] Create CLI tool `bin/debug-payment.js`:
  ```bash
  node bin/debug-payment.js <paymentId>
  # Output: Full payment state + events + logs
  ```
- [ ] Test debug tools:
  - [ ] Create payment
  - [ ] Use debug endpoint to simulate webhook
  - [ ] Verify state updated
  - [ ] Use CLI to view timeline

**Acceptance Criteria:**
- [ ] Debug tools created
- [ ] Available in dev only
- [ ] Can simulate webhooks
- [ ] Can view payment timeline
- [ ] Test passes

---

## [0.7] Performance Monitoring

**Description:** Track performance metrics for debugging slowdowns

**Subtasks:**
- [ ] Create performance tracking:
  ```typescript
  export const perfTracker = {
    track: async (label: string, fn: () => Promise<any>) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        logger.debug(`Performance: ${label}`, { duration });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Performance (error): ${label}`, error, { duration });
        throw error;
      }
    }
  };
  ```
- [ ] Use in critical paths:
  ```typescript
  await perfTracker.track("paymob_auth_token", async () => {
    return await paymobRequest("/auth/tokens", { api_key });
  });
  
  await perfTracker.track("paymob_create_order", async () => {
    return await paymobRequest("/ecommerce/orders", { ... });
  });
  ```
- [ ] Create performance dashboard:
  - [ ] Average response time per endpoint
  - [ ] P95, P99 latencies
  - [ ] Slow query detection
- [ ] Test performance tracking:
  - [ ] Perform operation
  - [ ] Verify timing logged
  - [ ] Verify metrics correct

**Acceptance Criteria:**
- [ ] Performance tracked
- [ ] Metrics queryable
- [ ] Slow operations visible
- [ ] Test passes

---

## [0.8] Email Alert System for Errors & Issues

**Description:** Send automated email alerts with log files when errors occur

**Subtasks:**
- [ ] **Configure SMTP:**
  - [ ] Add environment variables to `.env`:
    ```
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your-email@gmail.com
    SMTP_PASSWORD=your-app-password
    ALERT_EMAIL=yoseabdallah866@gmail.com
    NODE_ENV=production
    ```
  - [ ] For Gmail: Use App Password (enable 2FA, generate app password)
  - [ ] Or use SendGrid, Mailgun, etc.
  - [ ] Test SMTP connection before deployment

- [ ] **Create email alert service:**
  ```typescript
  // backend/src/services/alert-email.service.ts
  import nodemailer from "nodemailer";
  import fs from "fs";
  
  export const alertEmailService = {
    async sendErrorAlert(errorInfo: {
      title: string;        // "High Error Rate Detected"
      severity: "ERROR" | "WARNING" | "CRITICAL";
      count?: number;       // Number of errors
      errorCodes?: string[]; // List of error codes
      startTime?: Date;
      endTime?: Date;
      logFile?: string;     // Path to log file to attach
      description?: string; // Additional context
    }) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
      
      const logContent = errorInfo.logFile 
        ? fs.readFileSync(errorInfo.logFile, "utf-8")
        : null;
      
      const attachments = [];
      if (logContent) {
        attachments.push({
          filename: `error-logs-${Date.now()}.log`,
          content: logContent,
          contentType: "text/plain"
        });
      }
      
      const severityBg = {
        "ERROR": "#FFA500",
        "WARNING": "#FFD700",
        "CRITICAL": "#FF0000"
      };
      
      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="border-left: 4px solid ${severityBg[errorInfo.severity]}; padding-left: 12px; margin-bottom: 16px;">
                <h2 style="margin: 0; color: ${severityBg[errorInfo.severity]};">🚨 ${errorInfo.title}</h2>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">Severity: <strong>${errorInfo.severity}</strong></p>
              </div>
              
              <div style="background: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
                <h3 style="margin-top: 0; color: #333;">Details</h3>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                ${errorInfo.count ? `<p><strong>Error Count:</strong> ${errorInfo.count}</p>` : ""}
                ${errorInfo.startTime ? `<p><strong>Time Range:</strong> ${errorInfo.startTime.toISOString()} to ${errorInfo.endTime?.toISOString()}</p>` : ""}
                ${errorInfo.errorCodes?.length ? `<p><strong>Error Codes:</strong> ${errorInfo.errorCodes.join(", ")}</p>` : ""}
              </div>
              
              ${errorInfo.description ? `
                <div style="background: #fffbea; padding: 12px; border-radius: 4px; border-left: 3px solid #FFD700; margin-bottom: 16px;">
                  <h4 style="margin-top: 0;">Description</h4>
                  <p style="margin: 0;">${errorInfo.description}</p>
                </div>
              ` : ""}
              
              <div style="background: #f0f0f0; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  Log file attached: <code>error-logs-${Date.now()}.log</code>
                </p>
              </div>
              
              <div style="text-align: center; padding-top: 16px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated alert from EduFlow Payment System
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL,
        subject: `[${errorInfo.severity}] ${errorInfo.title}`,
        html: htmlBody,
        attachments
      });
      
      logger.info("Alert email sent", {
        title: errorInfo.title,
        severity: errorInfo.severity,
        recipient: process.env.ALERT_EMAIL
      });
    }
  };
  ```
- [ ] Install nodemailer:
  ```bash
  npm install nodemailer
  npm install --save-dev @types/nodemailer
  ```

- [ ] **Create error aggregator:**
  ```typescript
  // backend/src/services/error-aggregator.service.ts
  export const errorAggregator = {
    errors: [] as Array<{ code: string; timestamp: Date; count: number }>,
    
    async trackError(errorCode: string) {
      const existing = this.errors.find(e => e.code === errorCode);
      if (existing) {
        existing.count++;
      } else {
        this.errors.push({ code: errorCode, timestamp: new Date(), count: 1 });
      }
      
      // Check if should trigger alert
      if (existing && existing.count >= 5) {
        await this.sendAlert();
      }
    },
    
    async sendAlert() {
      const recentErrors = this.errors.filter(
        e => Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // Last 5 mins
      );
      
      const logFile = await this.generateLogFile(recentErrors);
      
      await alertEmailService.sendErrorAlert({
        title: `Payment System - High Error Rate (${recentErrors.length} errors in 5 mins)`,
        severity: "CRITICAL",
        count: recentErrors.length,
        errorCodes: recentErrors.map(e => e.code),
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        endTime: new Date(),
        logFile,
        description: `${recentErrors.length} errors detected in last 5 minutes. Check attached logs for details.`
      });
      
      this.errors = []; // Reset
    },
    
    async generateLogFile(errors: any[]) {
      const fileName = `/tmp/error-logs-${Date.now()}.log`;
      const content = errors
        .map(e => `[${e.timestamp.toISOString()}] ${e.code} (count: ${e.count})`)
        .join("\n");
      
      fs.writeFileSync(fileName, content);
      return fileName;
    }
  };
  ```

- [ ] **Hook into payment service:**
  ```typescript
  // In payment.service.ts
  catch (error) {
    await errorAggregator.trackError(error.code);
    // ... existing error handling
  }
  ```

- [ ] **Create alert rules/thresholds:**
  ```typescript
  export const alertRules = {
    ERROR_THRESHOLD: 5,           // Alert if > 5 errors
    WARNING_THRESHOLD: 10,         // Warning if > 10 errors
    CHECK_INTERVAL_MINUTES: 5,     // Check every 5 minutes
    TIME_WINDOW_MINUTES: 5,        // Look back 5 minutes
    
    errorCodesToAlert: [
      "PAYMOB_API_ERROR",
      "WEBHOOK_PROCESSING_ERROR",
      "DATABASE_ERROR",
      "ENROLLMENT_FAILED",
      "EMAIL_FAILED"
    ]
  };
  ```

- [ ] **Setup scheduled check:**
  ```typescript
  // Run every 5 minutes
  setInterval(async () => {
    const errorCount = errorAggregator.errors.length;
    if (errorCount >= alertRules.ERROR_THRESHOLD) {
      await errorAggregator.sendAlert();
    }
  }, alertRules.CHECK_INTERVAL_MINUTES * 60 * 1000);
  ```

- [ ] **Add different alert types:**
  - [ ] CRITICAL: Errors > threshold
  - [ ] WARNING: Errors > 5
  - [ ] INFO: Daily summary (optional)
  - [ ] Webhooks not arriving for > 10 min
  - [ ] Database connection issues
  - [ ] Paymob API errors

- [ ] **Attach full logs to email:**
  - [ ] Last 100 error logs
  - [ ] Formatted as plain text file
  - [ ] Include timestamps, error codes, paymentIds
  - [ ] Searchable format

- [ ] **Test email alerts:**
  - [ ] Cause test error
  - [ ] Verify email sent
  - [ ] Verify log file attached
  - [ ] Verify email is readable
  - [ ] Verify attachment can be downloaded

**Acceptance Criteria:**
- [ ] SMTP configured
- [ ] Email alerts send on errors
- [ ] Log files attached
- [ ] Email is HTML formatted
- [ ] Configurable thresholds
- [ ] Test passes

---

## [0.9] Dashboard for Email Alert Configuration

**Description:** Admin dashboard to configure alert settings

**Subtasks:**
- [ ] Create `backend/src/admin/alert-config.ts`:
  - [ ] GET /api/v1/admin/alert-settings - Get current settings
  - [ ] POST /api/v1/admin/alert-settings - Update settings
  - [ ] Settings include:
    - [ ] Alert email address
    - [ ] Error threshold
    - [ ] Check interval
    - [ ] Alert types enabled (CRITICAL, WARNING, INFO)
    - [ ] Error codes to alert on
    - [ ] Include attachment (yes/no)
    - [ ] Max log lines to attach
- [ ] Store in database or Redis
- [ ] Admin can toggle alerts on/off temporarily
- [ ] Admin can pause alerts for maintenance
- [ ] Test admin endpoints

**Acceptance Criteria:**
- [ ] Settings configurable
- [ ] Can enable/disable alerts
- [ ] Endpoints work

---

## Testing Infrastructure Setup

**Description:** Configure test framework and utilities

**Subtasks:**
- [ ] Install testing dependencies:
  ```bash
  npm install --save-dev vitest @vitest/ui
  npm install --save-dev @testing-library/react @testing-library/jest-dom
  npm install --save-dev msw # Mock Service Worker for API mocking
  npm install --save-dev jest-mock-extended
  npm install --save-dev testcontainers # For database testing
  ```
- [ ] Configure `vitest.config.ts`:
  ```typescript
  export default defineConfig({
    test: {
      globals: true,
      environment: "node",
      setupFiles: ["./tests/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "tests/"]
      }
    }
  });
  ```
- [ ] Create test setup file `tests/setup.ts`:
  ```typescript
  import { expect, afterEach, vi } from "vitest";
  
  // Mock database
  vi.mock("@/config/database", () => ({
    prisma: mockPrismaClient()
  }));
  
  // Mock Redis
  vi.mock("@/config/redis", () => ({
    redis: mockRedisClient()
  }));
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  ```
- [ ] Create test utilities:
  - [ ] Create test payment factory
  - [ ] Create test user factory
  - [ ] Create test webhook factory
- [ ] Create mock Paymob server:
  - [ ] Use MSW to intercept Paymob API calls
  - [ ] Return mock responses
  - [ ] Can simulate errors
- [ ] Add test scripts to `package.json`:
  ```json
  {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:unit": "vitest run --include=\"**/*.unit.test.ts\"",
    "test:integration": "vitest run --include=\"**/*.integration.test.ts\"",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
  ```
- [ ] Test setup:
  - [ ] Run `npm run test`
  - [ ] Verify tests run
  - [ ] Verify mocks work

**Acceptance Criteria:**
- [ ] Test framework configured
- [ ] Mocks working
- [ ] Test utilities created
- [ ] Test passes

---

# PHASE 1: Payment State Machine & Database (WITH TESTING)

**Objective:** Extend database schema + comprehensive testing

---

## [1.1-1.8]: Database Schema Tasks (From Previous Plan)

*(Same as Phase 1 from PAYMOB_INTEGRATION_TASKS.md)*

---

## [1.9] Unit Tests for Database Models

**Description:** Test all database operations

**Subtasks:**
- [ ] Create `backend/tests/unit/payment.model.test.ts`:
  - [ ] Test Payment model creation
  - [ ] Test Payment model relations
  - [ ] Test PaymentEvent creation
  - [ ] Test unique constraints (paymobTransactionId, etc.)
  - [ ] Test indexes work correctly
- [ ] Create `backend/tests/unit/payment.repository.test.ts`:
  - [ ] Test create, read, update operations
  - [ ] Test find by various IDs
  - [ ] Test status updates
  - [ ] Test pagination
  - [ ] Test error cases
- [ ] Run tests:
  ```bash
  npm run test:unit payment
  ```
- [ ] Verify coverage > 90%

**Acceptance Criteria:**
- [ ] Database models tested
- [ ] All CRUD operations verified
- [ ] Constraints validated
- [ ] Coverage > 90%

---

## [1.10] Integration Tests for Database

**Description:** Test database operations with real database

**Subtasks:**
- [ ] Create `backend/tests/integration/database.test.ts`:
  - [ ] Test migrations apply correctly
  - [ ] Test data persistence
  - [ ] Test relationships
  - [ ] Test indexes perform well
  - [ ] Test concurrent updates
- [ ] Use test database (PostgreSQL with testcontainers):
  ```typescript
  const container = await new PostgreSqlContainer().start();
  const dbUrl = container.getConnectionUri();
  ```
- [ ] Run tests:
  ```bash
  npm run test:integration database
  ```

**Acceptance Criteria:**
- [ ] Database tested with real instance
- [ ] Migrations verified
- [ ] All operations work
- [ ] Test passes

---

## [1.11] Debugging Checklist for Phase 1

**Description:** Verify everything works correctly

**Subtasks:**
- [ ] **Database verification:**
  - [ ] Run `SELECT * FROM "Payment" LIMIT 1;`
  - [ ] Verify schema matches design
  - [ ] Verify indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename='Payment';`
  - [ ] Verify relations: check foreign keys
- [ ] **Migration verification:**
  - [ ] Run `npx prisma migrate status`
  - [ ] Verify all migrations applied
  - [ ] No pending migrations
- [ ] **Logging verification:**
  - [ ] Create test payment
  - [ ] Check logs/combined.log for entries
  - [ ] Verify JSON format
  - [ ] Verify searchable fields
- [ ] **Error tracking:**
  - [ ] Cause an error (divide by zero in test)
  - [ ] Verify Sentry receives error
  - [ ] Verify context included
- [ ] **Documentation:**
  - [ ] Create `docs/PHASE_1_CHECKLIST.md`
  - [ ] Document schema changes
  - [ ] Document new tables
  - [ ] Document migration steps

**Acceptance Criteria:**
- [ ] Database schema correct
- [ ] Migrations applied
- [ ] Logging works
- [ ] Error tracking works
- [ ] Documentation complete

---

# PHASE 2: Enhanced Checkout (WITH TESTING & DEBUGGING)

**Objective:** Checkout flow + comprehensive testing + error tracking

*(Tasks 2.1-2.7 same as before, PLUS:)*

---

## [2.9] Unit Tests for Payment Service

**Description:** Test all payment service logic

**Subtasks:**
- [ ] Create `backend/tests/unit/payment.service.test.ts`:
  - [ ] Test `createPaymobOrder()` - happy path
  - [ ] Test `createPaymobOrder()` - already enrolled error
  - [ ] Test `createPaymobOrder()` - checkout in progress error
  - [ ] Test `createPaymobOrder()` - invalid coupon error
  - [ ] Test `createPaymobOrder()` - Paymob API error
  - [ ] Test coupon validation - all cases
  - [ ] Test package selection - all cases
  - [ ] Test error message generation - user-friendly
- [ ] Mock Paymob API responses:
  ```typescript
  vi.mock("@/services/payment.service", () => ({
    paymobRequest: vi.fn()
  }));
  ```
- [ ] Use test payment factory:
  ```typescript
  const payment = await createTestPayment({ status: "INITIATED" });
  ```
- [ ] Test edge cases:
  - [ ] Extremely large amount
  - [ ] Zero amount
  - [ ] Negative amount
  - [ ] Invalid currency
  - [ ] Missing required fields

**Acceptance Criteria:**
- [ ] Payment service tested
- [ ] All code paths covered
- [ ] Edge cases tested
- [ ] Coverage > 90%

---

## [2.10] Integration Tests for Checkout Flow

**Description:** Test full checkout process end-to-end

**Subtasks:**
- [ ] Create `backend/tests/integration/checkout-flow.integration.test.ts`:
  - [ ] Test: create payment → get payment key → Paymob API calls
  - [ ] Test: coupon applied → discount calculated → stored
  - [ ] Test: already enrolled → error returned
  - [ ] Test: concurrent checkouts → only first succeeds
  - [ ] Test: invalid package → fallback to default
  - [ ] Test: Paymob API error → payment marked with error
  - [ ] Test: timeout → appropriate error handling
  - [ ] Test: database transaction → all or nothing
- [ ] Use mock Paymob server:
  ```typescript
  server.use(
    rest.post("*/auth/tokens", (req, res, ctx) => {
      return res(ctx.json({ token: "test-token" }));
    }),
    rest.post("*/ecommerce/orders", (req, res, ctx) => {
      return res(ctx.json({ id: 123456 }));
    })
  );
  ```

**Acceptance Criteria:**
- [ ] Full checkout flow tested
- [ ] All scenarios covered
- [ ] Database state verified
- [ ] Paymob calls correct

---

## [2.11] Frontend Unit Tests

**Description:** Test frontend checkout logic

**Subtasks:**
- [ ] Create `frontend/tests/unit/checkout.test.tsx`:
  - [ ] Test: render checkout page
  - [ ] Test: already enrolled message shows
  - [ ] Test: coupon validation works
  - [ ] Test: package selection works
  - [ ] Test: price calculation correct
  - [ ] Test: form submission
  - [ ] Test: error display
  - [ ] Test: loading states
- [ ] Use @testing-library/react:
  ```typescript
  const { getByRole, getByText } = render(<Checkout />);
  const button = getByRole("button", { name: /pay/i });
  expect(button).toBeInTheDocument();
  ```

**Acceptance Criteria:**
- [ ] Frontend tested
- [ ] User interactions verified
- [ ] State management works
- [ ] Coverage > 80%

---

## [2.12] Debugging & Edge Case Handling

**Description:** Verify system stability and add edge case handling

**Subtasks:**
- [ ] **Edge case testing:**
  - [ ] Student with multiple pending payments:
    - [ ] Try second checkout before 30 mins
    - [ ] Expect error
    - [ ] Try after 30 mins
    - [ ] Expect success
  - [ ] Coupon with minimum amount:
    - [ ] Try with amount below minimum
    - [ ] Expect error
    - [ ] Try with amount above minimum
    - [ ] Expect success
  - [ ] Package with zero price (free course):
    - [ ] Try to checkout with free package
    - [ ] Should auto-enroll without Paymob
    - [ ] Should send enrollment email
  - [ ] Extremely large amount (>100,000 EGP):
    - [ ] Validate Paymob supports it
    - [ ] Test API call succeeds
  - [ ] Special characters in student name:
    - [ ] Arabic characters
    - [ ] Accented characters
    - [ ] Verify Paymob receives correctly
  - [ ] Network timeout during order creation:
    - [ ] Mock timeout
    - [ ] Verify payment status = PAYMOB_API_ERROR
    - [ ] Verify retry available
- [ ] **Debugging verification:**
  - [ ] Enable debug logging:
    ```bash
    LOG_LEVEL=debug npm run dev
    ```
  - [ ] Create payment
  - [ ] Check logs:
    - [ ] Step 1: checkout initiated
    - [ ] Step 2: payment created
    - [ ] Step 3: Paymob auth token request
    - [ ] Step 4: Paymob order creation
    - [ ] Step 5: Paymob payment key generation
    - [ ] Each step logged with duration
  - [ ] Search logs by requestId:
    ```bash
    grep "req-xxx" logs/combined.log | jq '.'
    ```
  - [ ] Verify error messages are user-friendly (no stack traces)

**Acceptance Criteria:**
- [ ] Edge cases handled
- [ ] All error messages friendly
- [ ] Logging complete
- [ ] Can debug full flow
- [ ] Test passes

---

## [2.13] End-to-End Tests

**Description:** Browser-based testing of checkout flow

**Subtasks:**
- [ ] Create `frontend/tests/e2e/checkout.spec.ts`:
  - [ ] Test: navigate to /checkout
  - [ ] Test: see price calculated
  - [ ] Test: enter coupon
  - [ ] Test: see discount applied
  - [ ] Test: click pay button
  - [ ] Test: redirected to Paymob iframe
  - [ ] Test: (simulate payment)
  - [ ] Test: redirected to pending page
  - [ ] Test: status polled
  - [ ] Test: redirected to success
- [ ] Use Playwright or similar
- [ ] Run with mock server

**Acceptance Criteria:**
- [ ] E2E tests created
- [ ] Full flow tested
- [ ] Tests pass

---

# PHASE 3: Webhook & Success (WITH TESTING)

**Objective:** Webhook processing + comprehensive testing

*(Tasks 3.1-3.7 same as before, PLUS:)*

---

## [3.9] Unit Tests for Webhook Processing

**Description:** Test webhook handling logic

**Subtasks:**
- [ ] Create `backend/tests/unit/webhook.service.test.ts`:
  - [ ] Test: valid webhook → payment updated to COMPLETED
  - [ ] Test: duplicate webhook → same payment returned
  - [ ] Test: invalid HMAC → error thrown
  - [ ] Test: failed webhook → payment marked FAILED
  - [ ] Test: missing data → error thrown
  - [ ] Test: enrollment trigger → called with correct data
  - [ ] Test: email queuing → emails queued correctly
  - [ ] Test: cache invalidation → all caches cleared
- [ ] Test HMAC validation:
  - [ ] Valid HMAC → accepted
  - [ ] Invalid HMAC → rejected
  - [ ] Missing HMAC → rejected

**Acceptance Criteria:**
- [ ] Webhook tests comprehensive
- [ ] All code paths tested
- [ ] Coverage > 90%

---

## [3.10] Integration Tests for Webhook

**Description:** Test webhook with real database

**Subtasks:**
- [ ] Create `backend/tests/integration/webhook.integration.test.ts`:
  - [ ] Test: receive webhook → process → database updated
  - [ ] Test: duplicate webhook → no duplicate enrollment
  - [ ] Test: webhook with enrollment error → handled gracefully
  - [ ] Test: webhook with email error → not blocking
  - [ ] Test: late webhook → still processed
  - [ ] Test: concurrent webhooks → no race conditions

**Acceptance Criteria:**
- [ ] Integration tests comprehensive
- [ ] Database state verified
- [ ] Concurrency handled

---

## [3.11] Debugging Checklist for Phase 3

**Description:** Verify webhook processing

**Subtasks:**
- [ ] **Webhook simulation:**
  - [ ] Use debug endpoint: POST /dev/payments/:id/webhook/success
  - [ ] Verify payment status changed to COMPLETED
  - [ ] Verify enrollment created
  - [ ] Verify events logged
- [ ] **Log verification:**
  - [ ] Create payment
  - [ ] Send webhook
  - [ ] Check logs for sequence:
    - [ ] WEBHOOK_RECEIVED
    - [ ] WEBHOOK_VERIFIED
    - [ ] STATUS_CHANGED (WEBHOOK_PENDING → COMPLETED)
    - [ ] ENROLLMENT_TRIGGERED
    - [ ] ENROLLMENT_SUCCEEDED
    - [ ] EMAIL_QUEUED
- [ ] **Database state:**
  - [ ] Query payment:
    ```sql
    SELECT id, status, webhook_received_at FROM "Payment" 
    WHERE id = 'payment_xxx';
    ```
  - [ ] Query events:
    ```sql
    SELECT id, event_type, status FROM "PaymentEvent" 
    WHERE payment_id = 'payment_xxx' 
    ORDER BY created_at ASC;
    ```
  - [ ] Verify enrollment created:
    ```sql
    SELECT status FROM "Enrollment" 
    WHERE user_id = 'user_xxx';
    ```

**Acceptance Criteria:**
- [ ] Webhook processing verified
- [ ] Database state correct
- [ ] Logs show full sequence

---

# PHASE 4: Payment Failure & Recovery (WITH TESTING)

**Objective:** Failure handling + testing + error recovery

*(Tasks 4.1-4.7 same as before, PLUS:)*

---

## [4.9] Unit Tests for Error Handling

**Description:** Test all error scenarios

**Subtasks:**
- [ ] Create `backend/tests/unit/payment-errors.test.ts`:
  - [ ] Test: CARD_DECLINED → user message clear
  - [ ] Test: NETWORK_ERROR → retry available
  - [ ] Test: TIMEOUT → user can close & check later
  - [ ] Test: ENROLLMENT_FAILED → stored in database
  - [ ] Test: EMAIL_FAILED → doesn't block payment
  - [ ] Test: INVALID_COUPON → specific error message
  - [ ] Test: ALREADY_ENROLLED → specific error message
  - [ ] Test: CHECKOUT_IN_PROGRESS → retry time shown
- [ ] Test error storage:
  - [ ] Verify errorCode stored
  - [ ] Verify errorMessage stored
  - [ ] Verify errorDetails with full context
  - [ ] Verify event created

**Acceptance Criteria:**
- [ ] Error handling tested
- [ ] All error codes verified
- [ ] Messages user-friendly

---

## [4.10] Integration Tests for Failure Recovery

**Description:** Test recovery from failures

**Subtasks:**
- [ ] Create `backend/tests/integration/failure-recovery.integration.test.ts`:
  - [ ] Test: payment fails → admin marks paid → enrollment created
  - [ ] Test: enrollment fails → retry scheduled → succeeds on retry
  - [ ] Test: email fails → queued for later → succeeds on retry
  - [ ] Test: webhook timeout → payment in WEBHOOK_PENDING → webhook arrives late → processes
  - [ ] Test: concurrent updates → no race conditions
  - [ ] Test: admin tools work correctly

**Acceptance Criteria:**
- [ ] Failure scenarios tested
- [ ] Recovery paths verified
- [ ] Admin tools work

---

## [4.11] Debugging & Testing Edge Cases

**Description:** Edge cases and debugging

**Subtasks:**
- [ ] **Edge case testing:**
  - [ ] Payment fails multiple times → retry count incremented
  - [ ] Manual recovery after 3 failed retries → works
  - [ ] Webhook arrives but enrollment already exists → handled
  - [ ] Status update while webhook processing → consistent state
  - [ ] Cache invalidation failure → doesn't break payment
  - [ ] Redis down → payment still processes
  - [ ] Database down → API returns error
  - [ ] Paymob down for 30 minutes → payments queued → catch up when Paymob recovers
- [ ] **Debugging:**
  - [ ] Enable full debug logging
  - [ ] Cause each failure type
  - [ ] Verify logs show exact issue
  - [ ] Verify recovery process logged
  - [ ] Use CLI tool to see timeline:
    ```bash
    node bin/debug-payment.js payment_xxx
    # Shows: initiation, error, recovery attempts, final state
    ```

**Acceptance Criteria:**
- [ ] Edge cases handled
- [ ] Failures are debuggable
- [ ] Recovery logged
- [ ] Tests pass

---

# PHASE 5: Refund Handling (WITH TESTING)

**Objective:** Refunds + testing

*(Tasks 5.1-5.7 same as before, PLUS:)*

---

## [5.9] Unit & Integration Tests for Refunds

**Description:** Comprehensive refund testing

**Subtasks:**
- [ ] Create `backend/tests/unit/refund.test.ts`:
  - [ ] Test full refund → enrollment revoked
  - [ ] Test partial refund → enrollment stays
  - [ ] Test refund with Paymob error → retry scheduled
  - [ ] Test refund amount validation
- [ ] Create `backend/tests/integration/refund.integration.test.ts`:
  - [ ] Test: initiate refund → status = REFUND_REQUESTED
  - [ ] Test: Paymob refund succeeds → status = REFUNDED
  - [ ] Test: Paymob refund fails → status = REFUND_FAILED, retry scheduled
  - [ ] Test: multiple refunds for same payment → total tracked

**Acceptance Criteria:**
- [ ] Refund logic tested
- [ ] Edge cases covered

---

## [5.10] Debugging Refund Flow

**Description:** Verify refund processing

**Subtasks:**
- [ ] **Manual testing:**
  - [ ] Create payment
  - [ ] Complete via webhook
  - [ ] Initiate refund via admin endpoint
  - [ ] Check logs for refund sequence:
    - [ ] REFUND_INITIATED
    - [ ] REFUND_API_CALL
    - [ ] REFUND_SUCCEEDED or REFUND_FAILED
  - [ ] Verify database state:
    - [ ] Payment.status = REFUNDED
    - [ ] Payment.refundAmount set
    - [ ] Enrollment.status = REVOKED
- [ ] **Error scenarios:**
  - [ ] Mock Paymob error → verify retry scheduled
  - [ ] Refund already processed by Paymob → idempotent (succeeds)
  - [ ] Refund insufficient funds → error stored

**Acceptance Criteria:**
- [ ] Refund flow verified
- [ ] Database state correct
- [ ] Errors handled

---

# PHASE 6: Admin Payment Management (WITH TESTING)

*(Tasks 6.1-6.7 same as before, PLUS:)*

---

## [6.9] Unit & Integration Tests for Admin Tools

**Description:** Test all admin endpoints

**Subtasks:**
- [ ] Test payment list endpoint:
  - [ ] Filter by status
  - [ ] Filter by date range
  - [ ] Filter by amount
  - [ ] Pagination
- [ ] Test payment detail endpoint:
  - [ ] Full event history
  - [ ] Correct data returned
- [ ] Test manual payment creation:
  - [ ] Payment created
  - [ ] Enrollment triggered
  - [ ] Emails sent
- [ ] Test refund endpoint:
  - [ ] Full refund works
  - [ ] Partial refund works
  - [ ] Validation works

**Acceptance Criteria:**
- [ ] Admin tools tested
- [ ] Functionality verified

---

## [6.10] Debugging Admin Operations

**Description:** Verify admin tools work correctly

**Subtasks:**
- [ ] Test each admin endpoint manually
- [ ] Verify database state after each operation
- [ ] Check logs for admin actions

**Acceptance Criteria:**
- [ ] Admin tools verified

---

# PHASE 7: Monitoring (WITH TESTING)

*(Tasks 7.1-7.7 same as before, PLUS:)*

---

## [7.9] Tests for Monitoring & Alerts

**Description:** Test metrics and alerting

**Subtasks:**
- [ ] Verify metrics are collected
- [ ] Verify alerts trigger correctly
- [ ] Verify dashboards show data

**Acceptance Criteria:**
- [ ] Monitoring functional
- [ ] Alerts work

---

# PHASE 8: Frontend UX - REPLACED WITH COMPLETE UI PHASE

---

# PHASE 9: Payment Page UI Design (NEW - COMPLETE PHASE)

**Objective:** Design and implement all payment-related UI pages with full debugging

---

## [9.1] Checkout Page - Design & Implementation

**Description:** Complete checkout page with all features

**Subtasks:**
- [ ] **Design (Figma/Wireframe):**
  - [ ] Header with progress indicator (Step 1 of 3: Checkout)
  - [ ] Package selection (if multiple)
    - [ ] Cards showing each package
    - [ ] Price, description, features
    - [ ] Selected state highlighting
  - [ ] What's included section
    - [ ] List of course features
    - [ ] Icons for each feature
  - [ ] Summary panel (sticky on desktop):
    - [ ] Package name
    - [ ] Base price
    - [ ] Coupon input field
    - [ ] Discount amount (if applied, in green)
    - [ ] Final price (large, prominent)
    - [ ] "Pay Now" button (full width, gradient)
    - [ ] Security badges ("Secured by Paymob")
  - [ ] Trust signals:
    - [ ] SSL certificate icon
    - [ ] Money-back guarantee (if applicable)
    - [ ] Customer reviews (if applicable)
  - [ ] Mobile responsive:
    - [ ] Summary panel below content on mobile
    - [ ] Touch-friendly buttons (min 48px)
    - [ ] Single column layout
- [ ] **Implementation:**
  - [ ] Create `frontend/src/pages/PaymentCheckout.tsx`
  - [ ] Component structure:
    ```tsx
    <PageLayout>
      <PageHeader title="Enroll in Course" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PackageSelector {...} />
          <WhatsIncluded {...} />
          <TrustSignals {...} />
        </div>
        <div className="sticky top-20">
          <CheckoutSummary {...} />
        </div>
      </div>
    </PageLayout>
    ```
  - [ ] Package selector component:
    - [ ] Display all packages
    - [ ] Click to select
    - [ ] Update URL params
    - [ ] Save to localStorage
  - [ ] Coupon input:
    - [ ] Form with input + button
    - [ ] Real-time validation on blur
    - [ ] Show discount amount if valid
    - [ ] Show error if invalid
    - [ ] Success message with checkmark
  - [ ] Pay button:
    - [ ] Disabled during payment
    - [ ] Show spinner
    - [ ] Call checkout API
    - [ ] Handle errors
- [ ] **Styling:**
  - [ ] Use existing design system (colors, spacing, fonts)
  - [ ] Dark mode support
  - [ ] RTL support (for Arabic)
  - [ ] Accessibility (WCAG 2.1 AA)
    - [ ] Form labels
    - [ ] Error announcements
    - [ ] Keyboard navigation
    - [ ] Focus states
- [ ] **Testing:**
  - [ ] Unit tests for components
  - [ ] Integration test: full checkout flow
  - [ ] E2E test: browser-based testing
  - [ ] Visual regression tests (Chromatic or similar)
  - [ ] Accessibility tests (axe)

**Acceptance Criteria:**
- [ ] Page fully functional
- [ ] Mobile responsive
- [ ] Accessible
- [ ] All tests pass

---

## [9.2] Success Page - Design & Implementation

**Description:** Success message after payment

**Subtasks:**
- [ ] **Design:**
  - [ ] Large success checkmark (animated)
  - [ ] "Payment Successful!" heading
  - [ ] Subheading: "You now have access to the course"
  - [ ] Payment confirmation card:
    - [ ] Amount paid
    - [ ] Date
    - [ ] Order ID
    - [ ] Confirmation email sent notice
  - [ ] Action buttons:
    - [ ] Primary: "Go to Course" (green/gradient)
    - [ ] Secondary: "View Payment History" (outline)
  - [ ] Auto-redirect countdown: "Redirecting in 5 seconds..."
  - [ ] Optional: Confetti animation
- [ ] **Implementation:**
  - [ ] Create `frontend/src/pages/PaymentSuccess.tsx`
  - [ ] Route: `/payment/success?paymentId=xxx`
  - [ ] Query payment status on mount
  - [ ] Auto-redirect after 5 seconds
  - [ ] Manual redirect buttons
  - [ ] Show payment details
- [ ] **Animations:**
  - [ ] Checkmark: fade in + scale
  - [ ] Confetti: optional, fun animation
  - [ ] Countdown: smooth countdown
- [ ] **Testing:**
  - [ ] Unit test: renders correctly
  - [ ] E2E test: navigation works
  - [ ] Visual test: animations smooth

**Acceptance Criteria:**
- [ ] Success page complete
- [ ] Animations smooth
- [ ] Auto-redirect works

---

## [9.3] Failure Page - Design & Implementation

**Description:** Payment failure with recovery options

**Subtasks:**
- [ ] **Design:**
  - [ ] Error X icon (animated fade in)
  - [ ] "Payment Failed" heading in red
  - [ ] Error message (user-friendly, specific)
  - [ ] Payment details card:
    - [ ] Amount
    - [ ] Order ID
    - [ ] Error reason
  - [ ] Suggested actions based on error:
    - [ ] CARD_DECLINED: "Try a different card"
    - [ ] TIMEOUT: "Network issue, please retry"
    - [ ] GENERIC: "Check your details and try again"
  - [ ] Action buttons:
    - [ ] Primary: "Try Again" (new checkout)
    - [ ] Secondary: "Try Different Payment Method"
    - [ ] Tertiary: "Contact Support" (help link)
  - [ ] Optional: Useful info section
    - [ ] Why payment might fail
    - [ ] What to check (card details, bank, etc.)
    - [ ] Support contact info
- [ ] **Implementation:**
  - [ ] Create `frontend/src/pages/PaymentFailure.tsx`
  - [ ] Route: `/payment/failure?paymentId=xxx&reason=xxx`
  - [ ] Query payment to get error details
  - [ ] Map error codes to user messages
  - [ ] Show suggested actions
  - [ ] Provide retry option
- [ ] **Error message mapping:**
  ```typescript
  const errorMessages = {
    CARD_DECLINED: {
      title: "Card Declined",
      message: "Your card was declined. Please check your card details and try again.",
      action: "Try Another Card"
    },
    TIMEOUT: {
      title: "Connection Timeout",
      message: "Payment took too long. Please check your internet and try again.",
      action: "Retry Payment"
    },
    // ... etc
  };
  ```
- [ ] **Testing:**
  - [ ] Unit test: error messages display correctly
  - [ ] E2E test: retry flow works
  - [ ] Verify retry button creates new checkout

**Acceptance Criteria:**
- [ ] Failure page complete
- [ ] Error messages helpful
- [ ] Retry works

---

## [9.4] Pending Page - Design & Implementation

**Description:** Processing payment status

**Subtasks:**
- [ ] **Design:**
  - [ ] Spinner/loading animation
  - [ ] "Processing Payment..." heading
  - [ ] Explanation: "Your payment is being processed. This usually takes a few seconds."
  - [ ] Order ID display
  - [ ] Progress indicator: "Step 2 of 3: Processing"
  - [ ] After 30 seconds: "Taking longer than expected..."
  - [ ] After 5 minutes: "You can close this page. We'll email you when confirmed."
  - [ ] Helpful info:
    - [ ] Don't close browser
    - [ ] Don't go back
    - [ ] May take up to 10 minutes
- [ ] **Implementation:**
  - [ ] Create `frontend/src/pages/PaymentPending.tsx`
  - [ ] Route: `/payment/pending?paymentId=xxx`
  - [ ] Poll status every 3 seconds
  - [ ] Show timeout messages at appropriate times
  - [ ] Redirect on COMPLETED or FAILED
  - [ ] Allow closing page after 5 min
- [ ] **Polling logic:**
  ```typescript
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const payment = await api.get(`/student/payment/${paymentId}`);
      if (payment.status === "COMPLETED") {
        redirect(`/payment/success?paymentId=${paymentId}`);
      } else if (payment.status === "FAILED") {
        redirect(`/payment/failure?paymentId=${paymentId}`);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, []);
  ```
- [ ] **Testing:**
  - [ ] Unit test: polling works
  - [ ] E2E test: redirects on status change
  - [ ] Verify timeout messages show

**Acceptance Criteria:**
- [ ] Pending page complete
- [ ] Polling works
- [ ] Redirects correct

---

## [9.5] Payment History Page - Design & Implementation

**Description:** Student payment history and receipts

**Subtasks:**
- [ ] **Design:**
  - [ ] Page title: "Payment History"
  - [ ] Table/list of payments:
    - [ ] Date
    - [ ] Amount
    - [ ] Status (badge: COMPLETED/FAILED/REFUNDED)
    - [ ] Action: View Details or Download Receipt
  - [ ] Summary card:
    - [ ] Total paid
    - [ ] Total refunded
    - [ ] Net paid
  - [ ] Empty state: "No payments yet"
  - [ ] Filters (optional):
    - [ ] Status
    - [ ] Date range
  - [ ] Mobile: Vertical card layout instead of table
- [ ] **Implementation:**
  - [ ] Create `frontend/src/pages/PaymentHistory.tsx`
  - [ ] Query: GET /api/v1/student/payments
  - [ ] Display as responsive table/list
  - [ ] Show status with color coding
  - [ ] Detail modal with full payment info
  - [ ] Download receipt functionality
- [ ] **Detail modal:**
  - [ ] Payment ID
  - [ ] Full amount breakdown
  - [ ] Status timeline
  - [ ] Refund info (if applicable)
  - [ ] Print/download receipt button
- [ ] **Testing:**
  - [ ] Unit test: renders payment list
  - [ ] E2E test: detail modal opens
  - [ ] Verify receipt download works

**Acceptance Criteria:**
- [ ] Payment history page complete
- [ ] Responsive design
- [ ] Details work

---

## [9.6] Error Boundary & Network Error Handling

**Description:** Global error handling on payment pages

**Subtasks:**
- [ ] **Create error boundary:**
  ```tsx
  <ErrorBoundary fallback={<PaymentErrorFallback />}>
    <PaymentPages />
  </ErrorBoundary>
  ```
- [ ] **Network error handling:**
  - [ ] Detect offline status
  - [ ] Show warning: "You appear to be offline"
  - [ ] Disable payment button
  - [ ] Auto-retry when online
- [ ] **API error handling:**
  - [ ] Timeout after 10 seconds
  - [ ] Show: "Payment service is slow, still trying..."
  - [ ] Allow cancel
  - [ ] Allow retry
- [ ] **Paymob iframe errors:**
  - [ ] Iframe fails to load → show error
  - [ ] Provide retry button
- [ ] **Testing:**
  - [ ] Simulate offline mode
  - [ ] Simulate API timeout
  - [ ] Verify error UI shows

**Acceptance Criteria:**
- [ ] Error handling complete
- [ ] User informed appropriately
- [ ] Recovery options provided

---

## [9.7] Debugging Features for Payment Pages

**Description:** Developer debugging tools for payment pages

**Subtasks:**
- [ ] **Developer console debug helper:**
  ```typescript
  // Available in dev mode only
  window.__debugPayment = {
    currentPayment: null,
    simulateSuccess: () => redirectTo("/payment/success"),
    simulateFailure: () => redirectTo("/payment/failure"),
    simulatePending: () => redirectTo("/payment/pending"),
    getCurrentPayment: () => fetch("/api/v1/student/payment/...").then(r => r.json()),
    logs: [], // All payment-related logs
    addLog: (msg, data) => logs.push({ time: now, msg, data })
  };
  ```
- [ ] **Client-side logging:**
  - [ ] Log all payment API calls
  - [ ] Log all status changes
  - [ ] Log all errors
  - [ ] Store in localStorage (max 50 entries)
  - [ ] Can export logs
- [ ] **Network monitoring:**
  - [ ] Show all network requests
  - [ ] Highlight payment API calls
  - [ ] Show response times
  - [ ] Can replay requests
- [ ] **Visual debugging:**
  - [ ] Highlight active elements
  - [ ] Show component re-renders (in dev)
  - [ ] Show state changes
  - [ ] Show prop changes
- [ ] **Testing:**
  - [ ] Verify debug tools available in dev mode
  - [ ] Verify disabled in production
  - [ ] Verify logs captured
  - [ ] Verify export works

**Acceptance Criteria:**
- [ ] Debug tools available
- [ ] Production-safe
- [ ] Helpful for debugging

---

## [9.8] Payment UI Testing & Verification

**Description:** Comprehensive UI testing

**Subtasks:**
- [ ] **Unit tests:**
  - [ ] All components render
  - [ ] Props handled correctly
  - [ ] State updates work
  - [ ] Coverage > 80%
- [ ] **Integration tests:**
  - [ ] Full checkout flow
  - [ ] Success page shows correct data
  - [ ] Failure page shows correct error
  - [ ] Pending page polls correctly
  - [ ] History page loads payments
- [ ] **E2E tests:**
  - [ ] User journey: checkout → success
  - [ ] User journey: checkout → failure → retry → success
  - [ ] User journey: checkout → pending → success
  - [ ] User journey: view history → see payment
- [ ] **Visual regression tests:**
  - [ ] Checkout page screenshot
  - [ ] Success page screenshot
  - [ ] Failure page screenshot
  - [ ] Mobile versions
  - [ ] Dark mode versions
- [ ] **Accessibility tests:**
  - [ ] Run axe accessibility checker
  - [ ] Verify keyboard navigation
  - [ ] Verify screen reader support
  - [ ] Verify WCAG 2.1 AA compliance
- [ ] **Mobile testing:**
  - [ ] Test on actual devices (iOS, Android)
  - [ ] Test on various browsers
  - [ ] Test on slow networks (simulate)
  - [ ] Test with large text (accessibility)
- [ ] **Performance testing:**
  - [ ] Page load time < 3 seconds
  - [ ] First contentful paint < 1 second
  - [ ] Lighthouse score > 85
- [ ] **Debugging checklist:**
  - [ ] Open checkout → see all elements
  - [ ] Console no errors
  - [ ] Network requests show payment calls
  - [ ] Local storage has payment data
  - [ ] can navigate smoothly

**Acceptance Criteria:**
- [ ] All UI tests pass
- [ ] Accessibility verified
- [ ] Performance good
- [ ] Mobile works well
- [ ] Lighthouse score > 85

---

# PHASE 10: Integration & System Testing

**Objective:** Full system testing and edge case verification

---

## [10.1] End-to-End Payment Flow Testing

**Description:** Complete payment scenarios

**Subtasks:**
- [ ] **Scenario 1: Happy Path**
  - [ ] Register student
  - [ ] Navigate to checkout
  - [ ] Select package
  - [ ] Apply coupon
  - [ ] Proceed to payment
  - [ ] Complete payment
  - [ ] Verify success page
  - [ ] Verify enrollment
  - [ ] Verify payment history
  - [ ] Access course (verify access granted)
- [ ] **Scenario 2: Payment Failure & Recovery**
  - [ ] Start checkout
  - [ ] Simulate payment failure
  - [ ] See failure page
  - [ ] Click retry
  - [ ] Complete payment successfully
  - [ ] Verify enrollment
- [ ] **Scenario 3: Network Timeout**
  - [ ] Checkout
  - [ ] Simulate timeout
  - [ ] Verify pending page
  - [ ] Webhook arrives late
  - [ ] Verify auto-redirect to success
- [ ] **Scenario 4: Refund Flow**
  - [ ] Complete payment
  - [ ] Admin initiates refund
  - [ ] Verify REFUNDED status
  - [ ] Verify student loses access
  - [ ] Verify refund email sent
- [ ] **Run as Playwright tests:**
  ```bash
  npm run test:e2e payment-scenarios
  ```

**Acceptance Criteria:**
- [ ] All scenarios pass
- [ ] No flaky tests
- [ ] Repeatable

---

## [10.2] Load Testing

**Description:** Test under load to find bottlenecks

**Subtasks:**
- [ ] **Setup load test with k6:**
  ```bash
  npm install --save-dev k6
  ```
- [ ] **Test scenarios:**
  - [ ] 100 concurrent checkouts
  - [ ] 50 concurrent webhook processings
  - [ ] 1000 payment history queries
- [ ] **Measure:**
  - [ ] Response times
  - [ ] Error rates
  - [ ] Database performance
  - [ ] Memory usage
- [ ] **Identify bottlenecks:**
  - [ ] Slow endpoints
  - [ ] N+1 queries
  - [ ] Missing caches
- [ ] **Run test:**
  ```bash
  k6 run tests/load/payment-load.test.js
  ```

**Acceptance Criteria:**
- [ ] < 2 seconds response time at 100 concurrent users
- [ ] < 1% error rate
- [ ] No OOM errors

---

## [10.3] Security Testing

**Description:** Verify security measures

**Subtasks:**
- [ ] **Webhook HMAC validation:**
  - [ ] Invalid HMAC → rejected
  - [ ] Modified payload → rejected
  - [ ] Valid HMAC → accepted
- [ ] **Authorization:**
  - [ ] Student can only see own payments
  - [ ] Admin can see all
  - [ ] Unauthenticated → 401
- [ ] **Rate limiting:**
  - [ ] Checkout endpoint rate limited
  - [ ] Webhook endpoint not rate limited (Paymob may retry)
  - [ ] Prevent brute force
- [ ] **Data protection:**
  - [ ] Card data never logged
  - [ ] Sensitive data scrubbed from logs
  - [ ] HTTPS enforced
  - [ ] Secrets not in code
- [ ] **SQL Injection:**
  - [ ] Prisma prevents (already safe)
- [ ] **XSS:**
  - [ ] User data escaped
  - [ ] No dangerouslySetInnerHTML
- [ ] **CSRF:**
  - [ ] Using Bearer token (safe by design)

**Acceptance Criteria:**
- [ ] All security measures verified
- [ ] No vulnerabilities found

---

## [10.4] Chaos Testing

**Description:** Test system resilience

**Subtasks:**
- [ ] **Paymob API down:**
  - [ ] Payment API returns error
  - [ ] User sees retry button
  - [ ] Auto-retry on background job
- [ ] **Redis down:**
  - [ ] System works without cache
  - [ ] Logging continues
  - [ ] Payments still process
- [ ] **Database down:**
  - [ ] API returns error
  - [ ] User sees error message
  - [ ] Graceful degradation
- [ ] **Email service down:**
  - [ ] Payment still completes
  - [ ] Email queued for retry
  - [ ] Alert sent to admin
- [ ] **Network partition:**
  - [ ] Student payment stuck
  - [ ] Webhook arrives later
  - [ ] System recovers
- [ ] **Clock skew (time mismatch):**
  - [ ] Webhook validation still works
  - [ ] Cache TTLs still work
  - [ ] Token expiration still works

**Acceptance Criteria:**
- [ ] System resilient
- [ ] Graceful degradation
- [ ] Recovery works

---

## [10.5] Compatibility Testing

**Description:** Test across browsers/devices/networks

**Subtasks:**
- [ ] **Browsers:**
  - [ ] Chrome latest
  - [ ] Firefox latest
  - [ ] Safari latest
  - [ ] Edge latest
- [ ] **Devices:**
  - [ ] iPhone (Safari)
  - [ ] Android (Chrome)
  - [ ] iPad
  - [ ] Desktop (various resolutions)
- [ ] **Networks:**
  - [ ] 4G (simulate in dev tools)
  - [ ] Slow 3G
  - [ ] Offline then online
  - [ ] High latency
- [ ] **Payment methods (Paymob):**
  - [ ] Credit card
  - [ ] Debit card
  - [ ] Wallet (if supported)

**Acceptance Criteria:**
- [ ] Works on all major browsers
- [ ] Works on all devices
- [ ] Works on various networks

---

# PHASE 11: Documentation, Deployment & Handoff

**Objective:** Complete documentation and deployment

---

## [11.1] API Documentation (OpenAPI/Swagger)

**Description:** Generate and document all APIs

**Subtasks:**
- [ ] Install Swagger dependencies:
  ```bash
  npm install swagger-jsdoc swagger-ui-express
  npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
  ```
- [ ] Create Swagger spec:
  ```typescript
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "EduFlow Payment API",
        version: "1.0.0"
      },
      servers: [{
        url: "/api/v1"
      }]
    },
    apis: ["./src/routes/*.ts"]
  };
  ```
- [ ] Document all endpoints with JSDoc:
  ```typescript
  /**
   * @swagger
   * /student/checkout:
   *   post:
   *     summary: Create payment checkout
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               packageId:
   *                 type: string
   *               couponCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: Payment key generated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 paymentKey:
   *                   type: string
   *                 iframeId:
   *                   type: string
   */
  ```
- [ ] Add Swagger UI route:
  ```typescript
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  ```
- [ ] Document:
  - [ ] All request/response bodies
  - [ ] All error codes
  - [ ] All query parameters
  - [ ] Authentication requirements
  - [ ] Rate limits
  - [ ] Examples

**Acceptance Criteria:**
- [ ] All endpoints documented
- [ ] Swagger UI available
- [ ] Can test from Swagger UI

---

## [11.2] Runbooks & Operations Guide

**Description:** Guide for ops team

**Subtasks:**
- [ ] Create `docs/runbooks/`:
  - [ ] `payment-issues.md` - Common problems & solutions
  - [ ] `debugging-guide.md` - How to debug payment issues
  - [ ] `incident-response.md` - How to respond to incidents
  - [ ] `monitoring.md` - How to check system health
  - [ ] `disaster-recovery.md` - How to recover from failures
- [ ] Each runbook includes:
  - [ ] Problem description
  - [ ] How to detect it (log grep commands, metrics)
  - [ ] How to diagnose it (queries, commands)
  - [ ] How to fix it (step by step)
  - [ ] Prevention measures
  - [ ] Escalation contacts
- [ ] Add troubleshooting table:
  ```markdown
  | Issue | Symptom | Diagnosis | Fix |
  | --- | --- | --- | --- |
  | Payment stuck in WEBHOOK_PENDING | No webhook after 10 min | Check Paymob webhook logs | Manual mark-paid or wait for webhook |
  ```

**Acceptance Criteria:**
- [ ] All common issues documented
- [ ] Runbooks actionable
- [ ] Contacts updated

---

## [11.3] Developer Onboarding Guide

**Description:** Guide for new developers

**Subtasks:**
- [ ] Create `docs/DEVELOPER_GUIDE.md`:
  - [ ] Project structure
  - [ ] Local setup steps
  - [ ] How to run tests
  - [ ] How to debug payment flow
  - [ ] Architecture overview
  - [ ] Key code locations
  - [ ] Common tasks (how to add a new error code, etc.)
- [ ] Create `docs/PAYMENT_FLOW.md`:
  - [ ] Diagram of payment flow
  - [ ] List of all state transitions
  - [ ] List of all API calls to Paymob
  - [ ] List of all database operations
  - [ ] List of all event types
- [ ] Create environment setup guide:
  - [ ] How to get Paymob sandbox keys
  - [ ] How to set up local database
  - [ ] How to set up Redis
  - [ ] How to enable logging
  - [ ] How to test locally

**Acceptance Criteria:**
- [ ] New dev can set up and understand in < 1 hour
- [ ] Clear and complete

---

## [11.4] Test Coverage Report

**Description:** Generate and document test coverage

**Subtasks:**
- [ ] Run coverage:
  ```bash
  npm run test:coverage
  ```
- [ ] Generate reports:
  ```
  coverage/
  ├── index.html
  ├── payment.service.ts.html
  ├── payment.controller.ts.html
  └── ...
  ```
- [ ] Publish coverage report
- [ ] Set coverage thresholds:
  - [ ] Overall: > 85%
  - [ ] Payment service: > 95%
  - [ ] Controllers: > 90%
  - [ ] Repositories: > 90%
- [ ] Identify gaps:
  - [ ] Areas < 80% coverage
  - [ ] Plan to improve
  - [ ] Add tests

**Acceptance Criteria:**
- [ ] Coverage > 85% overall
- [ ] Critical code > 95%
- [ ] Report published

---

## [11.5] Performance Baseline

**Description:** Document performance expectations

**Subtasks:**
- [ ] Run performance tests:
  ```bash
  npm run test:performance
  ```
- [ ] Measure:
  - [ ] Payment checkout response time
  - [ ] Webhook processing time
  - [ ] Payment list query time
  - [ ] Database query times
  - [ ] Cache hit rates
- [ ] Document baseline:
  ```markdown
  # Performance Baselines (as of 2026-04-24)
  
  | Operation | P50 | P95 | P99 |
  | --- | --- | --- | --- |
  | POST /checkout | 150ms | 250ms | 400ms |
  | POST /webhooks/paymob | 50ms | 100ms | 200ms |
  | GET /payments | 200ms | 400ms | 600ms |
  ```
- [ ] Set alerts if performance degrades > 20%

**Acceptance Criteria:**
- [ ] Baselines documented
- [ ] Alerts configured

---

## [11.6] Security Checklist

**Description:** Final security review

**Subtasks:**
- [ ] **Secrets management:**
  - [ ] No secrets in code
  - [ ] All secrets in .env
  - [ ] Secrets never logged
  - [ ] Secrets rotated regularly
- [ ] **Data protection:**
  - [ ] Sensitive data encrypted at rest (if needed)
  - [ ] Sensitive data not logged
  - [ ] HTTPS enforced
  - [ ] CORS properly configured
- [ ] **Access control:**
  - [ ] Authentication required
  - [ ] Authorization checks present
  - [ ] Rate limiting present
  - [ ] No privilege escalation
- [ ] **Input validation:**
  - [ ] All user input validated
  - [ ] No SQL injection
  - [ ] No XSS
  - [ ] No command injection
- [ ] **Webhook security:**
  - [ ] HMAC validation present
  - [ ] Idempotency keys checked
  - [ ] Signature validation tested
- [ ] **Dependencies:**
  - [ ] No known vulnerabilities:
    ```bash
    npm audit
    ```
  - [ ] Dependencies up to date
  - [ ] Security patches applied
- [ ] **Monitoring:**
  - [ ] Errors tracked (Sentry)
  - [ ] Metrics collected (Prometheus)
  - [ ] Logs centralized
  - [ ] Alerts configured

**Acceptance Criteria:**
- [ ] All security checks passed
- [ ] No known vulnerabilities
- [ ] Ready for production

---

## [11.7] Production Deployment Playbook

**Description:** Step-by-step deployment guide

**Subtasks:**
- [ ] Create `docs/DEPLOYMENT.md`:
  - [ ] Prerequisites checklist
  - [ ] Step-by-step deployment steps
  - [ ] Verification steps after deploy
  - [ ] Rollback procedure
  - [ ] Communication plan
- [ ] **Deployment steps:**
  ```markdown
  ## Pre-Deployment
  - [ ] All tests passing
  - [ ] Code reviewed
  - [ ] Secrets configured
  - [ ] Database backups taken
  - [ ] Monitoring ready
  
  ## Deployment
  - [ ] Merge to main
  - [ ] Tag release: v1.0.0
  - [ ] Build Docker image
  - [ ] Push to registry
  - [ ] Update k8s deployment
  - [ ] Monitor rollout
  
  ## Post-Deployment
  - [ ] Smoke tests pass
  - [ ] Payments working
  - [ ] Webhooks arriving
  - [ ] No error spikes
  - [ ] Performance acceptable
  
  ## Rollback (if needed)
  - [ ] Revert k8s deployment
  - [ ] Monitor for issues
  - [ ] Investigate root cause
  ```
- [ ] **Smoke tests:**
  - [ ] Create test payment
  - [ ] Process webhook
  - [ ] Check enrollment
  - [ ] Check emails sent
- [ ] **Communication template:**
  - [ ] Notify stakeholders before
  - [ ] Notify during (if taking time)
  - [ ] Notify after (status)
  - [ ] Incident escalation if needed

**Acceptance Criteria:**
- [ ] Deployment documented
- [ ] Smoke tests ready
- [ ] Communication plan clear

---

## [11.8] Final Verification & Sign-Off

**Description:** Final checks before launch

**Subtasks:**
- [ ] **Functionality checklist:**
  - [ ] All features working
  - [ ] All edge cases handled
  - [ ] All error paths tested
  - [ ] No console errors
  - [ ] No broken links
  - [ ] All pages load
- [ ] **Performance checklist:**
  - [ ] Page load < 3 seconds
  - [ ] API response < 500ms
  - [ ] No N+1 queries
  - [ ] Cache working
  - [ ] Database queries optimized
- [ ] **Security checklist:**
  - [ ] HTTPS enforced
  - [ ] No vulnerabilities
  - [ ] Secrets not exposed
  - [ ] Authorization working
  - [ ] Rate limiting working
- [ ] **Testing checklist:**
  - [ ] Unit tests: 85%+ coverage
  - [ ] Integration tests: all pass
  - [ ] E2E tests: all pass
  - [ ] Load tests: acceptable performance
  - [ ] Security tests: all pass
- [ ] **Documentation checklist:**
  - [ ] API docs complete
  - [ ] Runbooks written
  - [ ] Developer guide complete
  - [ ] Performance documented
  - [ ] Deployment guide ready
- [ ] **Sign-offs:**
  - [ ] Engineering team: ✓
  - [ ] QA team: ✓
  - [ ] Security team: ✓
  - [ ] Product manager: ✓
  - [ ] Operations team: ✓

**Acceptance Criteria:**
- [ ] All items checked
- [ ] All sign-offs received
- [ ] Ready for production launch

---

# APPENDIX: Debug Command Reference

## Email Alert System

### Configuration
```bash
# Set in .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password (generate in Gmail settings)
ALERT_EMAIL=yoseabdallah866@gmail.com
```

### Manual Testing
```bash
# Trigger test alert
curl -X POST http://localhost:3000/dev/alert/test \
  -H "Content-Type: application/json" \
  -d '{"errorCode": "TEST_ERROR", "count": 5}'

# Check alert status
curl http://localhost:3000/dev/alert/status

# Get alert configuration
curl http://localhost:3000/api/v1/admin/alert-settings

# Update alert configuration
curl -X POST http://localhost:3000/api/v1/admin/alert-settings \
  -H "Content-Type: application/json" \
  -d '{
    "errorThreshold": 5,
    "checkIntervalMinutes": 5,
    "alertEmailAddress": "yoseabdallah866@gmail.com",
    "attachLogs": true
  }'

# Pause alerts temporarily (maintenance)
curl -X POST http://localhost:3000/api/v1/admin/alert-settings/pause \
  -d '{"pauseMinutes": 30}'

# Resume alerts
curl -X POST http://localhost:3000/api/v1/admin/alert-settings/resume
```

### Monitoring Email Alerts
```bash
# Check recent errors that triggered alerts
grep "ALERT_EMAIL_SENT" logs/combined.log | jq '.metadata'

# See pending errors (not yet alert threshold)
grep "trackError" logs/combined.log | jq '.metadata'

# Monitor email queue
curl http://localhost:3000/dev/email/queue

# Resend failed email
curl -X POST http://localhost:3000/dev/email/resend/<email_id>
```

---

## Backend Debug Commands

```bash
# View payment timeline
node bin/debug-payment.js <payment_id>

# List recent payments
curl http://localhost:3000/dev/payments

# Simulate successful webhook
curl -X POST http://localhost:3000/dev/payments/<id>/webhook/success

# Simulate failed webhook
curl -X POST http://localhost:3000/dev/payments/<id>/webhook/failure

# View logs for payment
grep "<payment_id>" logs/combined.log | jq '.'

# Search logs by request ID
grep "<request_id>" logs/combined.log

# View error logs
tail -f logs/error.log

# View alert logs
tail -f logs/error.log | grep "ALERT_EMAIL"

# Run tests with debug output
LOG_LEVEL=debug npm run test:unit payment

# Start app with debug logging
LOG_LEVEL=debug npm run dev

# Test SMTP connection
node -e "
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  t.verify((err, ok) => {
    if (err) console.log('SMTP Error:', err);
    else console.log('SMTP Connected!');
  });
"
```

## Frontend Debug Commands

```javascript
// In browser console
window.__debugPayment.getCurrentPayment()
window.__debugPayment.simulateSuccess()
window.__debugPayment.simulateFailure()
window.__debugPayment.logs
window.__debugPayment.addLog("test", {data: 1})

// Export logs
console.save(window.__debugPayment.logs, 'payment-logs.json')

// View local storage
localStorage.getItem('payment_log_*')
```

## Database Debug Queries

```sql
-- View recent payments
SELECT id, user_id, status, created_at FROM "Payment" 
ORDER BY created_at DESC LIMIT 10;

-- View payment timeline
SELECT id, event_type, status, created_at FROM "PaymentEvent" 
WHERE payment_id = 'payment_xxx' 
ORDER BY created_at ASC;

-- Count by status
SELECT status, COUNT(*) FROM "Payment" 
GROUP BY status;

-- Check for stuck payments
SELECT id, status, created_at FROM "Payment" 
WHERE status = 'WEBHOOK_PENDING' 
AND created_at < NOW() - INTERVAL '10 minutes';
```

---

# SUMMARY

## Total Breakdown

| Phase | Name | Tasks | Focus |
|-------|------|-------|-------|
| 0 | Debugging Infrastructure | 9 | Logging, error tracking, dev tools, **EMAIL ALERTS** |
| 1 | Database Schema | 11 | Schema design + testing |
| 2 | Checkout Flow | 13 | Checkout + testing + debugging |
| 3 | Webhook Processing | 11 | Webhooks + testing |
| 4 | Failure Recovery | 11 | Errors + testing + edge cases |
| 5 | Refunds | 10 | Refund flow + testing |
| 6 | Admin Tools | 10 | Management + testing |
| 7 | Monitoring | 9 | Metrics + alerts |
| 8 | (Merged with Phase 9) | - | - |
| 9 | Payment UI | 8 | All payment pages + testing |
| 10 | Integration Testing | 5 | System-wide testing |
| 11 | Documentation | 8 | Deployment & handoff |
| | **TOTAL** | **96 TASKS** | Complete, tested, documented, **error alerts** |

## Email Alert System (NEW!)

🚨 **Automatic Error Detection & Email Notifications**

When errors occur in the payment system:
- ✅ Errors are tracked and aggregated
- ✅ When error count hits threshold (5 errors in 5 mins), email automatically sent to **yoseabdallah866@gmail.com**
- ✅ Email includes:
  - Error details (codes, count, time range)
  - **Severity level** (CRITICAL, WARNING, ERROR)
  - **HTML formatted email** with clear layout
  - **Log file attachment** with full error logs
- ✅ Admin dashboard to configure:
  - Alert email address
  - Error threshold
  - Check frequency
  - Alert types
  - Can pause/resume alerts
- ✅ Error aggregator prevents spam (batches errors)
- ✅ Different alert rules for different error types
- ✅ Easy to detect issues quickly from email attachments

---

## Every Phase Includes

✅ **Unit Tests** - Test individual functions  
✅ **Integration Tests** - Test components together  
✅ **E2E Tests** - Test from user perspective  
✅ **Edge Case Testing** - Handle unusual scenarios  
✅ **Error Logging** - Know where issues come from  
✅ **Debugging Tools** - Tools to diagnose problems  
✅ **Documentation** - Clear for developers & ops  
✅ **EMAIL ALERTS** - Error notifications with logs sent to you!  

## Debugging Strategy

🔍 **Structured Logging** - Every operation logged  
🔍 **Request Tracing** - Follow requests by ID  
🔍 **Error Tracking** - Sentry integration  
🔍 **Performance Monitoring** - Track slow operations  
🔍 **Audit Trail** - Every action recorded  
🔍 **Dev Tools** - Debug endpoints + CLI  
🔍 **Local Testing** - Mock Paymob, test locally  
🔍 **Load Testing** - Find bottlenecks  
🔍 **Security Testing** - Verify protections  

---

**Document Generated:** April 24, 2026 (v2.0 - COMPLETE)  
**Status:** Ready for Implementation  
**Next Step:** Assign tasks to developers and begin Phase 0  

