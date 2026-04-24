# EduFlow LMS - Multi-Phase Remediation Plan

**Document**: Production Readiness Fix Plan  
**Total Phases**: 4  
**Total Tasks**: 31  
**Estimated Duration**: 8-10 weeks

---

## PHASE 1: CRITICAL VULNERABILITIES & PERFORMANCE BLOCKERS

**Duration**: 2-3 weeks  
**Priority**: MUST FIX before any production deployment  
**Tasks**: 8

---

### PHASE 1 - TASK 1: Fix Ticket Management RBAC Bypass

**Severity**: CRITICAL - Exposes all support conversations  
**Type**: Security / RBAC  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

#### Description
The ticket management endpoints (`listAll`, `updateStatus`, `reply`) lack role-based access control. Any authenticated user (including students) can access all support tickets and add messages to any ticket. This exposes sensitive customer support conversations and allows impersonation of admin responses.

#### Current Issue
```typescript
// tickets.controller.ts - NO role checks in handlers
async listAll(req: Request, res: Response, next: NextFunction) {
  const tickets = await prisma.supportTicket.findMany({
    where, // Returns ALL tickets
    include: { user: { select: { id: true, fullName: true, email: true } } }
  });
}

async reply(req: Request, res: Response, next: NextFunction) {
  const adminId = req.user!.userId; // ANY authenticated user becomes "admin"
  // ...
}
```

#### Files to Modify
1. **`backend/src/routes/admin.routes.ts`** - Add middleware to ticket endpoints
2. **`backend/src/controllers/tickets.controller.ts`** - Add permission validation in handlers

#### Implementation Checklist

- [ ] **Step 1**: In `admin.routes.ts`, wrap ALL ticket routes with `requireRole("ADMIN")` middleware
  ```typescript
  router.get("/tickets", requireRole("ADMIN"), ticketsController.listAll);
  router.patch("/tickets/:id/status", requireRole("ADMIN"), ticketsController.updateStatus);
  router.post("/tickets/:id/reply", requireRole("ADMIN"), ticketsController.reply);
  ```

- [ ] **Step 2**: In `tickets.controller.ts`, add internal validation in each handler:
  ```typescript
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  ```

- [ ] **Step 3**: Update `reply()` handler to use `req.user?.role` for admin verification
  - Ensure the message is tagged with admin-only flag if user is admin
  - Otherwise reject with 403 Forbidden

- [ ] **Step 4**: Run test suite:
  ```bash
  npm test -- tickets.test.ts
  ```
  - Test that admin can list tickets
  - Test that student CANNOT list tickets (403 expected)
  - Test that admin can reply
  - Test that student CANNOT reply (403 expected)

- [ ] **Step 5**: Code review and security sign-off

#### Acceptance Criteria
✅ All ticket endpoints require admin role  
✅ Students attempting to access `/api/v1/admin/tickets/*` receive 403 Forbidden  
✅ Admin can list and reply to tickets  
✅ Tests verify RBAC is enforced  
✅ No sensitive data exposed  

#### How to Verify
```bash
# Admin access (should succeed)
curl -H "Authorization: Bearer $ADMIN_TOKEN" /api/v1/admin/tickets

# Student access (should fail with 403)
curl -H "Authorization: Bearer $STUDENT_TOKEN" /api/v1/admin/tickets
# Expected: 403 Forbidden
```

---

### PHASE 1 - TASK 2: Remove Admin Settings Environment Variable Injection

**Severity**: CRITICAL - Remote configuration compromise  
**Type**: Security / Configuration  
**Estimated Time**: 4-5 hours  
**Files Modified**: 2

#### Description
The `updateSystem()` endpoint allows arbitrary environment variable injection. An admin (or compromised admin account) can modify SMTP credentials, payment API keys, or any other env var at runtime, potentially enabling email spoofing, payment fraud, or other attacks. The changes persist in-memory and are lost on restart but can cause immediate damage.

#### Current Issue
```typescript
// settings.controller.ts
async updateSystem(req: Request, res: Response) {
  const { smtpHost, smtpUser, smtpPass, paymobKey } = req.body;
  if (smtpHost) process.env.SMTP_HOST = smtpHost;  // NO VALIDATION!
  if (smtpUser) process.env.SMTP_USER = smtpUser;  // Can be manipulated
  if (smtpPass) process.env.SMTP_PASS = smtpPass;  // Exposed in body
  if (paymobKey) process.env.PAYMOB_API_KEY = paymobKey;
  res.json({ ok: true });
}
```

#### Files to Modify
1. **`backend/src/controllers/admin/settings.controller.ts`** - Remove env mutation
2. **`backend/src/routes/admin.routes.ts`** - Remove dynamic settings update endpoint

