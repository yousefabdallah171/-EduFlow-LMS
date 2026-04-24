# EduFlow LMS - Master Task Checklists

**All Phases, All Tasks, Full Implementation Checklists**

**Last Updated**: 2026-04-24  
**Total Tasks**: 31 (4 phases)  
**Printable**: Yes ✅  

---

# PHASE 1: CRITICAL VULNERABILITIES & PERFORMANCE BLOCKERS

**Duration**: 2-3 weeks | **Priority**: MUST FIX | **Status**: 🔴 PENDING

---

## PHASE 1 - TASK 1: Fix Ticket Management RBAC Bypass

**Severity**: 🔴 CRITICAL - Exposes all support conversations  
**Type**: Security / RBAC  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
The ticket management endpoints (`listAll`, `updateStatus`, `reply`) lack role-based access control. Any authenticated user (including students) can access ALL support tickets and add messages to ANY ticket. This exposes sensitive customer support conversations.

### Problem Code
```typescript
// tickets.controller.ts - Lines 92-206
// NO role checks in handlers
async listAll(req: Request, res: Response, next: NextFunction) {
  const tickets = await prisma.supportTicket.findMany({
    // Returns ALL tickets without checking user role
  });
}

async reply(req: Request, res: Response, next: NextFunction) {
  const adminId = req.user!.userId; // ANY user becomes "admin"
  // User can add messages to ANY ticket
}
```

### Impact
- ❌ Students can read all customer support conversations
- ❌ Students can reply to any ticket posing as support staff
- ❌ Data breach of sensitive support interactions
- ❌ Compliance violation (unauthorized access to customer data)

### Files to Modify
- `backend/src/routes/admin.routes.ts`
- `backend/src/controllers/tickets.controller.ts`

### Implementation Checklist

#### Step 1: Update admin.routes.ts ⏱️ 15 min
- [ ] Open `backend/src/routes/admin.routes.ts`
- [ ] Find the ticket route definitions (search for "tickets")
- [ ] Add `requireRole("ADMIN")` middleware to all ticket endpoints:
  ```typescript
  router.get("/tickets", requireRole("ADMIN"), ticketsController.listAll);
  router.patch("/tickets/:id/status", requireRole("ADMIN"), ticketsController.updateStatus);
  router.post("/tickets/:id/reply", requireRole("ADMIN"), ticketsController.reply);
  ```
- [ ] Verify syntax is correct
- [ ] Save file

#### Step 2: Add internal validation in tickets.controller.ts ⏱️ 30 min
- [ ] Open `backend/src/controllers/tickets.controller.ts`
- [ ] In `listAll()` method (line 92), add at START:
  ```typescript
  async listAll(req: Request, res: Response, next: NextFunction) {
    // Internal security check (defense in depth)
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    // ... rest of method
  ```
- [ ] In `updateStatus()` method (line 115), add same check
- [ ] In `reply()` method (line 151), add same check
- [ ] Verify all three methods have role check
- [ ] Save file

#### Step 3: Update reply() to mark messages as admin ⏱️ 15 min
- [ ] In `reply()` handler, ensure message is tagged with admin flag:
  ```typescript
  const newMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderId: req.user!.userId,
      body: message,
      isAdminReply: req.user?.role === "ADMIN" // Mark as admin
    }
  });
  ```
- [ ] Verify message model has `isAdminReply` field in schema
- [ ] If not, update Prisma schema and run migration

#### Step 4: Run Tests ⏱️ 30 min
- [ ] Run test suite for tickets:
  ```bash
  npm test -- tickets.test.ts
  ```
- [ ] Verify all tests pass
- [ ] If tests fail, check error messages and fix
- [ ] Ensure tests include:
  - [ ] Admin CAN list tickets
  - [ ] Student CANNOT list tickets (403)
  - [ ] Admin CAN reply to tickets
  - [ ] Student CANNOT reply (403)

#### Step 5: Manual Verification ⏱️ 15 min
- [ ] Start dev server: `npm run dev`
- [ ] Test with admin token:
  ```bash
  curl /api/v1/admin/tickets \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Should return list of tickets (200)
  ```
- [ ] Test with student token:
  ```bash
  curl /api/v1/admin/tickets \
    -H "Authorization: Bearer $STUDENT_TOKEN"
  # Should return 403 Forbidden
  ```
- [ ] Test reply as admin (should work)
- [ ] Test reply as student (should fail with 403)

#### Step 6: Code Review ⏱️ 15 min
- [ ] Request code review from security lead
- [ ] Share: routes file + controller file
- [ ] Wait for approval
- [ ] Address any feedback

#### Step 7: Commit Changes ⏱️ 10 min
- [ ] Stage changes:
  ```bash
  git add backend/src/routes/admin.routes.ts
  git add backend/src/controllers/tickets.controller.ts
  ```
- [ ] Create commit:
  ```bash
  git commit -m "fix: Add RBAC middleware to ticket management endpoints
  
  - Requires ADMIN role for /admin/tickets/* endpoints
  - Adds internal role check in each handler (defense in depth)
  - Students can no longer access support tickets
  
  Fixes CRITICAL security issue: Ticket RBAC bypass"
  ```
- [ ] Verify commit created successfully

### ✅ Acceptance Criteria
- [ ] Middleware added to all ticket endpoints
- [ ] Internal role checks added to handlers
- [ ] Students receive 403 Forbidden when accessing tickets
- [ ] Admin users can still access and manage tickets normally
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Commit created and pushed

### 🧪 Verification Commands
```bash
# Test admin access (should succeed)
curl -X GET http://localhost:3000/api/v1/admin/tickets \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
# Expected: 200 OK, list of tickets

# Test student access (should fail)
curl -X GET http://localhost:3000/api/v1/admin/tickets \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
# Expected: 403 Forbidden

# Test reply as admin (should succeed)
curl -X POST http://localhost:3000/api/v1/admin/tickets/123/reply \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Response from admin"}'
# Expected: 200 OK, message created

# Test reply as student (should fail)
curl -X POST http://localhost:3000/api/v1/admin/tickets/123/reply \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Fake admin response"}'
# Expected: 403 Forbidden
```

### ⏱️ Time Estimate
- Total: **3-4 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 2: Remove Admin Settings Environment Variable Injection

**Severity**: 🔴 CRITICAL - Remote configuration compromise  
**Type**: Security / Configuration  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
The `updateSystem()` endpoint allows arbitrary environment variable injection at runtime. An admin (or compromised account) can modify SMTP credentials, payment API keys, or any other env var, enabling email spoofing, payment fraud, or other attacks. Changes persist in-memory and are lost on restart but can cause immediate damage.

### Problem Code
```typescript
// settings.controller.ts - Lines 48-55
async updateSystem(req: Request, res: Response) {
  const { smtpHost, smtpUser, smtpPass, paymobKey } = req.body;
  if (smtpHost) process.env.SMTP_HOST = smtpHost;      // NO VALIDATION!
  if (smtpUser) process.env.SMTP_USER = smtpUser;      // Direct mutation
  if (smtpPass) process.env.SMTP_PASS = smtpPass;      // Credential exposure
  if (paymobKey) process.env.PAYMOB_API_KEY = paymobKey; // Payment credentials!
  res.json({ ok: true });
}
```

### Impact
- ❌ Admin can change SMTP credentials → email spoofing
- ❌ Admin can inject Paymob API keys → payment fraud
- ❌ Admin can modify ANY environment variable
- ❌ No audit trail of changes
- ❌ Changes immediate but lost on restart

### Files to Modify
- `backend/src/controllers/admin/settings.controller.ts`
- `backend/src/routes/admin.routes.ts`

### Implementation Checklist

#### Step 1: Backup current settings.controller.ts ⏱️ 5 min
- [ ] Open `backend/src/controllers/admin/settings.controller.ts`
- [ ] Read and understand the current `updateSystem()` function
- [ ] Take note of what fields it accepts
- [ ] Save or backup the file mentally

#### Step 2: Remove updateSystem() environment mutation ⏱️ 30 min
- [ ] In `updateSystem()` method, REMOVE all `process.env.*` assignments:
  ```typescript
  // DELETE these lines:
  // if (smtpHost) process.env.SMTP_HOST = smtpHost;
  // if (smtpUser) process.env.SMTP_USER = smtpUser;
  // if (smtpPass) process.env.SMTP_PASS = smtpPass;
  // if (paymobKey) process.env.PAYMOB_API_KEY = paymobKey;
  ```
- [ ] Replace function body with error or read-only response:
  ```typescript
  async updateSystem(req: Request, res: Response) {
    // SECURITY: Environment variables must be configured via:
    // 1. .env file (development)
    // 2. Docker/K8s environment (production)
    // 3. Infrastructure secrets manager (AWS Secrets, etc.)
    // 
    // Runtime mutation is disabled to prevent unauthorized modification
    return res.status(403).json({
      error: "Dynamic configuration updates are disabled",
      message: "Configure environment variables via deployment settings"
    });
  }
  ```
