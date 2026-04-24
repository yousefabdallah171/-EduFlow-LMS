# EduFlow LMS API Documentation

## Overview

The EduFlow LMS API is a RESTful API built with Express.js and TypeScript. It provides endpoints for user authentication, course management, enrollment, payments, and student progress tracking.

**Base URL:** `https://api.eduflow.com/api/v1`  
**Current Version:** 1.0.0

---

## Authentication

### Bearer Token Authentication

All protected endpoints require an Authorization header with a JWT access token:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh endpoint to obtain a new access token.

### Refresh Token

Refresh tokens are stored in httpOnly cookies and automatically sent with requests. The refresh window is 30 days.

---

## API Endpoints

### Authentication Endpoints

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}

Response (201):
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "STUDENT"
  },
  "accessToken": "jwt-token"
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response (200):
{
  "user": { ... },
  "accessToken": "jwt-token"
}
```

#### Logout
```
POST /auth/logout
Authorization: Bearer <access_token>

Response (204): No content
```

#### Refresh Token
```
POST /auth/refresh
Authorization: Bearer <access_token>

Response (200):
{
  "accessToken": "new-jwt-token"
}
```

---

### User Profile Endpoints

#### Get Profile
```
GET /user/profile
Authorization: Bearer <access_token>

Response (200):
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "STUDENT",
    "avatarUrl": "https://..."
  }
}
```

#### Update Profile
```
PATCH /user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Jane Doe",
  "avatarUrl": "https://..."
}

Response (200): Updated user object
```

#### Change Password
```
POST /user/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123"
}

Response (200): { message: "Password changed successfully" }
```

---

### Course & Lesson Endpoints

#### Get Course Information
```
GET /course

Response (200):
{
  "id": "course-id",
  "titleEn": "EduFlow: From Idea to Production",
  "titleAr": "إيدوفلو: من الفكرة إلى الإنتاج",
  "descriptionEn": "...",
  "descriptionAr": "...",
  "pricePiasters": 10000,
  "enrollmentCount": 1234
}
```

#### List Lessons
```
GET /lessons?page=1&limit=20

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "lesson-id",
      "titleEn": "Lesson Title",
      "titleAr": "عنوان الدرس",
      "durationSeconds": 1800,
      "sortOrder": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### Get Lesson Detail
```
GET /lessons/{lessonId}/detail
Authorization: Bearer <access_token>

Response (200):
{
  "lesson": {
    "id": "lesson-id",
    "titleEn": "...",
    "titleAr": "...",
    "descriptionEn": "...",
    "descriptionAr": "...",
    "videoHlsPath": "/videos/lesson-id/playlist.m3u8",
    "durationSeconds": 1800,
    "isPublished": true,
    "resources": [
      {
        "id": "resource-id",
        "title": "Slide PDF",
        "fileUrl": "https://...",
        "fileSizeBytes": 2097152
      }
    ]
  }
}
```

---

### Enrollment Endpoints

#### Get Enrollment Status
```
GET /enrollment/status
Authorization: Bearer <access_token>

Response (200):
{
  "enrolled": true,
  "status": "ACTIVE",
  "enrollmentType": "PAID",
  "enrolledAt": "2024-01-15T10:30:00Z"
}
```

---

### Student Dashboard

#### Get Dashboard
```
GET /dashboard
Authorization: Bearer <access_token>

Response (200):
{
  "enrolled": true,
  "completionPercent": 45,
  "lastLessonId": "lesson-id",
  "totalWatchTimeSeconds": 3600,
  "lessonsWatched": 5,
  "progress": [
    {
      "lessonId": "lesson-id",
      "watchTime": 1800,
      "completed": true
    }
  ]
}
```

---

### Video Endpoints

#### Get Video Token
```
GET /video/{lessonId}/token
Authorization: Bearer <access_token>

Response (200):
{
  "token": "video-token",
  "playlistUrl": "https://api.eduflow.com/api/v1/video/{lessonId}/playlist.m3u8"
}
```

#### Stream Segment
```
GET /video/{lessonId}/segment?file=segment-000.ts&token={token}

Response (206): Video segment data
```

---

### Search Endpoints

#### Search Lessons (Admin)
```
GET /admin/students/search?q=john&page=1
Authorization: Bearer <admin-token>

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "john@example.com",
      "fullName": "John Doe",
      "enrollmentStatus": "ACTIVE"
    }
  ],
  "pagination": { ... }
}

Rate Limit: 50 requests per 15 minutes per user
```

---

## Error Handling

### Error Response Format

All errors follow a standard format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "Description of the specific error"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 422 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

Rate limits are applied per user ID (authenticated) or IP address (unauthenticated):

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 10 | 1 minute |
| /auth/register | 5 | 1 hour |
| /user/change-password | 3 | 1 hour |
| /admin/students/search | 50 | 15 minutes |
| /video/**/segment | 300 (300 from preview) | 1 minute |
| /uploads | 5 | 1 hour |

---

## Security Headers

The API returns the following security headers:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

## CORS

The API accepts requests from configured origins only. CORS is configured to allow:

- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization
- Exposed Headers: X-Total-Count, RateLimit-Limit, RateLimit-Remaining
- Max Age: 24 hours

---

## Versioning

The API uses URL versioning (v1). Future versions will be available at `/api/v2`, `/api/v3`, etc.

All responses include the API version:
```
API-Version: 1.0.0
```

---

## Support

For issues or questions, contact: support@eduflow.com