#### Implementation Checklist

- [ ] **Step 1**: In `settings.controller.ts`, identify `updateSystem()` function
  - Remove ALL `process.env.*` mutations
  - Remove request body parsing for credentials
  - DO NOT allow runtime environment variable changes

- [ ] **Step 2**: Modify `getSystem()` to return ONLY read-only metadata:
  ```typescript
  async getSystem(req: Request, res: Response) {
    return res.json({
      smtpConfigured: !!process.env.SMTP_HOST,
      paymobConfigured: !!process.env.PAYMOB_API_KEY,
      // Only return boolean flags, NOT actual values
    });
  }
  ```

- [ ] **Step 3**: Add comment to controller explaining why runtime updates are disabled:
  ```typescript
  // SECURITY: Environment variables must be configured via .env file or infrastructure config.
  // Runtime mutation is disabled to prevent unauthorized modification of credentials.
  ```

- [ ] **Step 4**: In `admin.routes.ts`, remove or disable the `PATCH /settings/system` endpoint
  ```typescript
  // router.patch("/settings/system", settingsController.updateSystem); // REMOVED for security
  ```

- [ ] **Step 5**: Add audit logging if settings are viewed:
  ```typescript
  logger.info(`Admin ${req.user?.id} viewed system settings`);
  ```

- [ ] **Step 6**: Update documentation to explain settings configuration via:
  - `.env` file for development
  - Environment variables at deployment (Docker, K8s, Vercel, etc.)
  - Infrastructure secrets management (AWS Secrets Manager, etc.)

- [ ] **Step 7**: Test that settings endpoint is read-only:
  ```bash
  # Try to modify (should fail or be ignored)
  curl -X PATCH /api/v1/admin/settings/system -d '{"smtpHost":"evil.com"}' -H "Authorization: Bearer $ADMIN_TOKEN"
  # Should return 403, 405, or read-only response
  ```

#### Acceptance Criteria
✅ Runtime environment variable mutation is removed  
✅ Settings endpoint returns read-only status only  
✅ No credentials accepted in request body  
✅ Configuration changes require app restart/redeploy  
✅ Audit logging added for settings access  

#### How to Verify
```bash
# Verify no env mutation
grep -n "process.env\." backend/src/controllers/admin/settings.controller.ts
# Should return 0 results or only reads like process.env.SOMETHING

# Test endpoint security
curl -X PATCH /api/v1/admin/settings/system \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smtpHost":"attacker.com"}'
# Should NOT modify SMTP_HOST
```

---

### PHASE 1 - TASK 3: Disable Auto-Account Creation in Contact Form

**Severity**: CRITICAL - Account takeover vulnerability  
**Type**: Security / Authentication  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

#### Description
The contact form endpoint automatically creates user accounts with empty password hashes for any submitted email. An attacker can create accounts impersonating real users (e.g., admin@example.com) and gain full system access with student role before the real user registers. Accounts are created with `passwordHash: ""` (empty string), and no email verification is required.

#### Current Issue
```typescript
// contact.controller.ts
let user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  user = await prisma.user.create({
    data: {
      email,
      fullName: name,
      passwordHash: "", // Empty password!
      role: "STUDENT",  // Full student access
      emailVerified: false
    }
  });
}
// User can now access lessons with no password set
```

#### Files to Modify
1. **`backend/src/controllers/contact.controller.ts`** - Remove user creation
2. **`backend/src/services/email.service.ts`** - Send contact form emails differently

#### Implementation Checklist

- [ ] **Step 1**: In `contact.controller.ts`, remove the user creation logic:
  ```typescript
  // REMOVED: User creation is a security risk
  // Users must register explicitly via /auth/register endpoint
  ```

- [ ] **Step 2**: Modify contact handler to ONLY send email to support team:
  ```typescript
  // Option 1: Send email only (don't create user)
  await emailService.sendContactNotificationToSupport({
    senderName: name,
    senderEmail: email,
    subject: subject,
    message: message
  });

  return res.json({ 
    success: true, 
    message: t("contact.successMessage") 
  });
  ```

- [ ] **Step 3**: Create new email template in `email.service.ts`:
  ```typescript
  async sendContactNotificationToSupport(data) {
    const supportEmail = process.env.SUPPORT_EMAIL || "support@eduflow.com";
    await this.send({
      to: supportEmail,
      subject: `New Contact Form: ${data.subject}`,
      html: `
        <p>Sender: ${escapeHtml(data.senderName)}</p>
        <p>Email: ${escapeHtml(data.senderEmail)}</p>
        <p>Subject: ${escapeHtml(data.subject)}</p>
        <p>Message:</p>
        <p>${escapeHtml(data.message)}</p>
      `
    });
  }
  ```

