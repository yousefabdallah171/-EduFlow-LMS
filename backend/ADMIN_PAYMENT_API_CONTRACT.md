# Admin Payment Management API Contract

**Version:** 1.0.0  
**Last Updated:** April 24, 2026  
**Base URL:** `http://localhost:3000/api/v1`  
**Authentication:** Bearer token (Admin role required)

---

## Overview

This API contract documents all 8 admin payment management endpoints. All endpoints require:
- **Authentication:** Bearer token in Authorization header
- **Authorization:** ADMIN role
- **Content-Type:** application/json (for POST requests)

---

## Endpoint Index

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/admin/payments` | List payments with filters | ✅ |
| GET | `/admin/payments/:paymentId` | Get payment details | ✅ |
| GET | `/admin/payments/search` | Search payments | ✅ |
| GET | `/admin/payments/status/:status` | Filter by status | ✅ |
| GET | `/admin/payments/stats` | Payment statistics | ✅ |
| POST | `/admin/payments/manual` | Create manual payment | ✅ |
| POST | `/admin/payments/:paymentId/override` | Override status | ✅ |
| POST | `/admin/payments/:paymentId/revoke` | Revoke payment | ✅ |

---

## Endpoint Details

### 1. List Payments

**Endpoint:** `GET /admin/payments`

**Authentication:** Required (ADMIN role)

**Query Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|-----------|-------------|
| `status` | string | No | - | Enum: PENDING, COMPLETED, FAILED, WEBHOOK_PENDING, REFUND_REQUESTED, REFUNDED | Filter by payment status |
| `userId` | string | No | - | Non-empty string | Filter by specific user ID |
| `startDate` | string (ISO 8601) | No | - | Valid datetime format | Filter payments created after this date |
| `endDate` | string (ISO 8601) | No | - | Valid datetime format | Filter payments created before this date |
| `minAmount` | number | No | - | Integer >= 0 | Minimum payment amount in piasters |
| `maxAmount` | number | No | - | Integer >= 0 | Maximum payment amount in piasters |
| `limit` | number | No | 50 | Integer between 1-100 | Results per page |
| `offset` | number | No | 0 | Integer >= 0 | Pagination offset |

**Request Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments?status=COMPLETED&limit=20&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay_1",
        "userId": "user_1",
        "amount": 10000,
        "status": "COMPLETED",
        "refundStatus": null,
        "createdAt": "2026-04-24T10:30:00Z",
        "user": {
          "email": "user@example.com",
          "name": "John Doe"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "status": "Invalid enum value",
    "limit": "Expected number, received string"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Admin not authenticated"
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": "SERVER_ERROR",
  "message": "Database connection failed"
}
```

---

### 2. Get Payment Detail

**Endpoint:** `GET /admin/payments/:paymentId`

**Authentication:** Required (ADMIN role)

**Path Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `paymentId` | string | Yes | Non-empty string | Payment ID to retrieve |

**Request Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/pay_123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pay_123",
    "userId": "user_456",
    "amount": 10000,
    "status": "COMPLETED",
    "refundStatus": null,
    "refundAmount": null,
    "createdAt": "2026-04-24T10:30:00Z",
    "updatedAt": "2026-04-24T10:35:00Z",
    "paymobOrderId": "order_789",
    "paymobTransactionId": "tx_999",
    "paymobRefundId": null,
    "user": {
      "id": "user_456",
      "email": "student@example.com",
      "name": "Jane Doe"
    },
    "events": [
      {
        "id": "event_1",
        "eventType": "PAYMENT_COMPLETED",
        "status": "COMPLETED",
        "metadata": {
          "gateway": "paymob",
          "transactionId": "tx_999"
        },
        "createdAt": "2026-04-24T10:30:00Z"
      }
    ],
    "enrollment": {
      "id": "enroll_123",
      "status": "ACTIVE",
      "enrolledAt": "2026-04-24T10:30:05Z",
      "revokedAt": null
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "Payment pay_999 not found"
}
```

---

### 3. Search Payments

**Endpoint:** `GET /admin/payments/search`

**Authentication:** Required (ADMIN role)

**Query Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `query` | string | Yes | 1-100 characters | Search term (ID, email, or name) |
| `limit` | number | No | 1-50, default 20 | Max results to return |

**Request Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=student@example.com&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pay_1",
      "userId": "user_1",
      "amount": 10000,
      "status": "COMPLETED",
      "refundStatus": null,
      "createdAt": "2026-04-24T10:30:00Z",
      "user": {
        "email": "student@example.com",
        "name": "Jane Doe"
      }
    }
  ],
  "count": 1
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "query": "String must contain at least 1 character(s)"
  }
}
```

