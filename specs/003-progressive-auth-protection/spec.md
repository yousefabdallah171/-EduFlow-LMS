# Feature Specification: Progressive Auth Protection System

**Feature Branch**: `003-progressive-auth-protection`
**Created**: 2026-04-28
**Status**: Approved — Ready for Implementation
**Owner**: Yousef Abdallah

---

## Problem

The current login and register endpoints have only basic IP-level rate limiting (10 req/min). This is insufficient against:
- Brute-force credential stuffing attacks
- Automated bot registration flooding (15+ accounts from one device)
- Distributed attacks rotating IPs
- Script kiddies hammering the server with no consequence

There is no CAPTCHA, no device fingerprinting, no progressive lockout, no admin visibility into attack events, and no way to manually ban or unban attackers.

---

## Solution Overview

A 7-layer progressive protection system that is **friendly to real users in the first 5 attempts** and becomes **progressively stricter** as suspicious behavior continues, ending in admin-controlled permanent bans. The system tracks three independent identifiers — IP address, email address, and browser fingerprint — and applies protection at each layer independently.

---

## Protection Layers

| Layer | Mechanism | Trigger |
|---|---|---|
| 1 | Attempt counter (Redis) | Every auth request |
| 2 | CAPTCHA (hCaptcha) | After attempt #5 (any identifier) |
| 3 | Progressive lockout (Redis) | Attempts 11, 16, 21 |
| 4 | Permanent ban (DB + Redis) | Attempt #26+ |
| 5 | Registration flood guard | >5 accounts/day per IP or fingerprint |
| 6 | Admin IP whitelist | Admin login auto-whitelists IP |
| 7 | Notification system | Suspicious activity alert to user + admin |

---

## Progressive Lockout Thresholds

### Login & Password Reset (per identifier: IP, email, fingerprint — independent)

| Attempt Range | Action |
|---|---|
| 1 – 5 | No restriction. Normal flow. |
| 6 – 10 | CAPTCHA required on every attempt. 2-second server delay added. |
| 11 – 15 | 5-minute lockout. Return 429 with `Retry-After` header. |
| 16 – 20 | 30-minute lockout. Warning email sent to account owner. |
| 21 – 25 | 1-hour lockout. Alert email sent to admin (Yousef). |
| 26 + | Permanent ban. Admin must manually unlock. |

Lockout is **cumulative across windows** — attempt counts survive Redis TTL by persisting in `AuthAttemptLog` DB table. On lockout expiry, counter resets to the lockout level's bottom threshold (not zero) — so a user who served a 5-minute lockout resumes at level 11, not 1.

### Registration Flood (per IP per day, per fingerprint per day — independent)

| Account Count | Action |
|---|---|
| 1 – 5 | Normal registration. |
| 6 – 10 | Rate limit: 1 new account per 10 minutes. |
| 11 – 14 | 30-minute registration lockout. |
| 15 + | 1-hour lockout + admin notification. |

---

## Email-Level Brute Force (Special Rules)

Email-based lockouts apply **only when multiple different IPs attempt the same email**. This prevents false positives for students on mobile networks (changing IP each session).

- Single IP hammering one email → IP gets locked out, email gets warning notification only.
- Multiple IPs (≥ 3 distinct IPs) hammering same email → email-level lockout applies in addition to IP lockout.

---

## User Stories

### Story 1 — Legitimate Student: Forgotten Password (Priority P1)

A student misremembers their password, tries 4 times, then remembers on attempt 5. They should never see a CAPTCHA or lockout.

**Acceptance Scenarios:**
1. **Given** student enters wrong password, **When** they attempt 1–5 times, **Then** they receive only "Invalid credentials" error with no CAPTCHA or lockout.
2. **Given** student gets correct on attempt 5, **When** login succeeds, **Then** the fail counter is cleared and no ban is triggered.
3. **Given** student enters wrong password 5 times and then succeeds on attempt 6, **When** they reach attempt 6, **Then** CAPTCHA widget appears but after passing it login succeeds normally.

---

### Story 2 — Brute Force Attack: Attacker Hammering Credentials (Priority P1)

An attacker runs a credential stuffing script against the login endpoint.

**Acceptance Scenarios:**
1. **Given** attacker submits 10 failed login attempts via script, **When** they reach attempt 6, **Then** all subsequent requests require a valid hCaptcha token and return 422 if missing.
2. **Given** attacker submits 15 failed attempts, **When** attempt 11 is reached, **Then** all requests from that IP return 429 with `Retry-After: 300` (5 minutes).
3. **Given** attacker waits out the 5-minute lockout and tries again (attempts 16–20), **When** attempt 16 is reached, **Then** lockout escalates to 30 minutes.
4. **Given** attacker reaches attempt 26, **When** they attempt again after the 1-hour lockout, **Then** they receive a permanent ban and admin receives a notification email.
5. **Given** attacker rotates to a new IP but uses the same browser, **When** they submit, **Then** fingerprint-based counter detects the same device and inherits the existing attempt level.

