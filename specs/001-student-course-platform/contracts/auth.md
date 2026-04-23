# API Contract: Authentication

**Base path**: `/api/v1/auth`
**Auth required**: None (public endpoints)
**Rate limiting**: 10 req/min per IP on all endpoints in this group

---

## POST /api/v1/auth/register

Register a new student account with email and password.

**Request**
```json
{
  "email": "student@example.com",
  "password": "Securepass123",
  "fullName": "Ahmed Al-Rashid"
}
```

**Validation**:
- `email`: valid email format, max 255 chars
- `password`: min 8 chars, at least one uppercase, one number
- `fullName`: 1–100 chars, trimmed

**Response 201**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "fullName": "Ahmed Al-Rashid"
  }
}
```

**Response 409** — email already registered
```json
{ "error": "EMAIL_EXISTS", "message": "This email is already registered." }
```

**Response 422** — validation failure
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**Side effects**: Sends verification email with 1-hour token link.

---

## POST /api/v1/auth/login

Authenticate with email and password.

**Request**
```json
{
  "email": "student@example.com",
  "password": "Securepass123"
}
```

**Response 200** — sets `refresh_token` httpOnly cookie (7 days)
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "fullName": "Ahmed Al-Rashid",
    "role": "STUDENT",
    "locale": "en",
    "theme": "light",
    "avatarUrl": null
  }
}
```

**Response 401**
```json
{ "error": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." }
```

**Response 403** — email not verified
```json
{ "error": "EMAIL_NOT_VERIFIED", "message": "Please verify your email before logging in." }
```

---

## POST /api/v1/auth/oauth/google

Exchange Google authorization code for EduFlow session.

**Request**
```json
{ "code": "<google_oauth_code>", "redirectUri": "https://app.eduflow.com/auth/callback" }
```

**Response 200** — sets `refresh_token` cookie
```json
{
  "accessToken": "<jwt>",
  "isNewUser": true,
  "user": { ... }
}
```

---

## POST /api/v1/auth/refresh

Issue new access token using refresh token cookie. Rotates refresh token.

**Request**: No body. Reads `refresh_token` from httpOnly cookie.

**Response 200** — sets new `refresh_token` cookie
```json
{ "accessToken": "<new_jwt>" }
```

**Response 401** — missing, expired, or revoked token
```json
{ "error": "INVALID_REFRESH_TOKEN" }
```

**Response 403** — reuse detected (token already rotated); entire family revoked
```json
{ "error": "TOKEN_REUSE_DETECTED", "message": "Security alert: please log in again." }
```

---

## POST /api/v1/auth/logout

Revoke refresh token and invalidate session. Invalidates all video tokens for this session.

**Request**: Reads `refresh_token` cookie. Auth header with access token.

**Response 200**
```json
{ "message": "Logged out successfully." }
```

**Side effects**: Clears `refresh_token` cookie. Revokes all `video_tokens` for this `session_id`.

---

## POST /api/v1/auth/forgot-password

Request a password reset link.

**Request**
```json
{ "email": "student@example.com" }
```

**Response 200** — always 200 to prevent email enumeration
```json
{ "message": "If that email is registered, a reset link has been sent." }
```

**Side effects**: Sends reset email with 1-hour token if email exists.

---

## POST /api/v1/auth/reset-password

Set new password using reset token.

**Request**
```json
{
  "token": "<reset_token>",
  "password": "NewSecurepass456"
}
```

**Response 200**
```json
{ "message": "Password updated successfully. Please log in." }
```

**Response 400** — token expired or invalid
```json
{ "error": "INVALID_OR_EXPIRED_TOKEN" }
```

---

## GET /api/v1/auth/verify-email

Verify email address using token from email link.

**Query params**: `?token=<verify_token>`

**Response 200**
```json
{ "message": "Email verified. You can now log in." }
```

**Response 400**
```json
{ "error": "INVALID_OR_EXPIRED_TOKEN" }
```