- [ ] **Step 4**: Update response message to indicate contact was received (not account created):
  - Remove messaging about account creation
  - Clarify that support will respond via email

- [ ] **Step 5**: Add rate limiting to contact form:
  ```typescript
  const contactRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 min per IP
    message: "Too many contact submissions from this IP"
  });

  router.post("/contact", contactRateLimit, contactController.submit);
  ```

- [ ] **Step 6**: Test that no user is created:
  ```bash
  # Submit contact form
  curl -X POST /api/v1/contact -d '{"name":"Test","email":"test@example.com",...}'

  # Verify user was NOT created
  curl /api/v1/users/test@example.com
  # Should return 404 Not Found
  ```

- [ ] **Step 7**: Verify support email received the message

#### Acceptance Criteria
✅ Contact form NO LONGER creates user accounts  
✅ Contact form sends email to support team only  
✅ Sender information preserved in email (name, email)  
✅ Rate limiting applied to prevent spam  
✅ Email verification is required for user registration  

#### How to Verify
```bash
# Try to create account via contact form
curl -X POST /api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Attacker",
    "email": "admin@eduflow.com",
    "subject": "Test",
    "message": "Test message"
  }'

# Verify no account created with admin@eduflow.com
curl -X POST /api/v1/auth/login \
  -d '{"email":"admin@eduflow.com","password":"anything"}'
# Should fail - user doesn't exist
```

---

### PHASE 1 - TASK 4: Replace Sequential Email Loop with Queue-Based System

**Severity**: CRITICAL - Performance blocker  
**Type**: Performance / Architecture  
**Estimated Time**: 5-6 hours  
**Files Modified**: 3

#### Description
The notification broadcast endpoint processes email sends sequentially in a loop. With 1,000+ students, this takes 1.4+ hours and blocks the entire request, making the admin panel unresponsive. Implementing a queue-based system (Bull/RabbitMQ) with concurrency limits will process emails asynchronously in batches of 10-20 concurrent workers.

#### Current Issue
```typescript
// notifications.controller.ts
for (const enrollment of enrollments) {
  try {
    await sendBrandedEmail(...); // Sequential - blocks loop
    sent++;
  } catch { /* skip failed */ }
}
// 1000 students × 5 seconds = 5000 seconds = 1.4 hours!
```

#### Files to Modify
1. **`backend/src/services/email.queue.service.ts`** - NEW file (queue service)
2. **`backend/src/controllers/admin/notifications.controller.ts`** - Use queue instead of loop
3. **`backend/src/queues/email.queue.ts`** - NEW file (worker definition)

#### Implementation Checklist

- [ ] **Step 1**: Install Bull queue library:
  ```bash
  npm install bull @types/bull
  ```

- [ ] **Step 2**: Create `backend/src/services/email.queue.service.ts`:
  ```typescript
  import Queue from 'bull';
  import redis from '@/lib/redis';

  export const emailQueue = new Queue('emails', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379)
    }
  });

  export const enqueueEmail = async (data: EmailData) => {
    await emailQueue.add(data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true
    });
  };

  export const getQueueStats = async () => {
    const [pending, active, completed, failed] = await Promise.all([
      emailQueue.getJobCounts('wait'),
      emailQueue.getJobCounts('active'),
      emailQueue.getJobCounts('completed'),
      emailQueue.getJobCounts('failed')
    ]);
    return { pending, active, completed, failed };
  };
  ```