- [ ] Save file

#### Step 3: Update getSystem() to be read-only ⏱️ 20 min
- [ ] Find `getSystem()` method (around line 40)
- [ ] Modify to return ONLY status, not values:
  ```typescript
  async getSystem(req: Request, res: Response) {
    return res.json({
      // Return ONLY status booleans, not actual credentials
      smtpConfigured: !!process.env.SMTP_HOST,
      paymobConfigured: !!process.env.PAYMOB_API_KEY,
      storageConfigured: !!process.env.STORAGE_BUCKET,
      timestamp: new Date()
    });
  }
  ```
- [ ] Verify NO credentials are returned
- [ ] Save file

#### Step 4: In admin.routes.ts, disable PATCH endpoint ⏱️ 10 min
- [ ] Open `backend/src/routes/admin.routes.ts`
- [ ] Find the PATCH endpoint for settings:
  ```typescript
  router.patch("/settings/system", settingsController.updateSystem);
  ```
- [ ] Either COMMENT it out or REMOVE it:
  ```typescript
  // router.patch("/settings/system", settingsController.updateSystem);
  // SECURITY: Dynamic configuration disabled - use environment variables
  ```
- [ ] Verify GET endpoint still works (line: `router.get("/settings/system", ...)`)
- [ ] Save file

#### Step 5: Add security comment to controller ⏱️ 10 min
- [ ] At TOP of settings.controller.ts, add comment:
  ```typescript
  /**
   * SECURITY NOTICE: Environment variable configuration
   * 
   * These settings are READ-ONLY at runtime for security.
   * All configuration must be set via:
   * - Development: .env file
   * - Production: Docker/K8s environment variables or secrets manager
   * 
   * Runtime mutation is DISABLED to prevent:
   * - Unauthorized credential changes
   * - SMTP spoofing via admin panel
   * - Payment API key injection
   * - Other credential-based attacks
   */
  ```
- [ ] Save file

#### Step 6: Update environment configuration documentation ⏱️ 15 min
- [ ] Open `README.md` or `docs/CONFIGURATION.md`
- [ ] Add section: "How to Configure Settings"
  ```markdown
  ## Environment Configuration

  ### Development
  1. Create `.env` file in backend root
  2. Set variables: SMTP_HOST, SMTP_USER, SMTP_PASS, PAYMOB_API_KEY, etc.
  3. Restart dev server: `npm run dev`

  ### Production
  1. Set environment variables in deployment:
     - Docker: In Dockerfile or docker-compose.yml
     - K8s: In deployment YAML
     - Cloud: In secrets manager (AWS, GCP, Azure)
  2. Restart application after changing variables
  ```
- [ ] Save documentation

#### Step 7: Test that endpoint is disabled ⏱️ 20 min
- [ ] Start dev server: `npm run dev`
- [ ] Try to update settings (should fail):
  ```bash
  curl -X PATCH http://localhost:3000/api/v1/admin/settings/system \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"smtpHost":"evil.com"}'
  # Expected: 403 Forbidden or 405 Method Not Allowed
  ```
- [ ] Verify GET settings still works:
  ```bash
  curl -X GET http://localhost:3000/api/v1/admin/settings/system \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected: 200 OK, with status booleans (not credentials)
  ```
- [ ] Verify response does NOT include actual values:
  ```bash
  curl -X GET http://localhost:3000/api/v1/admin/settings/system \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -i "password\|credential\|key"
  # Expected: No output (no secrets in response)
  ```

#### Step 8: Run tests ⏱️ 20 min
- [ ] Run settings tests:
  ```bash
  npm test -- settings.test.ts
  ```
- [ ] All tests should pass
- [ ] If GET tests expect PATCH to work, update those tests

#### Step 9: Code review ⏱️ 15 min
- [ ] Request security review
- [ ] Share modified files
- [ ] Get approval before merging

#### Step 10: Commit changes ⏱️ 10 min
- [ ] Stage changes:
  ```bash
  git add backend/src/controllers/admin/settings.controller.ts
  git add backend/src/routes/admin.routes.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "fix: Disable runtime environment variable mutation

  - Remove PATCH /settings/system endpoint
  - Disable process.env mutations in updateSystem()
  - getSystem() now returns read-only status only
  - Configuration must be set via .env or deployment environment
  
  SECURITY: Prevents admin from injecting credentials
  Fixes CRITICAL: Settings environment injection vulnerability"
  ```

### ✅ Acceptance Criteria
- [ ] PATCH /settings/system endpoint disabled or removed
- [ ] No process.env mutations in code
- [ ] GET /settings/system returns status only (no credentials)
- [ ] No secrets in API responses
- [ ] Documentation updated with configuration instructions
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Commit created

### 🧪 Verification Commands
```bash
# Verify PATCH is disabled
curl -X PATCH http://localhost:3000/api/v1/admin/settings/system \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"smtpHost":"attacker.com"}'
# Expected: 403 or 405

# Verify GET is read-only
curl http://localhost:3000/api/v1/admin/settings/system \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
# Expected: { "smtpConfigured": true, "paymobConfigured": true, ... }
# NOT: { "SMTP_HOST": "...", "SMTP_PASS": "...", ... }

# Verify no credentials in response
curl http://localhost:3000/api/v1/admin/settings/system \
  -H "Authorization: Bearer $ADMIN_TOKEN" | grep -iE "password|secret|key|credential"
# Expected: No output (empty)
```

### ⏱️ Time Estimate
- Total: **4-5 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 3: Disable Auto-Account Creation in Contact Form

**Severity**: 🔴 CRITICAL - Account takeover vulnerability  
**Type**: Security / Authentication  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
The contact form endpoint automatically creates user accounts with empty password hashes for any submitted email. An attacker can create accounts impersonating real users (e.g., admin@example.com) and gain full system access before the legitimate user registers. Accounts are created with `passwordHash: ""` (empty string).

### Problem Code
```typescript
// contact.controller.ts - Lines 28-40
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
// User can now access lessons with no password set!
```

### Impact
- ❌ Attacker can create account as victim@example.com
- ❌ No email verification required
- ❌ Account has empty password → may bypass login
- ❌ Attacker gains student access before legitimate user registers
- ❌ Account takeover vulnerability

### Files to Modify
- `backend/src/controllers/contact.controller.ts`
- `backend/src/services/email.service.ts`

### Implementation Checklist

#### Step 1: Understand current contact flow ⏱️ 10 min
- [ ] Open `backend/src/controllers/contact.controller.ts`
- [ ] Read the entire `submit()` or `contact()` method
- [ ] Understand what it currently does:
  - [ ] Accepts name, email, subject, message
  - [ ] Creates user if doesn't exist
  - [ ] Sends email to user
  - [ ] Returns success
- [ ] Note the method name and line numbers

#### Step 2: Remove user creation logic ⏱️ 20 min
- [ ] Delete the user creation block:
  ```typescript
  // DELETE THIS ENTIRE BLOCK:
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: name,
        passwordHash: "",
        role: "STUDENT",
        emailVerified: false
      }
    });
  }
  ```
- [ ] Replace with clear comment:
  ```typescript
  // NOTE: User creation removed for security.
  // Users must explicitly register via /auth/register endpoint.
  // This prevents account takeover via contact form.
  ```
- [ ] Save file

#### Step 3: Modify handler to send email only ⏱️ 20 min
- [ ] Update contact handler to ONLY send email to support:
  ```typescript
  async submit(req: Request, res: Response, next: NextFunction) {
    const { name, email, subject, message } = req.body;
    
    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields required" });
    }

    try {
      // Send email to support team only
      await emailService.sendContactNotificationToSupport({
        senderName: name,
        senderEmail: email,
        subject: subject,
        message: message
      });

      return res.json({
        success: true,
        message: "Your message has been received. We'll respond to your email soon."
      });
    } catch (error) {
      logger.error("Contact form error", error);
      next(error);
    }
  }
  ```
- [ ] Save file

#### Step 4: Add email template in email.service.ts ⏱️ 25 min
- [ ] Open `backend/src/services/email.service.ts`
- [ ] Add new method for support notifications:
  ```typescript
  async sendContactNotificationToSupport(data: {
    senderName: string;
    senderEmail: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL || "support@eduflow.com";
    
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${escapeHtml(data.senderName)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.senderEmail)}">${escapeHtml(data.senderEmail)}</a></p>
      <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
      <hr />
      <h3>Message:</h3>
      <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
    `;

    await this.send({
      to: supportEmail,
      subject: `[Contact Form] ${data.subject}`,
      html: html,
      replyTo: data.senderEmail
    });
  }
  ```
- [ ] Verify escapeHtml() is imported
- [ ] Save file

#### Step 5: Add rate limiting to contact form ⏱️ 20 min
- [ ] Open `backend/src/middleware/rate-limit.middleware.ts` or similar
- [ ] Create new rate limiter for contact form:
  ```typescript
  export const contactFormRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 submissions per 15 min per IP
    message: "Too many contact submissions. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  ```