---

### Story 3 — Bot: Mass Account Registration (Priority P2)

A bot attempts to create 20 accounts from one device to abuse the platform.

**Acceptance Scenarios:**
1. **Given** bot creates 5 accounts from one IP in one day, **When** it attempts a 6th, **Then** it can register but must wait 10 minutes between accounts.
2. **Given** bot creates 11 accounts from same fingerprint, **When** it attempts an 11th, **Then** it receives a 30-minute lockout on registration endpoint.
3. **Given** bot creates 15 accounts, **When** it attempts the 15th, **Then** it receives a 1-hour registration lockout and admin receives a notification.
4. **Given** same bot uses a different IP but same browser fingerprint, **When** it tries to register, **Then** the fingerprint-level counter triggers the appropriate lockout.

---

### Story 4 — Admin: Full Security Control (Priority P2)

Yousef needs to see all suspicious activity and manage bans from the admin dashboard.

**Acceptance Scenarios:**
1. **Given** admin navigates to `/admin/security/logs`, **When** the page loads, **Then** they see a table of all login/register attempts with columns: timestamp, type, IP, email, fingerprint hash, result, attempt number, action taken.
2. **Given** admin navigates to `/admin/security`, **When** the page loads, **Then** they see all active bans with type (IP/email/fingerprint), identifier, reason, expires at, and action buttons (Unban, Extend, View Logs).
3. **Given** admin clicks "Unban" on a permanently banned IP, **When** they confirm in a Dialog, **Then** the ban is lifted, the attempt counter is reset, and the action is logged in AuditLog.
4. **Given** admin wants to manually ban a known attacker IP before they hit the threshold, **When** they fill the "Add Manual Ban" form with IP + duration + reason, **Then** the ban is created immediately and active.
5. **Given** admin logs in from their IP, **When** login succeeds, **Then** their IP is automatically added to the whitelist and never blocked.
6. **Given** admin views security stats cards, **When** the page loads, **Then** they see: total bans today, active bans count, attempts blocked today, top offending IPs.

---

### Story 5 — Student: Receives Security Notification (Priority P2)

A student receives an email saying someone is trying to access their account.

**Acceptance Scenarios:**
1. **Given** multiple IPs attempt a student's email 16+ times, **When** the 16-attempt threshold is hit, **Then** the student receives an email: "Suspicious login attempts on your account" with "This was me" and "This wasn't me" buttons.
2. **Given** student clicks "This wasn't me", **When** they land on the acknowledge page, **Then** they can optionally change their password and the event is logged.
3. **Given** student clicks "This was me", **When** they land on the acknowledge page, **Then** the email-level counter for their address is cleared and the event is logged.

---

## Requirements

### Functional

| ID | Requirement |
|---|---|
| FR-001 | System MUST track failed auth attempts per IP, per email, and per browser fingerprint independently in Redis |
| FR-002 | System MUST require hCaptcha verification from attempt #6 onward on any identifier |
| FR-003 | System MUST apply a 2-second server-side delay on attempts 6–10 |
| FR-004 | System MUST apply a 5-minute lockout starting at attempt #11 |
| FR-005 | System MUST apply a 30-minute lockout starting at attempt #16 |
| FR-006 | System MUST apply a 1-hour lockout starting at attempt #21 |
| FR-007 | System MUST apply a permanent ban at attempt #26 and notify admin |
| FR-008 | System MUST apply email-level lockout ONLY when 3+ distinct IPs are involved |
| FR-009 | System MUST track browser fingerprint via client-side FingerprintJS (free) sent in `X-Device-Fingerprint` header |
| FR-010 | System MUST store fingerprints as SHA-256 hashes in `BrowserFingerprint` table |
| FR-011 | System MUST log every auth attempt (success + failure) to `AuthAttemptLog` table |
| FR-012 | System MUST auto-whitelist admin IP on every successful admin login |
| FR-013 | System MUST skip ALL protection checks for whitelisted IPs |
| FR-014 | System MUST allow admin to view all auth attempt logs at `/admin/security/logs` |
| FR-015 | System MUST allow admin to view and manage all bans at `/admin/security` |
| FR-016 | System MUST allow admin to manually add a ban (IP / email / fingerprint) with custom duration |
| FR-017 | System MUST allow admin to lift any ban with a reason (logged to AuditLog) |
| FR-018 | System MUST allow admin to extend an existing ban duration |
| FR-019 | System MUST notify student via email when email-level lockout is triggered (attempt ≥16) |
| FR-020 | System MUST notify admin (Yousef) via email when permanent ban is created |
| FR-021 | Student email MUST contain "This was me" / "This wasn't me" buttons with signed tokens |
| FR-022 | "This wasn't me" click MUST log the event and prompt password change |
| FR-023 | "This was me" click MUST reset the email-level counter for that address |
| FR-024 | System MUST apply registration flood protection: max 5 new accounts per IP per day before rate limiting |
| FR-025 | System MUST apply registration flood protection per fingerprint using same thresholds as IP |
| FR-026 | System MUST return 429 with `Retry-After` header in seconds during any lockout |
| FR-027 | System MUST return 403 with `BAN_ACTIVE` error code during any active ban |
| FR-028 | System MUST record all admin ban/unban actions in `AuditLog` table |
| FR-029 | System MUST use hCaptcha for CAPTCHA verification (site key in frontend env, secret in backend env) |
| FR-030 | System MUST expire attempt counters after 24 hours of inactivity (Redis TTL) |