- [ ] **Step 3**: Create `backend/src/queues/email.queue.ts` (worker):
  ```typescript
  import { emailQueue } from '@/services/email.queue.service';
  import { emailService } from '@/services/email.service';

  const CONCURRENT_WORKERS = 20; // Process 20 emails in parallel

  emailQueue.process(CONCURRENT_WORKERS, async (job) => {
    const { email, subject, template, data } = job.data;
    
    try {
      await emailService.send({
        to: email,
        subject,
        template,
        data
      });
      
      job.progress(100);
      return { success: true, email };
    } catch (error) {
      throw new Error(`Failed to send email to ${email}: ${error.message}`);
    }
  });

  emailQueue.on('failed', (job, error) => {
    logger.error(`Email job ${job.id} failed: ${error.message}`);
  });

  emailQueue.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`);
  });

  export { emailQueue };
  ```

- [ ] **Step 4**: Update `notifications.controller.ts`:
  ```typescript
  async broadcast(req: Request, res: Response) {
    const { subject, bodyHtml, bodyText } = req.body;
    
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { email: true, fullName: true } } }
    });

    // Queue all emails instead of sending synchronously
    let queued = 0;
    for (const enrollment of enrollments) {
      await enqueueEmail({
        email: enrollment.user.email,
        subject,
        template: 'branded-notification',
        data: {
          recipientName: enrollment.user.fullName,
          bodyHtml,
          bodyText
        }
      });
      queued++;
    }

    // Return immediately (don't wait for emails to send)
    res.json({
      success: true,
      message: `Queued ${queued} emails for delivery`,
      estimatedDeliveryTime: `${Math.ceil(queued / CONCURRENT_WORKERS * 2)} minutes`
    });
  }
  ```

- [ ] **Step 5**: Add queue monitoring endpoint (optional):
  ```typescript
  router.get("/admin/email-queue/status", requireRole("ADMIN"), async (req, res) => {
    const stats = await getQueueStats();
    res.json(stats);
  });
  ```

- [ ] **Step 6**: Update server startup to initialize email queue worker:
  ```typescript
  // In server.ts or app.ts
  import '@/queues/email.queue'; // Initialize worker on startup
  ```

- [ ] **Step 7**: Test queue functionality:
  ```bash
  # Queue 100 emails
  curl -X POST /api/v1/admin/notifications/broadcast \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"subject":"Test","bodyHtml":"<p>Test</p>"}'

  # Check queue status
  curl /api/v1/admin/email-queue/status \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Should show pending: 100, active: 20 (or CONCURRENT_WORKERS)

  # Monitor Redis for queue
  redis-cli
  > keys "bull:emails*"  # See queue data structures
  ```

#### Acceptance Criteria
✅ Emails queued instead of sent sequentially  
✅ Broadcast endpoint returns immediately  
✅ 20+ concurrent workers process emails in parallel  
✅ Estimated delivery time: 1000 emails ≈ 50 minutes (vs 5000+ minutes before)  
✅ Failed emails retried 3 times with exponential backoff  
✅ Queue status endpoint shows progress  

#### How to Verify
```bash
# Test with 1000 enrollments
time curl -X POST /api/v1/admin/notifications/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"subject":"Test","bodyHtml":"<p>Test</p>"}'
# Should respond in <1 second (not 5000+ seconds)

# Monitor progress
watch -n 5 'curl /api/v1/admin/email-queue/status -H "Authorization: Bearer $ADMIN_TOKEN"'
```

---

### PHASE 1 - TASK 5: Implement Streaming CSV Export (Fix Memory Overflow)

**Severity**: CRITICAL - OOM vulnerability  
**Type**: Performance / Memory  
**Estimated Time**: 4-5 hours  
**Files Modified**: 2

#### Description
CSV export loads entire payment dataset into memory before generating file. With 10,000+ payments, this exhausts available memory and crashes the server. Streaming the response allows exporting arbitrarily large datasets without OOM.

#### Current Issue
```typescript
// orders.controller.ts
const payments = await prisma.payment.findMany({
  include: { user: { select: { fullName: true, email: true } } },
  orderBy: { createdAt: "desc" }
  // NO pagination - loads entire dataset!
});

// Convert to CSV string (all data in memory)
const csv = convertToCSV(payments);
res.send(csv); // Finally send response
```

#### Files to Modify
1. **`backend/src/controllers/admin/orders.controller.ts`** - Implement streaming
2. **`backend/src/utils/csv.ts`** - Add streaming CSV generator

#### Implementation Checklist

- [ ] **Step 1**: Install streaming CSV library:
  ```bash
  npm install fast-csv
  ```

- [ ] **Step 2**: Create `backend/src/utils/csv-stream.ts`:
  ```typescript
  import { format } from '@fast-csv/format';
  import { Response } from 'express';

  export async function streamPaymentsToCsv(
    res: Response,
    paymentStream: AsyncIterable<Payment>
  ) {
    const csvStream = format({
      headers: true,
      quoteColumns: true,
      delimiter: ',',
      objectDelimiter: ','
    });

    csvStream.pipe(res);

    for await (const payment of paymentStream) {
      csvStream.write({
        id: payment.id,
        email: payment.user.email,
        name: payment.user.fullName,
        amount: payment.amountPiasters,
        status: payment.status,
        createdAt: payment.createdAt.toISOString()
      });
    }

    csvStream.end();
  }
  ```

- [ ] **Step 3**: Update `orders.controller.ts`:
  ```typescript
  async exportCsv(req: Request, res: Response) {
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');

    // Stream payments from database in batches
    const batchSize = 100;
    let skip = 0;

    async function* paymentStream() {
      while (true) {
        const payments = await prisma.payment.findMany({
          where: { /* filters */ },
          include: { user: { select: { fullName: true, email: true } } },
          take: batchSize,
          skip: skip,
          orderBy: { createdAt: "desc" }
        });

        if (payments.length === 0) break;

        for (const payment of payments) {
          yield payment;
        }

        skip += batchSize;
      }
    }

    await streamPaymentsToCsv(res, paymentStream());
  }
  ```

- [ ] **Step 4**: Test with large dataset:
  ```bash
  # Download CSV (should not crash even with 100k payments)
  curl /api/v1/admin/orders/export-csv \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --output payments.csv

  # Monitor memory usage
  watch -n 1 'ps aux | grep node | grep -v grep'
  # Memory should stay constant, not grow to 4GB+
  ```

- [ ] **Step 5**: Add progress tracking (optional):
  ```typescript
  // Log every 1000 payments exported
  let count = 0;
  for await (const payment of paymentStream()) {
    count++;
    if (count % 1000 === 0) {
      logger.info(`Exported ${count} payments...`);
    }
    csvStream.write(payment);
  }
  ```

- [ ] **Step 6**: Test on small dataset (10 records) to verify format:
  ```bash
  curl /api/v1/admin/orders/export-csv \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --output test.csv

  head test.csv
  # Should show: id,email,name,amount,status,createdAt
  ```

#### Acceptance Criteria
✅ CSV export uses streaming (not in-memory)  
✅ Constant memory usage regardless of dataset size  
✅ Processes 10,000+ records without OOM  
✅ File downloads correctly  
✅ CSV format valid (headers, proper escaping)  

#### How to Verify
```bash
# Monitor memory before and during export
free -h  # Before export