- [ ] Save file

#### Step 6: Apply rate limiting to contact route ⏱️ 10 min
- [ ] Open `backend/src/routes/public.routes.ts` (or where contact is)
- [ ] Add rate limiting middleware:
  ```typescript
  router.post("/contact", contactFormRateLimit, contactController.submit);
  ```
- [ ] Save file

#### Step 7: Update response message ⏱️ 10 min
- [ ] Ensure response message NO LONGER mentions account creation:
  - [ ] Remove: "Your account has been created"
  - [ ] Remove: "You can now log in"
  - [ ] Add: "We'll respond to your email soon"
  - [ ] Add: "To enroll in courses, please register here"
- [ ] Add localization keys if using i18n
- [ ] Save file

#### Step 8: Verify NO user is created ⏱️ 20 min
- [ ] Start dev server: `npm run dev`
- [ ] Submit contact form:
  ```bash
  curl -X POST http://localhost:3000/api/v1/contact \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Attacker",
      "email": "admin@eduflow.com",
      "subject": "Test",
      "message": "Test message"
    }'
  # Expected: 200 OK, message sent
  ```
- [ ] Verify NO user was created:
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@eduflow.com","password":"anything"}'
  # Expected: 401 Unauthorized or "User not found"
  ```
- [ ] Check database directly (if needed):
  ```sql
  SELECT COUNT(*) FROM User WHERE email = 'admin@eduflow.com';
  -- Expected: 0 (no user created)
  ```

#### Step 9: Verify rate limiting works ⏱️ 15 min
- [ ] Submit 6 contact forms from same IP:
  ```bash
  for i in {1..6}; do
    curl -X POST http://localhost:3000/api/v1/contact \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Test\",\"email\":\"test$i@example.com\",\"subject\":\"Test\",\"message\":\"Test\"}"
    echo "Request $i"
  done
  ```
- [ ] Request 6 should return 429 Too Many Requests
- [ ] Verify after 15 minutes, can submit again

#### Step 10: Run tests ⏱️ 20 min
- [ ] Run contact form tests:
  ```bash
  npm test -- contact.test.ts
  ```
- [ ] All tests should pass
- [ ] If tests expect user creation, update them to NOT expect it

#### Step 11: Code review ⏱️ 15 min
- [ ] Request code review
- [ ] Share modified files
- [ ] Get approval

#### Step 12: Commit changes ⏱️ 10 min
- [ ] Stage changes:
  ```bash
  git add backend/src/controllers/contact.controller.ts
  git add backend/src/services/email.service.ts
  git add backend/src/middleware/rate-limit.middleware.ts
  git add backend/src/routes/public.routes.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "fix: Remove auto-account creation from contact form

  - Contact form NO LONGER creates user accounts
  - Only sends email to support team
  - Add rate limiting (5 per 15 min per IP)
  - Users must explicitly register via /auth/register
  
  SECURITY: Prevents account takeover via contact form
  Fixes CRITICAL: Contact form account creation vulnerability"
  ```

### ✅ Acceptance Criteria
- [ ] Contact form does NOT create accounts
- [ ] Contact form sends email to support only
- [ ] Rate limiting applied (5/15min)
- [ ] Response message updated (no mention of account creation)
- [ ] No users created when submitting contact form
- [ ] Legitimate users can still register normally
- [ ] All tests passing
- [ ] Code reviewed and approved

### 🧪 Verification Commands
```bash
# Submit contact form
curl -X POST http://localhost:3000/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "attacker@example.com",
    "subject": "Contact",
    "message": "Test message"
  }'
# Expected: 200 OK

# Verify user NOT created
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@example.com",
    "password": "anything"
  }'
# Expected: 401 or "User not found"

# Test rate limiting (6th request)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test"}'
  echo "Request $i"
done
# Expected: Requests 1-5 succeed (200), request 6 fails (429)
```

### ⏱️ Time Estimate
- Total: **3-4 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 4: Replace Sequential Email Loop with Queue-Based System

**Severity**: 🔴 CRITICAL - Performance blocker  
**Type**: Performance / Architecture  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
The notification broadcast endpoint processes email sends sequentially in a loop. With 1,000+ students, this takes 1.4+ hours and blocks the entire request. Implementing a queue-based system (Bull) with 20 concurrent workers will process emails asynchronously in ~50 minutes instead.

### Problem Code
```typescript
// notifications.controller.ts - Lines 41-51
for (const enrollment of enrollments) {
  try {
    await sendBrandedEmail(...); // Blocks loop - sequential!
    sent++;
  } catch { /* skip failed */ }
}
// 1000 students × 5 seconds = 5000 seconds = 1.4 hours of blocking!
```

### Impact
- ❌ Admin panel unresponsive during broadcast
- ❌ 1000 emails takes 1.4+ hours
- ❌ Request timeout (HTTP timeout usually 30-60s)
- ❌ No way to track progress
- ❌ No retry mechanism

### Files to Create/Modify
- `backend/src/services/email.queue.service.ts` (NEW)
- `backend/src/queues/email.queue.ts` (NEW)
- `backend/src/controllers/admin/notifications.controller.ts`
- `backend/src/server.ts`

### Implementation Checklist

#### Step 1: Install Bull queue library ⏱️ 10 min
- [ ] Open terminal in backend directory
- [ ] Install Bull:
  ```bash
  npm install bull @types/bull
  ```
- [ ] Verify installation:
  ```bash
  npm list bull
  # Should show: bull@X.X.X
  ```

#### Step 2: Create email queue service ⏱️ 20 min
- [ ] Create new file: `backend/src/services/email.queue.service.ts`
- [ ] Add content:
  ```typescript
  import Queue from 'bull';
  import redis from '@/lib/redis';
  import { logger } from '@/lib/logger';

  export interface EmailJob {
    email: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  }

  export const emailQueue = new Queue<EmailJob>('emails', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    },
  });

  export const enqueueEmail = async (data: EmailJob) => {
    const job = await emailQueue.add(data);
    logger.info(`Email queued`, { jobId: job.id, email: data.email });
    return job;
  };

  export const getQueueStats = async () => {
    const counts = await emailQueue.getJobCounts();
    return {
      waiting: counts.wait,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      total: counts.wait + counts.active + counts.completed + counts.failed,
    };
  };
  ```
- [ ] Save file

#### Step 3: Create email queue worker ⏱️ 25 min
- [ ] Create new file: `backend/src/queues/email.queue.ts`
- [ ] Add content:
  ```typescript
  import { emailQueue, EmailJob } from '@/services/email.queue.service';
  import { emailService } from '@/services/email.service';
  import { logger } from '@/lib/logger';

  const CONCURRENT_WORKERS = 20; // Process 20 emails in parallel

  emailQueue.process(CONCURRENT_WORKERS, async (job) => {
    const { email, subject, template, data } = job.data;

    try {
      logger.info(`Processing email job ${job.id}`, { email, subject });

      await emailService.send({
        to: email,
        subject,
        template,
        data,
      });

      job.progress(100);
      logger.info(`Email job ${job.id} completed`, { email });
      
      return { success: true, email };
    } catch (error) {
      logger.error(`Email job ${job.id} failed`, { email, error });
      throw new Error(`Failed to send email to ${email}: ${error.message}`);
    }
  });

  // Event listeners
  emailQueue.on('failed', (job, error) => {
    logger.error(`Email job ${job.id} failed after retries`, {
      email: job.data.email,
      error: error.message,
    });
  });

  emailQueue.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed successfully`, {
      email: job.data.email,
    });
  });

  emailQueue.on('error', (error) => {
    logger.error('Email queue error', { error });
  });

  export { emailQueue };
  ```
- [ ] Save file

#### Step 4: Update notifications.controller.ts ⏱️ 25 min
- [ ] Open `backend/src/controllers/admin/notifications.controller.ts`
- [ ] Find `broadcast()` method
- [ ] Replace sequential loop with queue:
  ```typescript
  import { enqueueEmail } from '@/services/email.queue.service';

  async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, bodyHtml, bodyText } = req.body;

      // Validate input
      if (!subject || (!bodyHtml && !bodyText)) {
        return res.status(400).json({ 
          error: "Subject and body (HTML or text) required" 
        });
      }

      // Get all active enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: { status: "ACTIVE" },
        include: { 
          user: { select: { email: true, fullName: true } } 
        },
      });

      if (enrollments.length === 0) {
        return res.json({
          success: true,
          queued: 0,
          message: "No active enrollments to send to",
        });
      }

      // Queue all emails (instead of sending sequentially)
      let queued = 0;
      for (const enrollment of enrollments) {
        await enqueueEmail({
          email: enrollment.user.email,
          subject: subject,
          template: 'branded-notification',
          data: {
            recipientName: enrollment.user.fullName,
            bodyHtml: bodyHtml,
            bodyText: bodyText,
          },
        });
        queued++;
      }

      // Return immediately (don't wait for emails)
      const estimatedMinutes = Math.ceil(queued / 20 * 2); // 20 workers, ~2min per batch
      
      return res.json({
        success: true,
        queued: queued,
        message: `Queued ${queued} emails for delivery`,
        estimatedDeliveryTime: `${estimatedMinutes} minutes`,
      });
    } catch (error) {
      next(error);
    }
  }
  ```