### Non-Functional

| ID | Requirement |
|---|---|
| NFR-001 | Protection middleware MUST add < 10ms latency for whitelisted IPs (Redis whitelist check only) |
| NFR-002 | Protection middleware MUST add < 50ms latency for normal (non-locked) requests (3 Redis reads) |
| NFR-003 | Auth attempt logging MUST be non-blocking (fire-and-forget, no await on log write) |
| NFR-004 | All Redis errors MUST be caught silently — protection fails open (user passes) rather than hard crashing |
| NFR-005 | Browser fingerprint MUST be collected client-side before form submission (< 200ms) |
| NFR-006 | Fingerprint hash MUST be a SHA-256 of the FingerprintJS visitorId + user agent to reduce collisions |
| NFR-007 | Admin security logs page MUST support pagination (50 rows/page) and date range filtering |
| NFR-008 | All ban/unban operations MUST be idempotent (double-unban returns success, not error) |
| NFR-009 | CAPTCHA token MUST be verified server-side — never trust client-side result |
| NFR-010 | Permanent ban records MUST persist in DB even after manual unban (soft delete, `isActive=false`) |

---

## Key Entities

- **AuthAttemptLog**: Every auth attempt — type, result, IP, email, fingerprint, attempt number, actions applied.
- **BrowserFingerprint**: Hashed device fingerprint — first seen, last seen, linked user, attempt history.
- **SecurityBan**: Active ban record — type (IP/email/fingerprint/combined), identifier, expiry, lifted by.
- **SecurityWhitelist**: Trusted IPs — auto-added for admin, manual add supported.

---

## Success Criteria

| ID | Criterion |
|---|---|
| SC-001 | A real student making 4 failed login attempts never sees a CAPTCHA or lockout |
| SC-002 | A script making 30 rapid login requests gets permanently banned within the response cycle |
| SC-003 | An attacker rotating IPs is still detected via browser fingerprint and inherits lockout level |
| SC-004 | Admin can unban a user from the dashboard and the user can log in immediately after |
| SC-005 | Admin auto-whitelisted IP never gets locked out regardless of test attempts |
| SC-006 | Security logs page shows all 30 attack attempts with correct attempt numbers and outcomes |
| SC-007 | Student receives suspicious activity email when their account is hammered from 3+ IPs |
| SC-008 | A bot creating 14 accounts in one day from one IP hits a lockout before the 15th |
| SC-009 | All ban/unban admin actions appear in the existing AuditLog |
| SC-010 | CAPTCHA verification failure returns 422 CAPTCHA_INVALID — not a generic 429 |

---

## Edge Cases

| Condition | Behavior |
|---|---|
| Student on CGNAT/shared IP (university, mobile carrier) | IP counter increments but lockout only triggers at higher threshold; fingerprint provides secondary check |
| Admin accidentally blocks own IP | Whitelist takes priority over all ban checks; admin IP always whitelisted on login |
| Redis is down | All protection middleware fails open — user passes through, error is logged to structured log |
| Browser with JavaScript disabled | No fingerprint header sent; protection falls back to IP + email only |
| Attacker uses headless browser | FingerprintJS detects headless signals and produces a consistent fingerprint that still gets tracked |
| Student uses VPN and fingerprint changes | Email-level tracking catches repeat attempts if same email is targeted |
| Admin unbans user who is still actively attacking | New attempts re-trigger protection from attempt #1; counter is reset on unban |
| Attacker uses distributed IPs AND different browsers | Email-level protection triggers after 3 distinct IPs; only defense is email lockout + manual admin ban |
| Ban expires while user has active session | Session is not invalidated; only future login attempts are checked |
| CAPTCHA widget fails to load (JS error) | hCaptcha error handled gracefully; login form shows fallback message "Verification unavailable, try again" |

---

## Out of Scope

- Cloudflare WAF integration (future task — system designed to be compatible)
- SMS-based 2FA (separate feature)
- GeoIP-based blocking
- Tor/VPN IP detection
- ML-based anomaly detection
- Per-user "trusted device" list