# Start export in background
curl /api/v1/admin/orders/export-csv \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --output payments.csv &

# Watch memory during export
while true; do 
  free -h | grep Mem
  sleep 1
done

# Memory should remain stable, e.g.:
# Mem:   7.8Gi       2.3Gi       3.4Gi
# Mem:   7.8Gi       2.4Gi       3.3Gi  # Only +100MB for streaming
# Mem:   7.8Gi       2.3Gi       3.4Gi
```

---

### PHASE 1 - TASK 6: Consolidate Duplicate Enrollment Counts in Analytics

**Severity**: CRITICAL - Memory bloat  
**Type**: Performance / Caching  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

#### Description
The analytics service fetches all enrollments then filters in-memory for status counts. Instead of loading 50,000 enrollments into memory, use SQL aggregation with WHERE clauses. Each analytics request should take milliseconds, not seconds.

#### Current Issue
```typescript
// analytics.service.ts
const allEnrollments = await prisma.enrollment.findMany(); // Loads ALL
const activeEnrollments = allEnrollments.filter(e => e.status === "ACTIVE").length;
const revokedEnrollments = allEnrollments.filter(e => e.status === "REVOKED").length;
// With 50k enrollments, this loads 50k objects into memory, then filters!
```

#### Files to Modify
1. **`backend/src/services/analytics.service.ts`** - Use aggregation instead of filter
2. **`backend/src/repositories/enrollment.repository.ts`** - Add aggregation methods

#### Implementation Checklist

- [ ] **Step 1**: Add aggregation methods to `enrollment.repository.ts`:
  ```typescript
  async countByStatus(status: EnrollmentStatus): Promise<number> {
    return prisma.enrollment.count({
      where: { status }
    });
  }

  async countByStatusMultiple(): Promise<Record<EnrollmentStatus, number>> {
    const [active, revoked, none] = await Promise.all([
      this.countByStatus("ACTIVE"),
      this.countByStatus("REVOKED"),
      this.countByStatus("NONE")
    ]);
    return { ACTIVE: active, REVOKED: revoked, NONE: none };
  }
  ```

- [ ] **Step 2**: Update `analytics.service.ts`:
  ```typescript
  // Before: const allEnrollments = await prisma.enrollment.findMany();
  // After:
  const enrollmentCounts = await enrollmentRepository.countByStatusMultiple();
  
  const activeEnrollments = enrollmentCounts.ACTIVE;
  const revokedEnrollments = enrollmentCounts.REVOKED;
  // No in-memory filtering needed!
  ```

- [ ] **Step 3**: Remove unused `allEnrollments` variable:
  ```bash
  # Find all references
  grep -n "allEnrollments" backend/src/services/analytics.service.ts
  # Remove or replace all with enrollmentCounts
  ```

- [ ] **Step 4**: Add caching to aggregation:
  ```typescript
  async countByStatusMultiple(): Promise<Record<EnrollmentStatus, number>> {
    const cacheKey = "enrollment-counts";
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [active, revoked, none] = await Promise.all([
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { status: "REVOKED" } }),
      prisma.enrollment.count({ where: { status: "NONE" } })
    ]);

    const result = { ACTIVE: active, REVOKED: revoked, NONE: none };
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
    
    return result;
  }
  ```

- [ ] **Step 5**: Invalidate cache on enrollment status changes:
  ```typescript
  // When enrollment status changes
  await enrollmentRepository.update(id, { status: "ACTIVE" });
  await redis.del("enrollment-counts"); // Invalidate cache
  ```

- [ ] **Step 6**: Benchmark performance:
  ```bash
  # Before optimization
  time curl /api/v1/admin/analytics?days=30 \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected: 5-10 seconds (loading 50k rows)

  # After optimization
  time curl /api/v1/admin/analytics?days=30 \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected: <100ms (using SQL aggregation)
  ```

- [ ] **Step 7**: Test with large enrollment counts:
  ```bash
  # Create 10k test enrollments
  # Then run analytics request
  # Should respond in <1 second
  ```

#### Acceptance Criteria
✅ No `findMany()` without `where` clause in analytics  
✅ Uses `.count()` with WHERE for status aggregation  
✅ Memory usage constant regardless of enrollment count  
✅ Response time <100ms (vs 5-10 seconds before)  
✅ Aggregation results cached for 1 hour  
✅ Cache invalidated on enrollment status changes  

#### How to Verify
```bash
# Monitor memory and time
time curl /api/v1/admin/analytics?days=30 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check logs for database query count
grep "Query:" logs/app.log | grep analytics
# Should show COUNT queries, not SELECT * queries
```

---

### PHASE 1 - TASK 7: Fix Demo Mode Authentication Bypass

**Severity**: CRITICAL - Authentication disabled  
**Type**: Security / Authentication  
**Estimated Time**: 2-3 hours  
**Files Modified**: 2

#### Description
Demo mode uses a URL parameter (`?demo=1`) to bypass role checking entirely. Any user can add `?demo=1` to any URL to gain access to all pages. This completely disables authentication in production.

#### Current Issue
```typescript
// router.tsx
if (demo && role === "STUDENT") {
  return children; // BYPASSES ALL ROLE CHECKS!
}
```

#### Files to Modify
1. **`frontend/src/lib/router.tsx`** - Remove URL param demo mode
2. **`frontend/src/pages/Preview.tsx`** - Use environment-based config

#### Implementation Checklist

- [ ] **Step 1**: Create `.env.demo` file for development:
  ```
  VITE_DEMO_MODE=true
  VITE_DEMO_ROLE=STUDENT
  ```

- [ ] **Step 2**: Update `router.tsx` to use environment variable only:
  ```typescript
  // Before:
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  const role = demo ? "STUDENT" : user?.role;

  // After:
  const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";
  const role = demoModeEnabled ? import.meta.env.VITE_DEMO_ROLE : user?.role;
  ```

- [ ] **Step 3**: In production `.env`:
  ```
  # Ensure demo mode is OFF
  VITE_DEMO_MODE=false
  ```

- [ ] **Step 4**: Update `RequireRole` component:
  ```typescript
  export const RequireRole = ({ role, children }: Props) => {
    const { user } = useAuth();
    const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";
    
    if (!demoModeEnabled && user?.role !== role) {
      return <Redirect to="/login" />;
    }
    
    return children;
  };
  ```

- [ ] **Step 5**: Test that demo mode cannot be bypassed:
  ```bash
  # Try to bypass with URL param (should fail)
  curl https://eduflow.app/lessons?demo=1
  # Should be redirected to /login if not authenticated

  # For development, set VITE_DEMO_MODE=true in .env
  npm run dev
  # Now demo mode should work (if explicitly enabled)
  ```

- [ ] **Step 6**: Update documentation:
  - Clearly state demo mode is development-only
  - Document that it must be disabled in production
  - Add to CI/CD checks

- [ ] **Step 7**: Add build-time check to ensure demo mode is off:
  ```typescript
  // In vite.config.ts or during build
  if (process.env.NODE_ENV === "production" && process.env.VITE_DEMO_MODE === "true") {
    throw new Error("ERROR: Demo mode MUST be disabled in production!");
  }
  ```

#### Acceptance Criteria
✅ URL parameter `?demo=1` no longer disables authentication  
✅ Demo mode only works if `VITE_DEMO_MODE=true` is set  
✅ Demo mode is explicitly disabled in production  
✅ Cannot be bypassed by user action  
✅ Build fails if demo mode enabled for production  

#### How to Verify
```bash
# Production build (demo mode must be off)
npm run build
# Should succeed