- [ ] Save file

#### Step 5: Initialize queue worker in server startup ⏱️ 15 min
- [ ] Open `backend/src/server.ts`
- [ ] At the top, add import:
  ```typescript
  import '@/queues/email.queue'; // Initialize worker on startup
  ```
- [ ] This ensures worker is running when server starts
- [ ] Save file

#### Step 6: Add queue status endpoint ⏱️ 20 min
- [ ] In notifications.controller.ts, add new method:
  ```typescript
  import { getQueueStats } from '@/services/email.queue.service';

  async getQueueStatus(req: Request, res: Response) {
    const stats = await getQueueStats();
    return res.json(stats);
  }
  ```
- [ ] In routes, add endpoint:
  ```typescript
  router.get("/admin/notifications/queue-status", 
    requireRole("ADMIN"), 
    notificationsController.getQueueStatus
  );
  ```
- [ ] Save files

#### Step 7: Test queue functionality locally ⏱️ 30 min
- [ ] Start Redis (if not running):
  ```bash
  redis-server
  # Or if using Docker:
  docker run -d -p 6379:6379 redis:latest
  ```
- [ ] Start dev server:
  ```bash
  npm run dev
  ```
- [ ] Queue a test broadcast:
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/notifications/broadcast \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "subject": "Test Notification",
      "bodyHtml": "<p>This is a test</p>"
    }'
  # Expected: 200 OK, "Queued 50 emails for delivery"
  ```
- [ ] Check queue status:
  ```bash
  curl http://localhost:3000/api/v1/admin/notifications/queue-status \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected: { "waiting": 50, "active": 20, "completed": 0, "failed": 0 }
  ```
- [ ] Monitor Redis for queue keys:
  ```bash
  redis-cli
  > keys "bull:emails*"
  # Should show queue data structures
  ```
- [ ] Watch as emails are processed:
  ```bash
  watch -n 5 'curl -s http://localhost:3000/api/v1/admin/notifications/queue-status \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq'
  # Should see "active" decrease, "completed" increase
  ```

#### Step 8: Add logging and monitoring ⏱️ 20 min
- [ ] In email.queue.ts, add progress tracking:
  ```typescript
  emailQueue.on('progress', (job, progress) => {
    if (progress % 10 === 0) {
      logger.info(`Email queue progress: ${progress}% complete`);
    }
  });
  ```
- [ ] Add queue event listeners for monitoring:
  ```typescript
  emailQueue.on('stalled', (job) => {
    logger.warn(`Email job ${job.id} stalled`, { email: job.data.email });
  });
  ```
- [ ] Save file

#### Step 9: Load testing ⏱️ 30 min
- [ ] Create 100+ test users with enrollments (in test DB)
- [ ] Queue broadcast to all:
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/notifications/broadcast \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"subject":"Test","bodyHtml":"<p>Test</p>"}'
  # Should return immediately
  ```
- [ ] Monitor processing:
  ```bash
  # Watch queue drain
  watch -n 2 'curl -s http://localhost:3000/api/v1/admin/notifications/queue-status \
    -H "Authorization: Bearer $ADMIN_TOKEN"'
  ```
- [ ] Verify all emails processed:
  ```bash
  # Final stats
  curl http://localhost:3000/api/v1/admin/notifications/queue-status \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq
  # Expected: { "waiting": 0, "active": 0, "completed": 100, "failed": 0 }
  ```

#### Step 10: Run tests ⏱️ 20 min
- [ ] Run notification tests:
  ```bash
  npm test -- notifications.test.ts
  ```
- [ ] All tests should pass
- [ ] If tests expect synchronous behavior, update them

#### Step 11: Code review ⏱️ 20 min
- [ ] Request code review
- [ ] Share:
  - [ ] `email.queue.service.ts`
  - [ ] `email.queue.ts`
  - [ ] Modified `notifications.controller.ts`
  - [ ] Modified `server.ts`
- [ ] Get approval

#### Step 12: Commit changes ⏱️ 10 min
- [ ] Stage files:
  ```bash
  git add backend/src/services/email.queue.service.ts
  git add backend/src/queues/email.queue.ts
  git add backend/src/controllers/admin/notifications.controller.ts
  git add backend/src/server.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "feat: Implement queue-based email broadcasting system

  - Replace sequential email loop with Bull queue
  - 20 concurrent workers process emails in parallel
  - 1000 emails: 1.4 hours → ~50 minutes
  - Admin panel returns immediately with queue status
  - Add queue progress monitoring endpoint
  - Failed emails automatically retried 3x
  
  PERFORMANCE: 40% faster email delivery
  Fixes CRITICAL: Email loop performance blocker"
  ```

### ✅ Acceptance Criteria
- [ ] Emails queued instead of sent sequentially
- [ ] Broadcast endpoint returns immediately
- [ ] 20 concurrent workers active
- [ ] Estimated delivery time: 1000 emails ≈ 50 minutes (vs 5000+ minutes)
- [ ] Failed emails retried 3x with exponential backoff
- [ ] Queue status endpoint shows progress
- [ ] Redis required (already in stack)
- [ ] All tests passing
- [ ] Code reviewed and approved

### 🧪 Verification Commands
```bash
# Queue 100 emails
time curl -X POST http://localhost:3000/api/v1/admin/notifications/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","bodyHtml":"<p>Test</p>"}'
# Expected: Returns in <1 second (not 500+ seconds)

# Monitor queue progress
watch -n 5 'curl http://localhost:3000/api/v1/admin/notifications/queue-status \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq'
# Watch waiting → active → completed

# Verify workers processing
redis-cli
> HGETALL "bull:emails:1:1"
# Should see job data being processed
```

### ⏱️ Time Estimate
- Total: **5-6 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 5: Implement Streaming CSV Export (Fix Memory Overflow)

**Severity**: 🔴 CRITICAL - OOM vulnerability  
**Type**: Performance / Memory  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
CSV export loads entire payment dataset into memory before generating file. With 10,000+ payments, this exhausts available memory and crashes server. Streaming the response allows exporting arbitrarily large datasets without OOM.

### Problem Code
```typescript
// orders.controller.ts - Lines 73-88
const payments = await prisma.payment.findMany({
  include: { user: { select: { fullName: true, email: true } } },
  orderBy: { createdAt: "desc" }
  // NO pagination - loads ENTIRE dataset into memory!
});

const csv = convertToCSV(payments); // All data in memory
res.send(csv); // Finally send
// With 10,000 payments, memory usage = 50-100MB
```

### Impact
- ❌ Memory grows with dataset size
- ❌ 10,000+ payments = potential OOM
- ❌ Server crash on large exports
- ❌ No progress indication

### Files to Create/Modify
- `backend/src/utils/csv-stream.ts` (NEW)
- `backend/src/controllers/admin/orders.controller.ts`

### Implementation Checklist

#### Step 1: Install fast-csv library ⏱️ 10 min
- [ ] Install streaming CSV library:
  ```bash
  npm install fast-csv @types/fast-csv
  ```
- [ ] Verify:
  ```bash
  npm list fast-csv
  ```

#### Step 2: Create CSV stream utility ⏱️ 25 min
- [ ] Create: `backend/src/utils/csv-stream.ts`
- [ ] Add content:
  ```typescript
  import { format } from '@fast-csv/format';
  import { Response } from 'express';
  import { logger } from '@/lib/logger';

  export interface PaymentRow {
    id: string;
    email: string;
    name: string;
    amount: number;
    status: string;
    createdAt: string;
  }

  export async function streamPaymentsToCsv(
    res: Response,
    paymentStream: AsyncIterable<PaymentRow>
  ): Promise<void> {
    const csvStream = format<PaymentRow>({
      headers: true,
      quoteColumns: {
        id: true,
        email: true,
        name: true,
        amount: false,
        status: true,
        createdAt: true,
      },
    });

    // Pipe CSV stream to response
    csvStream.pipe(res);

    let count = 0;
    try {
      for await (const payment of paymentStream) {
        csvStream.write(payment);
        count++;

        // Log progress every 1000 payments
        if (count % 1000 === 0) {
          logger.info(`Exported ${count} payments...`);
        }
      }
      csvStream.end();
      logger.info(`CSV export completed: ${count} total payments`);
    } catch (error) {
      logger.error(`CSV export error after ${count} payments`, error);
      csvStream.destroy();
      throw error;
    }
  }
  ```