---

### 4. Get Payments by Status

**Endpoint:** `GET /admin/payments/status/:status`

**Authentication:** Required (ADMIN role)

**Path Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `status` | string | Yes | Enum: PENDING, COMPLETED, FAILED, WEBHOOK_PENDING, REFUND_REQUESTED, REFUNDED | Payment status filter |

**Query Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|-----------|-------------|
| `limit` | number | No | 50 | Integer >= 1 | Max results |

**Request Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/status/COMPLETED?limit=30" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pay_1",
      "userId": "user_1",
      "amount": 10000,
      "status": "COMPLETED",
      "refundStatus": null,
      "createdAt": "2026-04-24T10:30:00Z",
      "user": {
        "email": "user1@example.com",
        "name": "User 1"
      }
    }
  ],
  "count": 42
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "status": "Invalid enum value 'INVALID_STATUS'"
  }
}
```

---

### 5. Get Payment Statistics

**Endpoint:** `GET /admin/payments/stats`

**Authentication:** Required (ADMIN role)

**Query Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `startDate` | string (ISO 8601) | No | Valid datetime | Stats start date |
| `endDate` | string (ISO 8601) | No | Valid datetime | Stats end date |

**Request Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/stats?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "COMPLETED": {
      "count": 120,
      "totalAmount": 1200000
    },
    "PENDING": {
      "count": 5,
      "totalAmount": 50000
    },
    "FAILED": {
      "count": 8,
      "totalAmount": 80000
    },
    "REFUND_REQUESTED": {
      "count": 2,
      "totalAmount": 20000
    },
    "REFUNDED": {
      "count": 1,
      "totalAmount": 10000
    }
  }
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "startDate": "Invalid ISO 8601 date"
  }
}
```

---

### 6. Create Manual Payment

**Endpoint:** `POST /admin/payments/manual`

**Authentication:** Required (ADMIN role)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|-----------|-------------|
| `userId` | string | Yes | Non-empty | Student user ID |
| `packageId` | string | Yes | Non-empty | Course package ID |
| `amount` | number | Yes | Integer >= 100 | Payment amount in piasters |
| `reason` | string | Yes | 5-500 chars | Reason for manual payment |
| `adminNotes` | string | No | Max 1000 chars | Optional admin notes |