# If VITE_DEMO_MODE=true in production
# Should fail build with "Demo mode MUST be disabled"

# Verify no demo=1 URL param works
curl https://prod.eduflow.app/lessons?demo=1
# Should redirect to /login if not authenticated
```

---

### PHASE 1 - TASK 8: Sanitize HTML in Admin Notifications (Fix XSS)

**Severity**: CRITICAL - Stored XSS  
**Type**: Security / XSS Prevention  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

#### Description
Admin notifications preview renders user-entered HTML via `dangerouslySetInnerHTML` without sanitization. An admin can enter malicious JavaScript (e.g., `<img src=x onerror="alert('XSS')">`) which executes in the preview and potentially in recipient emails.

#### Current Issue
```typescript
// Notifications.tsx
<div dangerouslySetInnerHTML={{ __html: previewText }} />
// If previewText = "<img src=x onerror='alert(\"XSS\")'>"
// The JavaScript runs!
```

#### Files to Modify
1. **`frontend/src/pages/admin/Notifications.tsx`** - Sanitize HTML before rendering
2. **`backend/src/utils/email.ts`** - Sanitize HTML before sending emails

#### Implementation Checklist

- [ ] **Step 1**: Install DOMPurify:
  ```bash
  npm install dompurify
  npm install --save-dev @types/dompurify
  ```

- [ ] **Step 2**: Update `Notifications.tsx`:
  ```typescript
  import DOMPurify from 'dompurify';

  const previewText = useMemo(() => {
    const dirty = selected?.bodyHtml ?? "";
    // Sanitize before rendering
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      KEEP_CONTENT: true
    });
  }, [selected]);

  // In JSX:
  <div dangerouslySetInnerHTML={{ __html: previewText }} />
  ```

- [ ] **Step 3**: Update `email.ts` to sanitize emails:
  ```typescript
  import DOMPurify from 'isomorphic-dompurify'; // Server-side version

  async sendBrandedEmail(data) {
    // Sanitize HTML content
    const cleanHtml = DOMPurify.sanitize(data.bodyHtml, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      KEEP_CONTENT: true
    });

    const emailHtml = this.template('branded', {
      ...data,
      bodyHtml: cleanHtml // Use sanitized version
    });

    await this.send({ ...data, html: emailHtml });
  }
  ```

- [ ] **Step 4**: Install server-side DOMPurify:
  ```bash
  npm install isomorphic-dompurify
  ```

- [ ] **Step 5**: Create allowlist of safe tags:
  ```typescript
  const SAFE_EMAIL_TAGS = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
    KEEP_CONTENT: true,
    FORCE_BODY: false
  };
  ```

- [ ] **Step 6**: Test XSS payload rejection:
  ```bash
  # Try to inject XSS
  curl -X POST /api/v1/admin/notifications \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "subject": "Test",
      "bodyHtml": "<img src=x onerror=\"alert(\"XSS\")\">"
    }'

  # Check that the notification stores safely
  # The <img onerror> tag should be removed or escaped
  ```

- [ ] **Step 7**: Test that safe HTML is preserved:
  ```typescript
  const input = "<p>Hello <strong>world</strong></p>";
  const output = DOMPurify.sanitize(input, SAFE_EMAIL_TAGS);
  // Should output: "<p>Hello <strong>world</strong></p>"
  ```

- [ ] **Step 8**: Test email rendering:
  ```bash
  # Create notification with HTML
  # Send email
  # Open in email client
  # Verify formatting is preserved
  # Verify no JavaScript executes
  ```

#### Acceptance Criteria
✅ HTML preview sanitized before rendering  
✅ XSS payloads rejected or stripped  
✅ Safe formatting tags preserved (bold, italic, links)  
✅ Emails sent with sanitized HTML  
✅ No JavaScript execution in emails  

#### How to Verify
```bash
# Test XSS payload
curl -X POST /api/v1/admin/notifications \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"subject":"Test","bodyHtml":"<script>alert(\"XSS\")</script>"}'