- [ ] Save file

#### Step 3: Update orders.controller.ts ⏱️ 30 min
- [ ] Open `backend/src/controllers/admin/orders.controller.ts`
- [ ] Find `exportCsv()` method (around line 73)
- [ ] Replace with streaming implementation:
  ```typescript
  import { streamPaymentsToCsv, PaymentRow } from '@/utils/csv-stream';

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="payments.csv"'
      );

      const batchSize = 100;
      let skip = 0;

      // Create async generator for streaming payments
      async function* paymentStream() {
        while (true) {
          const payments = await prisma.payment.findMany({
            where: {
              // Optional: add filters from req.query
            },
            include: {
              user: {
                select: { fullName: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: batchSize,
            skip: skip,
          });

          if (payments.length === 0) break;

          for (const payment of payments) {
            yield {
              id: payment.id,
              email: payment.user.email,
              name: payment.user.fullName,
              amount: payment.amountPiasters,
              status: payment.status,
              createdAt: payment.createdAt.toISOString(),
            } as PaymentRow;
          }

          skip += batchSize;
        }
      }

      // Stream payments to CSV
      await streamPaymentsToCsv(res, paymentStream());
    } catch (error) {
      logger.error('CSV export error', error);
      next(error);
    }
  }
  ```
- [ ] Save file

#### Step 4: Verify generator function syntax ⏱️ 10 min
- [ ] Double-check async generator syntax:
  - [ ] `async function*` (with asterisk)
  - [ ] `yield` statement inside loop
  - [ ] Called as `paymentStream()` returns AsyncIterable
- [ ] Save file

#### Step 5: Test with small dataset ⏱️ 20 min
- [ ] Start dev server: `npm run dev`
- [ ] Create 10 test payments in DB
- [ ] Download CSV:
  ```bash
  curl http://localhost:3000/api/v1/admin/orders/export-csv \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --output test.csv
  ```
- [ ] Verify CSV format:
  ```bash
  head test.csv
  # Expected: id,email,name,amount,status,createdAt
  # With 10 rows of data
  ```
- [ ] Check file size:
  ```bash
  wc -l test.csv
  # Expected: 11 lines (1 header + 10 data)
  ```

#### Step 6: Test with large dataset ⏱️ 30 min
- [ ] Create 10,000 test payments in DB
  ```bash
  npm run seed:payments 10000
  # Or insert directly in DB
  ```
- [ ] Monitor memory before export:
  ```bash
  free -h
  # Note the available memory
  ```
- [ ] Start download in background:
  ```bash
  curl http://localhost:3000/api/v1/admin/orders/export-csv \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --output large.csv &
  ```
- [ ] Monitor memory during export:
  ```bash
  watch -n 1 free -h
  # Memory should stay relatively constant
  # NOT grow to 500MB+ like before
  ```
- [ ] Wait for completion and verify:
  ```bash
  wc -l large.csv
  # Expected: 10,001 lines (1 header + 10,000 data)
  
  ls -lh large.csv
  # Should be reasonable size, not huge
  ```

#### Step 7: Add optional filters ⏱️ 15 min
- [ ] Update exportCsv to accept query filters:
  ```typescript
  async exportCsv(req: Request, res: Response, next: NextFunction) {
    const { status, startDate, endDate } = req.query;

    // Build where clause
    const where = {};
    if (status) where.status = status as string;
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    // ... rest of export function with where clause
  }
  ```
- [ ] Test with filters:
  ```bash
  curl "http://localhost:3000/api/v1/admin/orders/export-csv?status=COMPLETED" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --output filtered.csv
  ```

#### Step 8: Add progress logging ⏱️ 10 min
- [ ] Update csv-stream.ts to log every 1000 records:
  ```typescript
  if (count % 1000 === 0) {
    logger.info(`CSV export progress: ${count} payments streamed`);
  }
  ```
- [ ] Monitor logs during export:
  ```bash
  tail -f logs/app.log | grep "CSV export"
  # Should show: 0, 1000, 2000, 3000, ... progress
  ```

#### Step 9: Run tests ⏱️ 20 min
- [ ] Run order tests:
  ```bash
  npm test -- orders.test.ts
  ```
- [ ] All tests should pass
- [ ] Update tests if they expect synchronous behavior

#### Step 10: Code review ⏱️ 15 min
- [ ] Request review
- [ ] Share files
- [ ] Get approval

#### Step 11: Commit ⏱️ 10 min
- [ ] Stage:
  ```bash
  git add backend/src/utils/csv-stream.ts
  git add backend/src/controllers/admin/orders.controller.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "feat: Implement streaming CSV export

  - Replace in-memory CSV generation with streaming
  - Process payments in 100-record batches
  - Constant memory usage regardless of dataset size
  - Progress logging every 1000 records
  - Support optional filters (status, date range)
  
  PERFORMANCE: No OOM crashes, supports 1M+ records
  Fixes CRITICAL: CSV export memory overflow"
  ```

### ✅ Acceptance Criteria
- [ ] CSV export uses streaming (not in-memory)
- [ ] Constant memory usage regardless of size
- [ ] Processes 10,000+ records without OOM
- [ ] File downloads correctly
- [ ] CSV format valid
- [ ] Filters work (status, dates)
- [ ] Progress logged every 1000 records
- [ ] All tests passing
- [ ] Code reviewed

### 🧪 Verification Commands
```bash
# Monitor memory before/during large export
free -h
# Before: ~2GB free
# During: Still ~2GB free (streaming = constant)
# After: Still ~2GB free

# Verify file integrity
curl http://localhost:3000/api/v1/admin/orders/export-csv \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o export.csv

# Check row count
wc -l export.csv
# Should match expected count

# Verify CSV format
head -5 export.csv
tail -5 export.csv

# Test with filters
curl "http://localhost:3000/api/v1/admin/orders/export-csv?status=COMPLETED" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o completed.csv
```

### ⏱️ Time Estimate
- Total: **4-5 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 6: Consolidate Duplicate Enrollment Counts in Analytics

**Severity**: 🔴 CRITICAL - Memory bloat  
**Type**: Performance / Caching  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
The analytics service fetches ALL enrollments then filters in-memory instead of using SQL aggregation. With 50,000 enrollments, this loads 50,000 objects into memory and filters them with JavaScript. Each analytics request becomes slow and memory-intensive.

### Problem Code
```typescript
// analytics.service.ts - Lines 107-143
const allEnrollments = await prisma.enrollment.findMany();
// Loads ALL 50,000 rows into memory!

const activeEnrollments = allEnrollments
  .filter(e => e.status === "ACTIVE").length;
// Filters in JavaScript instead of SQL!
```

### Impact
- ❌ 50,000 objects loaded into memory
- ❌ JavaScript filtering slower than SQL
- ❌ Analytics request takes 3-5 seconds
- ❌ Memory bloat on each request

### Files to Modify
- `backend/src/services/analytics.service.ts`
- `backend/src/repositories/enrollment.repository.ts` (optional)

### Implementation Checklist

#### Step 1: Understand current analytics ⏱️ 15 min
- [ ] Open `backend/src/services/analytics.service.ts`
- [ ] Find the `calculateKPIs()` method
- [ ] Note line ~107 where `findMany()` is called
- [ ] Understand what statuses exist: ACTIVE, REVOKED, NONE
- [ ] See how filtering is done (JavaScript .filter())

#### Step 2: Replace with SQL aggregation ⏱️ 25 min
- [ ] Update the analytics method to use `.count()`:
  ```typescript
  // BEFORE:
  const allEnrollments = await prisma.enrollment.findMany();
  const activeEnrollments = allEnrollments
    .filter(e => e.status === "ACTIVE").length;
  const revokedEnrollments = allEnrollments
    .filter(e => e.status === "REVOKED").length;

  // AFTER:
  const [activeEnrollments, revokedEnrollments, noneEnrollments] = 
    await Promise.all([
      prisma.enrollment.count({
        where: { status: "ACTIVE" }
      }),
      prisma.enrollment.count({
        where: { status: "REVOKED" }
      }),
      prisma.enrollment.count({
        where: { status: "NONE" }
      }),
    ]);
  ```
- [ ] Remove the `allEnrollments` variable entirely
- [ ] Update any other references to use the aggregated counts
- [ ] Save file

#### Step 3: Verify no other uses of allEnrollments ⏱️ 10 min
- [ ] Search for "allEnrollments" in file:
  ```bash
  grep -n "allEnrollments" backend/src/services/analytics.service.ts
  ```
- [ ] Should find only the removed lines
- [ ] If found elsewhere, update those references too
- [ ] Save file