**Request Example:**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "packageId": "pkg_1",
    "amount": 10000,
    "reason": "Payment system failure - customer verified",
    "adminNotes": "Customer called support and confirmed transaction"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "pay_new_123",
    "userId": "user_123",
    "packageId": "pkg_1",
    "amount": 10000,
    "status": "COMPLETED",
    "refundStatus": null,
    "createdAt": "2026-04-24T11:00:00Z",
    "updatedAt": "2026-04-24T11:00:00Z",
    "paymentMethod": "MANUAL",
    "enrollment": {
      "id": "enroll_new",
      "status": "ACTIVE",
      "enrolledAt": "2026-04-24T11:00:05Z"
    }
  }
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "amount": "Number must be greater than or equal to 100",
    "reason": "String must contain at least 5 character(s)"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "User user_999 not found"
}
```

---

### 7. Override Payment Status

**Endpoint:** `POST /admin/payments/:paymentId/override`

**Authentication:** Required (ADMIN role)

**Path Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `paymentId` | string | Yes | Non-empty | Payment ID to override |

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|-----------|-------------|
| `newStatus` | string | Yes | Enum (see table below) | New payment status |
| `reason` | string | Yes | 5-500 chars | Reason for override |
| `adminNotes` | string | No | Max 1000 chars | Optional admin notes |

**Valid Status Values:**
- `PENDING` - Payment pending
- `COMPLETED` - Payment completed (will trigger enrollment)
- `FAILED` - Payment failed
- `WEBHOOK_PENDING` - Waiting for webhook
- `REFUND_REQUESTED` - Refund requested
- `REFUNDED` - Refund completed

**Request Example:**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_123/override" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "COMPLETED",
    "reason": "Paymob confirmed transaction processed successfully",
    "adminNotes": "Payment confirmed via Paymob merchant dashboard"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pay_123",
    "userId": "user_456",
    "status": "COMPLETED",
    "refundStatus": null,
    "createdAt": "2026-04-24T10:30:00Z",
    "updatedAt": "2026-04-24T11:15:00Z",
    "enrollment": {
      "id": "enroll_456",
      "status": "ACTIVE"
    }
  }
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "newStatus": "Invalid enum value 'INVALID_STATUS'",
    "reason": "String must contain at least 5 character(s)"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "Payment pay_999 not found"
}
```

---

### 8. Revoke Payment

**Endpoint:** `POST /admin/payments/:paymentId/revoke`

**Authentication:** Required (ADMIN role)

**Path Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `paymentId` | string | Yes | Non-empty | Payment ID to revoke |

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|-----------|-------------|
| `reason` | string | Yes | 5-500 chars | Reason for revocation |

**Request Example:**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_123/revoke" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Duplicate charge - customer had two payments processed"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pay_123",
    "userId": "user_456",
    "status": "FAILED",
    "refundStatus": null,
    "createdAt": "2026-04-24T10:30:00Z",
    "updatedAt": "2026-04-24T11:20:00Z",
    "enrollment": {
      "id": "enroll_456",
      "status": "REVOKED"
    }
  }
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "reason": "String must contain at least 5 character(s)"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "Payment pay_999 not found"
}
```

---

## Error Response Reference

All errors follow this format:

**422 Unprocessable Entity (Validation):**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "fieldName": "Validation error message"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Admin not authenticated"
}
```

**404 Not Found:**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "SERVER_ERROR",
  "message": "Internal server error"
}
```

---

## Status Codes Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET or POST response |
| 201 | Created | Resource created successfully (POST) |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server-side error |

---

## Authentication

All endpoints require a bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

The token must belong to a user with ADMIN role. Extract the token from login response:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Response:
# {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Use token in subsequent requests
curl -X GET http://localhost:3000/api/v1/admin/payments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Rate Limiting

Currently no rate limiting on admin endpoints. Future versions may implement:
- Request per minute limits
- Burst limits
- Admin-specific thresholds

---

## Pagination

Paginated endpoints support:
- `limit`: 1-100 (default 50)
- `offset`: >= 0 (default 0)
- Response includes `hasMore` boolean

```json
{
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Date/Time Format

All dates use ISO 8601 format with UTC timezone:
- Format: `YYYY-MM-DDTHH:MM:SSZ`
- Example: `2026-04-24T10:30:00Z`

---

## Data Types Reference

| Type | Format | Example |
|------|--------|---------|
| string | Text | `"user_123"` |
| number | Integer or float | `10000` |
| boolean | true/false | `true` |
| datetime | ISO 8601 | `"2026-04-24T10:30:00Z"` |
| enum | Predefined values | `"COMPLETED"` |
| object | JSON object | `{"key": "value"}` |
| array | JSON array | `[{}, {}]` |

---

## Changelog

**v1.0.0 (April 24, 2026)**
- Initial release
- 8 endpoints for admin payment management
- Full CRUD operations
- Comprehensive error handling