# Verify stored notification (script tag removed)
curl /api/v1/admin/notifications/latest \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | grep "script"
# Should return nothing (script tag removed)

# Test safe tags are preserved
curl -X POST /api/v1/admin/notifications \
  -d '{"subject":"Test","bodyHtml":"<p>Hello <strong>world</strong></p>"}'
# Should preserve <p> and <strong> tags
```

---

## PHASE 1 SUMMARY

| Task | Critical Issue | Time | Status |
|------|---|---|---|
| 1 | Ticket RBAC bypass | 3-4h | ⏳ |
| 2 | Settings env injection | 4-5h | ⏳ |
| 3 | Contact form account creation | 3-4h | ⏳ |
| 4 | Email notification loop | 5-6h | ⏳ |
| 5 | CSV export OOM | 4-5h | ⏳ |
| 6 | Duplicate enrollment counts | 3-4h | ⏳ |
| 7 | Demo mode bypass | 2-3h | ⏳ |
| 8 | Notification XSS | 3-4h | ⏳ |
| **TOTAL PHASE 1** | **8 CRITICAL FIXES** | **31-35 hours** | ⏳ |

---

## PHASE 2: HIGH PRIORITY SECURITY & PERFORMANCE FIXES

**Duration**: 2-3 weeks  
**Priority**: Must fix before or shortly after Phase 1  
**Tasks**: 8

*(Detailed task descriptions for Phase 2 follow the same format as Phase 1)*

---

### PHASE 2 - TASK 1: Add RBAC Middleware to Admin Resource Endpoints

**Severity**: HIGH  
**Type**: Security  
**Estimated Time**: 3-4 hours  

Ensure admin resource creation validates that lessons belong to admin's authorized courses.

---

### PHASE 2 - TASK 2: Restrict Admin Order Detail User Data

**Severity**: HIGH  
**Type**: Security  
**Estimated Time**: 2-3 hours  

Remove `passwordHash`, `emailVerified`, `oauthProvider` from admin order detail responses. Return only necessary fields: `email`, `fullName`, `id`.

---

### PHASE 2 - TASK 3: Add Pagination to Admin CSV Export

**Severity**: HIGH  
**Type**: Security  
**Estimated Time**: 2-3 hours  

Already addressed in Task 5 above.

---

### PHASE 2 - TASK 4: Implement Request-Level Memoization for Lesson Count

**Severity**: HIGH  
**Type**: Performance  
**Estimated Time**: 3-4 hours  

Cache `getPublishedLessonCount()` at request level to avoid multiple Redis lookups in same request.

---

### PHASE 2 - TASK 5: Add Pagination to Student Detail Lesson Progress

**Severity**: HIGH  
**Type**: Performance  
**Estimated Time**: 3-4 hours  

Add `take: 50` to lessonProgress query in student detail endpoint to limit to last 50 lessons.

---

### PHASE 2 - TASK 6: Add React Query Cache Configuration (Frontend)

**Severity**: HIGH  
**Type**: Performance  
**Estimated Time**: 4-5 hours  

Set `staleTime: 60000` (1 minute) on all React Query hooks to prevent unnecessary refetches.

---

### PHASE 2 - TASK 7: Consolidate Duplicate Course Data Endpoints (Frontend)

**Severity**: HIGH  
**Type**: Performance  
**Estimated Time**: 3-4 hours  

Use single queryKey for all course data (`["course"]` instead of `["course-summary"]`, `["course-public"]`, etc.).

---

### PHASE 2 - TASK 8: Fix Lesson Data Double-Fetch (Frontend)

**Severity**: HIGH  
**Type**: Performance  
**Estimated Time**: 3-4 hours  

Remove duplicate `/lessons/grouped` call; consolidate to single endpoint or reuse first call's data.

---

## PHASE 3: MEDIUM PRIORITY FIXES & OPTIMIZATIONS

**Duration**: 3-4 weeks  
**Tasks**: 8

*(Includes hardcoding fixes, admin pagination, input validation, cache consistency, etc.)*

---

## PHASE 4: LOW PRIORITY OPTIMIZATION & REFACTORING

**Duration**: 2-3 weeks (ongoing)  
**Tasks**: 7

*(Includes component splitting, console cleanup, error handling, media scanning, etc.)*

---

## CRITICAL PATH TIMELINE

```
Week 1-3:   Phase 1 (8 critical tasks)
Week 3-6:   Phase 2 (8 high priority tasks) - PARALLEL with Phase 1 final tasks
Week 6-10:  Phase 3 (8 medium priority tasks)
Week 10+:   Phase 4 (7 low priority tasks) - Ongoing

Total: 8-10 weeks for full remediation
```

---

## DEPLOYMENT GATES

### ❌ Cannot Deploy Without:
- [x] Phase 1 - All 8 critical tasks
- [x] Security audit sign-off

### ⚠️ Recommended Before Deploy:
- [x] Phase 2 - All 8 high priority tasks
- [x] Automated security scanning (SAST)
- [x] Performance testing (load test with 10k users)

### ✅ Nice to Have:
- Phase 3 - Medium priority fixes
- Phase 4 - Low priority optimization

---

## VERIFICATION CHECKLIST

After each phase, verify:

- [ ] All changes tested locally
- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript strict mode: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] Security scan clean: `npm audit`
- [ ] Performance benchmarks met
- [ ] Code review signed off
- [ ] Changes documented
- [ ] Rollback plan prepared

---

## NEXT STEPS

1. **Start Phase 1 immediately** - Critical vulnerabilities block production
2. **Allocate dev resources** - Tasks are detailed and implementable
3. **Establish review process** - Each task requires security/performance review
4. **Monitor deployment metrics** - Track query counts, memory usage, response times
5. **Plan post-deployment** - Set up monitoring for issues in production

See `COMPREHENSIVE_AUDIT_REPORT.md` for detailed findings.