#### Step 4: Add caching to aggregation ⏱️ 20 min
- [ ] Wrap the count queries in cache:
  ```typescript
  async getEnrollmentCounts(): Promise<Record<string, number>> {
    const cacheKey = "analytics:enrollment-counts";
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug("Enrollment counts from cache");
        return JSON.parse(cached);
      }
    } catch {
      logger.warn("Cache miss for enrollment counts");
    }

    // Query database
    const [active, revoked, none] = await Promise.all([
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { status: "REVOKED" } }),
      prisma.enrollment.count({ where: { status: "NONE" } }),
    ]);

    const result = { active, revoked, none };

    // Cache for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(result));
      logger.debug("Enrollment counts cached");
    } catch {
      logger.warn("Failed to cache enrollment counts");
    }

    return result;
  }

  // In calculateKPIs():
  const enrollmentCounts = await this.getEnrollmentCounts();
  const activeEnrollments = enrollmentCounts.active;
  const revokedEnrollments = enrollmentCounts.revoked;
  ```
- [ ] Save file

#### Step 5: Invalidate cache on enrollment changes ⏱️ 20 min
- [ ] Find where enrollment status changes (e.g., enroll, revoke)
- [ ] Add cache invalidation:
  ```typescript
  // After enrollment status change:
  await prisma.enrollment.update({ ... });
  
  // Invalidate analytics cache
  try {
    await redis.del("analytics:enrollment-counts");
    logger.info("Invalidated enrollment counts cache");
  } catch {
    logger.warn("Failed to invalidate cache");
  }
  ```
- [ ] Add to all places where enrollment status changes:
  - [ ] Enroll endpoint
  - [ ] Revoke endpoint
  - [ ] Any admin updates
- [ ] Save files

#### Step 6: Benchmark performance ⏱️ 30 min
- [ ] Start dev server: `npm run dev`
- [ ] Measure BEFORE optimization (if possible):
  ```bash
  time curl http://localhost:3000/api/v1/admin/analytics \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected BEFORE: 3-5 seconds, high memory
  ```
- [ ] Apply changes
- [ ] Measure AFTER optimization:
  ```bash
  time curl http://localhost:3000/api/v1/admin/analytics \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Expected AFTER: <100ms, constant memory
  ```
- [ ] Compare:
  - [ ] Response time: 3-5s → <100ms (30-50x faster! ✅)
  - [ ] Memory: Spikes to 500MB → stays constant ✅

#### Step 7: Test cache invalidation ⏱️ 20 min
- [ ] Create a new enrollment (should invalidate cache)
- [ ] Check cache is empty:
  ```bash
  redis-cli
  > get "analytics:enrollment-counts"
  # Should return nil (empty)
  ```
- [ ] Make analytics request (should rebuild cache)
- [ ] Verify cache was created:
  ```bash
  redis-cli
  > get "analytics:enrollment-counts"
  # Should return JSON with counts
  ```
- [ ] Make another request within 1 hour (should use cache):
  ```bash
  time curl http://localhost:3000/api/v1/admin/analytics \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  # Should be <10ms (served from cache)
  ```

#### Step 8: Test with large enrollment count ⏱️ 20 min
- [ ] Create 50,000 test enrollments
- [ ] Run analytics:
  ```bash
  time curl http://localhost:3000/api/v1/admin/analytics \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
- [ ] Should still be <100ms (vs 5+ seconds before)
- [ ] Monitor memory:
  ```bash
  ps aux | grep node | grep -v grep | awk '{print $6}'
  # Should be constant (not spiking to 500MB+)
  ```

#### Step 9: Run tests ⏱️ 20 min
- [ ] Run analytics tests:
  ```bash
  npm test -- analytics.test.ts
  ```
- [ ] All tests should pass
- [ ] If tests rely on findMany(), update them to use counts

#### Step 10: Code review ⏱️ 15 min
- [ ] Request review
- [ ] Share modified files
- [ ] Get approval

#### Step 11: Commit ⏱️ 10 min
- [ ] Stage:
  ```bash
  git add backend/src/services/analytics.service.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "fix: Use SQL aggregation instead of in-memory filtering for enrollment counts

  - Replace findMany() + JavaScript filter with SQL .count()
  - Cache enrollment counts for 1 hour
  - Invalidate cache on enrollment changes
  - Response time: 3-5s → <100ms
  - Memory: Constant (no 500MB+ spikes)
  
  PERFORMANCE: 30-50x faster analytics queries
  Fixes CRITICAL: Enrollment count memory bloat"
  ```

### ✅ Acceptance Criteria
- [ ] No `findMany()` without WHERE clause in analytics
- [ ] Uses `.count()` with WHERE for each status
- [ ] Enrollment counts cached for 1 hour
- [ ] Cache invalidated on enrollment changes
- [ ] Response time <100ms (was 3-5s)
- [ ] Memory usage constant
- [ ] Works with 50k+ enrollments
- [ ] All tests passing
- [ ] Code reviewed

### 🧪 Verification Commands
```bash
# Test with large dataset
npm run seed:enrollments 50000

# Benchmark before (if not already changed):
time curl http://localhost:3000/api/v1/admin/analytics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Monitor memory
watch -n 1 'ps aux | grep node | grep -v grep | awk "{print \$6} MB"'

# Verify cache working
redis-cli
> get "analytics:enrollment-counts"
# Should return JSON

# Test cache invalidation
# Create new enrollment
# Check cache is cleared
redis-cli
> get "analytics:enrollment-counts"
# Should return nil
```

### ⏱️ Time Estimate
- Total: **3-4 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 7: Fix Demo Mode Authentication Bypass

**Severity**: 🔴 CRITICAL - Authentication disabled  
**Type**: Security / Authentication  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
Demo mode uses a URL parameter (`?demo=1`) to bypass role checking entirely. Any user can add `?demo=1` to any URL to bypass authentication. This completely disables login in production.

### Problem Code
```typescript
// router.tsx - Lines 206-207
if (demo && role === "STUDENT") {
  return children; // BYPASSES ALL ROLE CHECKS!
}

