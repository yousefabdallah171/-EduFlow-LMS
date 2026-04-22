# Google OAuth (Production-Ready Flow)

**Status:** Implemented in this repo  
**Project:** EduFlow LMS  
**Updated:** April 21, 2026  

This codebase uses the **backend redirect-based** Google OAuth flow (Passport). The frontend does **not** exchange Google codes directly.

---

## What’s implemented (code map)

- OAuth start (redirect to Google): `GET /api/v1/auth/oauth/google` (`backend/src/routes/auth.routes.ts`)
- OAuth callback (Google redirects here): `GET /api/v1/auth/oauth/google/callback` (`backend/src/routes/auth.routes.ts`)
- After callback success:
  - Backend issues EduFlow session + sets refresh cookie (`refresh_token`)
  - Backend redirects to `FRONTEND_URL + /auth/callback` (`backend/src/controllers/auth.controller.ts`)
- Frontend `/auth/callback`:
  - Calls `POST /api/v1/auth/refresh`
  - Redirects user to the right dashboard (`frontend/src/lib/router.tsx`)
- Login/Register Google buttons link to the backend start endpoint:
  - `frontend/src/pages/Login.tsx`
  - `frontend/src/pages/Register.tsx`

---

## Production env vars (backend)

Set these on the **backend server** (do not commit them to git):

```env
GOOGLE_CLIENT_ID=<google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>
FRONTEND_URL=https://<your-domain>
NODE_ENV=production
```

Notes:
- `FRONTEND_URL` must match the live frontend origin exactly (scheme + host).
- Cookies are issued securely when the request is HTTPS (proxy-safe).

---

## Google Cloud Console settings (must match exactly)

Create/Use an OAuth 2.0 Client ID of type **Web application**.

**Authorized redirect URIs**

- `https://<your-domain>/api/v1/auth/oauth/google/callback`

**Authorized JavaScript origins** (recommended)

- `https://<your-domain>`

---

## Deployment requirement (important)

Recommended setup: serve frontend + backend on the **same domain**, with `/api` proxied to the backend.

Example:
- Frontend: `https://<your-domain>/`
- Backend: `https://<your-domain>/api/v1/...`

---

## Quick test

1. Open `https://<your-domain>/login`
2. Click “Continue with Google”
3. After Google consent, you should land on `/auth/callback`, then auto-redirect to `/dashboard` or `/admin/dashboard`.

---

## Common issues

- **`redirect_uri_mismatch`**: your Google Console redirect URI does not exactly equal `https://<your-domain>/api/v1/auth/oauth/google/callback`
- **Stuck on “Sign-in failed.”**: backend didn’t set refresh cookie; check `FRONTEND_URL`, HTTPS, and reverse proxy settings.
- **CORS issues**: backend CORS is locked to `FRONTEND_URL` (`backend/src/app.ts`), so it must match your real frontend origin.