// Anyone can do: https://eduflow.app/lessons?demo=1
```

### Impact
- ❌ Any user can bypass authentication
- ❌ Add `?demo=1` to any URL for access
- ❌ Login disabled in production
- ❌ All protected pages accessible

### Files to Modify
- `frontend/src/lib/router.tsx`
- `frontend/.env.development`
- `frontend/.env.production`

### Implementation Checklist

#### Step 1: Create .env files ⏱️ 10 min
- [ ] Create `frontend/.env.development`:
  ```
  VITE_DEMO_MODE=true
  VITE_DEMO_ROLE=STUDENT
  ```
- [ ] Create `frontend/.env.production`:
  ```
  VITE_DEMO_MODE=false
  ```
- [ ] Verify files created

#### Step 2: Update router.tsx to use env var ⏱️ 20 min
- [ ] Open `frontend/src/lib/router.tsx`
- [ ] Find demo mode check (around line 206)
- [ ] Replace URL param with environment variable:
  ```typescript
  // BEFORE:
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  const role = demo ? "STUDENT" : user?.role;

  // AFTER:
  const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";
  const demoRole = import.meta.env.VITE_DEMO_ROLE || "STUDENT";
  const role = demoModeEnabled ? demoRole : user?.role;
  ```
- [ ] Save file

#### Step 3: Remove URL param handling from RequireRole ⏱️ 15 min
- [ ] Find RequireRole component (same file or separate)
- [ ] Update to NOT check URL param:
  ```typescript
  export const RequireRole = ({ role, children }: Props) => {
    const { user } = useAuth();
    const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";
    const demoRole = import.meta.env.VITE_DEMO_ROLE;
    
    // Check role
    const hasAccess = demoModeEnabled && role === demoRole
      ? true
      : user?.role === role;
    
    if (!hasAccess) {
      return <Redirect to="/login" />;
    }
    
    return children;
  };
  ```
- [ ] Save file

#### Step 4: Verify demo mode cannot be bypassed ⏱️ 15 min
- [ ] Start dev server with production env:
  ```bash
  NODE_ENV=production npm run dev
  # Or build and serve production build
  npm run build
  npm run preview
  ```
- [ ] Try to bypass with URL param:
  ```
  https://localhost:5173/lessons?demo=1
  ```
- [ ] Should be redirected to /login (demo param ignored)

#### Step 5: Enable demo mode for development ⏱️ 10 min
- [ ] Start dev server (development mode):
  ```bash
  npm run dev
  ```
- [ ] Demo mode should be ENABLED
- [ ] Verify can access pages without login:
  ```
  http://localhost:5173/lessons
  # Should show lessons (demo mode active)
  ```
- [ ] Verify `?demo=1` param is ignored (doesn't matter):
  ```
  http://localhost:5173/lessons?demo=1
  # Should behave same as without param (env var controls it)
  ```

#### Step 6: Add comment explaining demo mode ⏱️ 10 min
- [ ] Add comment in router.tsx:
  ```typescript
  /**
   * DEMO MODE
   * 
   * Enabled only in development (VITE_DEMO_MODE=true in .env.development)
   * Disabled in production (VITE_DEMO_MODE=false in .env.production)
   * 
   * Cannot be enabled via URL parameter (for security).
   * URL parameter ?demo=1 is ignored in production.
   */
  const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";
  ```
- [ ] Save file

#### Step 7: Update build process to ensure env var set ⏱️ 15 min
- [ ] Open `frontend/vite.config.ts`
- [ ] Add build-time check:
  ```typescript
  // Ensure demo mode is disabled in production
  if (process.env.NODE_ENV === "production" && process.env.VITE_DEMO_MODE === "true") {
    throw new Error(
      "❌ SECURITY ERROR: Demo mode cannot be enabled in production!\n" +
      "Check frontend/.env.production and ensure VITE_DEMO_MODE=false"
    );
  }
  ```
- [ ] Save file

#### Step 8: Test build fails if demo mode enabled ⏱️ 20 min
- [ ] Temporarily edit `frontend/.env.production`:
  ```
  VITE_DEMO_MODE=true  # Wrong!
  ```
- [ ] Try to build:
  ```bash
  npm run build
  ```
- [ ] Should FAIL with security error:
  ```
  ❌ SECURITY ERROR: Demo mode cannot be enabled in production!
  ```
- [ ] Fix it back:
  ```
  VITE_DEMO_MODE=false
  ```
- [ ] Build should succeed:
  ```bash
  npm run build
  # Success!
  ```

#### Step 9: Run tests ⏱️ 20 min
- [ ] Run auth tests:
  ```bash
  npm test -- router.test.ts
  npm test -- auth.test.ts
  ```
- [ ] All tests should pass
- [ ] If tests use `?demo=1` param, update them

#### Step 10: Code review ⏱️ 15 min
- [ ] Request review
- [ ] Share:
  - [ ] `router.tsx`
  - [ ] `.env.development`
  - [ ] `.env.production`
  - [ ] `vite.config.ts`
- [ ] Get approval

#### Step 11: Commit ⏱️ 10 min
- [ ] Stage:
  ```bash
  git add frontend/src/lib/router.tsx
  git add frontend/.env.development
  git add frontend/.env.production
  git add frontend/vite.config.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "fix: Disable demo mode URL parameter bypass

  - Demo mode now controlled by environment variable, not URL param
  - VITE_DEMO_MODE=true only in development
  - VITE_DEMO_MODE=false in production (enforced at build time)
  - Build fails if demo mode enabled in production
  - URL parameter ?demo=1 ignored (no effect)
  
  SECURITY: Cannot bypass authentication
  Fixes CRITICAL: Demo mode authentication bypass"
  ```

### ✅ Acceptance Criteria
- [ ] URL parameter `?demo=1` no longer disables authentication
- [ ] Demo mode only works if VITE_DEMO_MODE=true in .env
- [ ] Production build enforces VITE_DEMO_MODE=false
- [ ] Build fails if demo mode enabled for production
- [ ] Development: demo mode works
- [ ] Production: authentication required
- [ ] All tests passing
- [ ] Code reviewed and approved

### 🧪 Verification Commands
```bash
# Test production (demo mode OFF)
npm run build
npm run preview
# Try: http://localhost:4173/lessons?demo=1
# Expected: Redirect to /login (demo param ignored)

# Test development (demo mode ON)
npm run dev
# Try: http://localhost:5173/lessons
# Expected: Shows lessons (demo mode enabled)
# Try: http://localhost:5173/lessons?demo=1
# Expected: Same behavior (param ignored, env var controls it)

# Test build fails with demo enabled
# Edit .env.production: VITE_DEMO_MODE=true
npm run build
# Expected: Build fails with security error

# Fix and rebuild
# Edit .env.production: VITE_DEMO_MODE=false
npm run build
# Expected: Build succeeds
```

### ⏱️ Time Estimate
- Total: **2-3 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

## PHASE 1 - TASK 8: Sanitize HTML in Admin Notifications (Fix XSS)

**Severity**: 🔴 CRITICAL - Stored XSS  
**Type**: Security / XSS Prevention  
**Assigned To**: ________________  
**Start Date**: ________________  
**Target Completion**: ________________  
**Actual Completion**: ________________  

### Overview
Admin notifications preview renders user-entered HTML via `dangerouslySetInnerHTML` without sanitization. An admin (or attacker) can enter malicious JavaScript (e.g., `<img src=x onerror="alert('XSS')">`) which executes in the preview and potentially in recipient emails.

### Problem Code
```typescript
// Notifications.tsx - Line 239
<div dangerouslySetInnerHTML={{ __html: previewText }} />

// If previewText = "<img src=x onerror='alert(\"XSS\")'>"
// The JavaScript runs in the admin's browser!
```

### Impact
- ❌ Admin can input malicious HTML
- ❌ XSS executes in admin's browser
- ❌ XSS could execute in recipient email clients (if not sanitized server-side)
- ❌ Credential theft, email hijacking possible

### Files to Modify
- `frontend/src/pages/admin/Notifications.tsx`
- `backend/src/utils/email.ts`

### Implementation Checklist

#### Step 1: Install DOMPurify ⏱️ 10 min
- [ ] Install on frontend:
  ```bash
  npm install dompurify
  npm install --save-dev @types/dompurify
  ```
- [ ] Install on backend:
  ```bash
  npm install isomorphic-dompurify
  ```
- [ ] Verify installations:
  ```bash
  npm list dompurify
  npm list isomorphic-dompurify
  ```

#### Step 2: Update Notifications.tsx (frontend) ⏱️ 25 min
- [ ] Open `frontend/src/pages/admin/Notifications.tsx`
- [ ] Import DOMPurify:
  ```typescript
  import DOMPurify from 'dompurify';
  ```
- [ ] Define safe tags:
  ```typescript
  const SAFE_HTML_CONFIG = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
    KEEP_CONTENT: true,
  };
  ```
- [ ] Sanitize preview HTML:
  ```typescript
  const previewText = useMemo(() => {
    const dirty = selected?.bodyHtml ?? "";
    const clean = DOMPurify.sanitize(dirty, SAFE_HTML_CONFIG);
    return clean;
  }, [selected]);
  ```
- [ ] In JSX, keep dangerouslySetInnerHTML (sanitized data is safe):
  ```typescript
  <div dangerouslySetInnerHTML={{ __html: previewText }} />
  ```
- [ ] Save file

#### Step 3: Update email.ts (backend) ⏱️ 25 min
- [ ] Open `backend/src/utils/email.ts`
- [ ] Import DOMPurify:
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';
  ```
- [ ] Define safe tags (same as frontend):
  ```typescript
  const SAFE_EMAIL_HTML_CONFIG = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
    KEEP_CONTENT: true,
  };
  ```
- [ ] Sanitize in email sending method:
  ```typescript
  async sendBrandedEmail(data: any) {
    // Sanitize HTML content before sending
    const cleanHtml = DOMPurify.sanitize(
      data.bodyHtml || "",
      SAFE_EMAIL_HTML_CONFIG
    );

    const emailHtml = this.template('branded', {
      ...data,
      bodyHtml: cleanHtml // Use sanitized version
    });

    await this.send({ ...data, html: emailHtml });
  }
  ```
- [ ] Save file

#### Step 4: Test XSS payload rejection ⏱️ 30 min
- [ ] Start dev server: `npm run dev`
- [ ] Test payload 1: Script tag
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/notifications \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "subject": "Test",
      "bodyHtml": "<script>alert(\"XSS\")</script>"
    }'
  ```
- [ ] Verify in database (script tag removed):
  ```bash
  # Check stored notification
  curl http://localhost:3000/api/v1/admin/notifications/latest \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep "script"
  # Expected: No output (script removed)
  ```
- [ ] Test payload 2: img onerror
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/notifications \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "subject": "Test",
      "bodyHtml": "<img src=x onerror=\"alert(\"XSS\")\">"
    }'
  ```
- [ ] Verify img tag removed or onerror removed
- [ ] Test payload 3: Safe HTML (should be preserved)
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/notifications \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "subject": "Test",
      "bodyHtml": "<p>Hello <strong>world</strong></p>"
    }'
  ```
- [ ] Verify formatting preserved:
  ```bash
  curl http://localhost:3000/api/v1/admin/notifications/latest \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep "strong"
  # Expected: <p>Hello <strong>world</strong></p> preserved
  ```

#### Step 5: Test frontend sanitization ⏱️ 20 min
- [ ] In admin notifications UI, try to enter XSS payload:
  ```
  <img src=x onerror="alert('XSS')">
  ```
- [ ] Should NOT execute JavaScript
- [ ] In browser console:
  ```javascript
  // Should see NO alert
  ```
- [ ] In email preview:
  ```html
  <!-- Should show: <img src=x> (onerror removed) -->
  ```

#### Step 6: Verify email safety ⏱️ 20 min
- [ ] Create notification with safe HTML:
  ```
  <h2>Course Update</h2>
  <p>New lesson available: <a href="...">Click here</a></p>
  ```
- [ ] Send to test email
- [ ] Check email client (Gmail, Outlook, etc.)
- [ ] Should render with formatting
- [ ] Should NOT have any malicious script
- [ ] Links should be intact

#### Step 7: Add console warning for debugging ⏱️ 10 min
- [ ] In Notifications.tsx, add debug logging:
  ```typescript
  const previewText = useMemo(() => {
    const dirty = selected?.bodyHtml ?? "";
    const clean = DOMPurify.sanitize(dirty, SAFE_HTML_CONFIG);
    
    if (dirty !== clean) {
      console.warn("HTML sanitized:", {
        before: dirty.substring(0, 100),
        after: clean.substring(0, 100)
      });
    }
    
    return clean;
  }, [selected]);
  ```
- [ ] Save file

#### Step 8: Run tests ⏱️ 20 min
- [ ] Run notification tests:
  ```bash
  npm test -- notifications.test.ts
  npm test -- email.test.ts
  ```
- [ ] All tests should pass
- [ ] Update tests if they send unfiltered HTML

#### Step 9: Add security header comment ⏱️ 10 min
- [ ] Add comment at top of both files:
  ```typescript
  /**
   * XSS PREVENTION
   * 
   * All HTML content is sanitized with DOMPurify before:
   * 1. Rendering in admin preview (frontend)
   * 2. Sending in emails (backend)
   * 
   * Only safe tags allowed: p, strong, em, a, ul, ol, li, h1-h6
   * All script tags, event handlers, and dangerous attributes removed.
   */
  ```
- [ ] Save files

#### Step 10: Code review ⏱️ 15 min
- [ ] Request code review
- [ ] Share:
  - [ ] `Notifications.tsx`
  - [ ] `email.ts`
- [ ] Get approval

#### Step 11: Commit ⏱️ 10 min
- [ ] Stage:
  ```bash
  git add frontend/src/pages/admin/Notifications.tsx
  git add backend/src/utils/email.ts
  ```
- [ ] Commit:
  ```bash
  git commit -m "fix: Sanitize HTML in admin notifications with DOMPurify

  - Frontend: Sanitize preview with DOMPurify
  - Backend: Sanitize email content before sending
  - Allowed tags: p, strong, em, a, ul, ol, li, h1-h6
  - Blocked: script, img, iframe, and event handlers
  - Safe formatting preserved (bold, italic, links)
  
  SECURITY: XSS prevention on both sides
  Fixes CRITICAL: Notification HTML injection vulnerability"
  ```

### ✅ Acceptance Criteria
- [ ] XSS payloads rejected or sanitized
- [ ] Script tags removed
- [ ] Event handlers (onerror, onclick, etc.) removed
- [ ] Safe formatting preserved (bold, italic, links)
- [ ] Frontend preview sanitized
- [ ] Email content sanitized before sending
- [ ] No JavaScript executes in preview or emails
- [ ] All tests passing
- [ ] Code reviewed and approved

### 🧪 Verification Commands
```bash
# Test XSS prevention - script tag
curl -X POST http://localhost:3000/api/v1/admin/notifications \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "bodyHtml": "<script>alert(\"XSS\")</script><p>Safe content</p>"
  }'

# Check stored value (script removed)
curl http://localhost:3000/api/v1/admin/notifications/latest \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.bodyHtml'
# Expected: "<p>Safe content</p>" (script removed)

# Test XSS prevention - img onerror
curl -X POST http://localhost:3000/api/v1/admin/notifications \
  -d '{
    "subject": "Test",
    "bodyHtml": "<img src=x onerror=\"alert(1)\">"
  }'

# Check stored value (onerror removed)
# Expected: "<img src=x>" (onerror removed) or entire img removed

# Test safe HTML preserved
curl -X POST http://localhost:3000/api/v1/admin/notifications \
  -d '{
    "subject": "Test",
    "bodyHtml": "<p>Hello <strong>World</strong></p>"
  }'

# Check formatting preserved
curl http://localhost:3000/api/v1/admin/notifications/latest | jq '.bodyHtml'
# Expected: "<p>Hello <strong>World</strong></p>"
```

### ⏱️ Time Estimate
- Total: **3-4 hours**
- Actual Time Spent: _____ hours
- Completed: [ ] YES [ ] NO

### 📝 Notes
```
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________
```

---

---

# PHASE 2: HIGH PRIORITY SECURITY & PERFORMANCE FIXES

**Duration**: 2-3 weeks | **Priority**: STRONGLY RECOMMENDED  
**Status**: ⏳ PENDING (Start after Phase 1)

### Brief Task Summaries (See PHASE_2_DETAILED_TASKS.md for full details)

## PHASE 2 - TASK 1-8 (Summary)

| # | Task | Files | Est. Time | Status |
|---|------|-------|-----------|--------|
| 1 | Add RBAC to Resource endpoints | resources.controller.ts, lesson.service.ts | 3-4h | ⏳ |
| 2 | Restrict Order Detail Data | orders.controller.ts | 2-3h | ⏳ |
| 3 | Request-level Memoization | lesson.service.ts | 3-4h | ⏳ |
| 4 | Paginate Progress Query | students.controller.ts | 3-4h | ⏳ |
| 5 | React Query Cache Config | 20+ pages | 4-5h | ⏳ |
| 6 | Consolidate Course Endpoints | Checkout, Course, Preview | 3-4h | ⏳ |
| 7 | Fix Lesson Double-Fetch | Lessons.tsx | 3-4h | ⏳ |
| 8 | Parallelize Enrollment Check | Dashboard.tsx | 3-4h | ⏳ |

**Phase 2 Total**: 25-32 hours

---

# PHASE 3: MEDIUM PRIORITY FIXES & OPTIMIZATIONS

**Duration**: 3-4 weeks | **Priority**: Complete before 1.0 release  
**Status**: ⏳ PENDING

### Brief Task Summaries (See PHASE_3_AND_4_TASKS.md for full details)

| # | Task | Est. Time |
|---|------|-----------|
| 1 | Create Constants/Enums | 4-5h |
| 2 | Add Admin Pagination UI | 4-5h |
| 3 | Add Input Validation | 3-4h |
| 4 | Fix Cache Versioning | 3-4h |
| 5 | Implement Audit Logging | 4-5h |
| 6 | Simplify Path Validation | 3-4h |
| 7 | Add Rate Limiting | 2-3h |
| 8 | Malware Scanning | 4-5h |

**Phase 3 Total**: 28-35 hours

---

# PHASE 4: LOW PRIORITY OPTIMIZATION & REFACTORING

**Duration**: 2-3 weeks (ongoing) | **Priority**: Post-launch improvements  
**Status**: ⏳ PENDING

### Brief Task Summaries

| # | Task | Est. Time |
|---|------|-----------|
| 1 | Component Refactoring | 5-6h |
| 2 | Structured Logging | 2-3h |
| 3 | Error Handling | 3-4h |
| 4 | Bundle Optimization | 3-4h |
| 5 | Schema Validation | 4-5h |
| 6 | Health Endpoints | 2-3h |
| 7 | E2E Testing | 5-6h |

**Phase 4 Total**: 25-31 hours

---

---

# SUMMARY

## All Phases at a Glance

```
┌─────────────────────────────────────────────┐
│ PHASE 1: CRITICAL (8 tasks)                │
│ Duration: 2-3 weeks                         │
│ Total Effort: 31-35 hours                  │
│ Status: 🔴 NOT STARTED                     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ PHASE 2: HIGH PRIORITY (8 tasks)           │
│ Duration: 2-3 weeks (parallel Phase 1)      │
│ Total Effort: 25-32 hours                  │
│ Status: 🔴 NOT STARTED                     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ PHASE 3: MEDIUM (8 tasks)                  │
│ Duration: 3-4 weeks                         │
│ Total Effort: 28-35 hours                  │
│ Status: 🔴 NOT STARTED                     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ PHASE 4: LOW (7 tasks)                     │
│ Duration: 2-3 weeks (ongoing)              │
│ Total Effort: 25-31 hours                  │
│ Status: 🔴 NOT STARTED                     │
└─────────────────────────────────────────────┘

TOTAL: 31 tasks, 109-133 hours, 8-10 weeks
```

---

# HOW TO USE THIS DOCUMENT

1. **For Task Assignment**: Select a task, copy its checklist, assign to developer
2. **For Progress Tracking**: Check off items as completed, track actual time
3. **For Review**: Share task section with code reviewer
4. **For Printing**: Each task section is self-contained and printable
5. **For Reference**: Link to specific task sections in meetings/discussions

---

**Generated**: 2026-04-24  
**Status**: ✅ Ready for Implementation  
**Next Action**: Start Phase 1 - Task 1 (Ticket RBAC)

