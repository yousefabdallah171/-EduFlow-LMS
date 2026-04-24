# Backend Error Handling Guide

## Overview

All errors in the backend should follow a standardized format using the `sendError` utility from `src/utils/api-response.ts`.

## Error Response Format

### Standard Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "Field-specific error message"
  }
}
```

### Error Codes and HTTP Status

| Error Code | HTTP Status | Use Case |
|-----------|------------|----------|
| VALIDATION_ERROR | 422 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Resource already exists |
| BAD_REQUEST | 400 | Invalid request |
| UNPROCESSABLE_ENTITY | 422 | Cannot process request |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily down |

## Usage Examples

### Validation Error

```typescript
import { sendError } from "../utils/api-response.js";

// Bad request with validation details
sendError(res, "VALIDATION_ERROR", "Validation failed", {
  email: "Invalid email format",
  age: "Must be between 18 and 120"
});
```

### Authentication Error

```typescript
// User not authenticated
sendError(res, "UNAUTHORIZED", "Access token is missing or invalid");
```

### Authorization Error

```typescript
// User doesn't have permission
sendError(res, "FORBIDDEN", "Only admins can access this resource");
```

### Not Found Error

```typescript
// Resource doesn't exist
sendError(res, "NOT_FOUND", `Student with ID ${studentId} not found`);
```

### Conflict Error

```typescript
// Resource already exists
sendError(res, "CONFLICT", "User with this email already exists");
```

## Controller Error Handling Pattern

### Pattern 1: Try-Catch with Error Handler

```typescript
export const exampleController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createSchema.parse(req.body);
      
      const result = await someService.create(data);
      
      sendSuccess(res, result, 201);
    } catch (error) {
      // Let central error handler process
      next(error);
    }
  }
};
```

### Pattern 2: Explicit Error Handling

```typescript
export const exampleController = {
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      if (!id) {
        return sendError(res, "BAD_REQUEST", "ID is required");
      }

      const resource = await db.resource.findUnique({ where: { id } });
      if (!resource) {
        return sendError(res, "NOT_FOUND", `Resource ${id} not found`);
      }

      const updated = await db.resource.update({
        where: { id },
        data: req.body
      });

      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }
};
```

## Central Error Handler

The central error handler in `src/app.ts` processes all unhandled errors:

```typescript
app.use((err: Error, req: express.Request, res: express.Response) => {
  sentry.captureException(err, req);
  
  const message =
    env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message;
  
  sendError(res, "INTERNAL_ERROR", message);
});
```

## Logging and Monitoring

### Sentry Integration

Errors are automatically sent to Sentry via the central error handler:

```typescript
// Automatically captured by central handler
throw new Error("Something went wrong");
```

### Manual Sentry Capture

For non-fatal errors you want to track:

```typescript
import { sentry } from "../observability/sentry.js";

try {
  // Some operation
} catch (error) {
  sentry.captureException(error, req);
  // Continue processing
}
```

## Validation Error Handling

### Zod Validation

```typescript
const schema = z.object({
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be 18 or older")
});

const validateRequest = (req: Request, res: Response) => {
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path] = issue.message;
    });
    
    return sendError(res, "VALIDATION_ERROR", "Validation failed", errors);
  }
  
  return result.data;
};
```

## Common Error Scenarios

### 1. Duplicate Resource

```typescript
try {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return sendError(res, "CONFLICT", "User with this email already exists");
  }
  
  const user = await db.user.create({ data: { email, ... } });
  sendSuccess(res, user, 201);
} catch (error) {
  next(error);
}
```

### 2. Unauthorized Access

```typescript
// In middleware or controller
if (!req.user) {
  return sendError(res, "UNAUTHORIZED", "Authentication required");
}

if (req.user.role !== "ADMIN") {
  return sendError(res, "FORBIDDEN", "Admin access required");
}
```

### 3. Resource Not Found

```typescript
const resource = await db.resource.findUnique({ where: { id } });

if (!resource) {
  return sendError(res, "NOT_FOUND", `Resource with ID ${id} not found`);
}
```

### 4. Invalid Input

```typescript
const page = parseInt(req.query.page as string);

if (isNaN(page) || page < 1) {
  return sendError(res, "BAD_REQUEST", "Page must be a positive integer");
}
```

## Best Practices

### 1. Always Provide Context

❌ Bad:
```typescript
sendError(res, "NOT_FOUND", "Not found");
```

✅ Good:
```typescript
sendError(res, "NOT_FOUND", `Lesson with ID ${lessonId} not found`);
```

### 2. Include Field-Specific Details for Validation

```typescript
sendError(res, "VALIDATION_ERROR", "Validation failed", {
  email: "Already exists",
  age: "Must be 18 or older"
});
```

### 3. Use Appropriate Error Codes

```typescript
// ✅ User input issue
sendError(res, "VALIDATION_ERROR", ...);

// ✅ User lacks permission
sendError(res, "FORBIDDEN", ...);

// ✅ Resource doesn't exist
sendError(res, "NOT_FOUND", ...);

// ✅ Server error (use central handler)
throw new Error("Database connection failed");
```

### 4. Don't Expose Sensitive Information

❌ Bad:
```typescript
sendError(res, "INTERNAL_ERROR", `Database error: ${err.message}`);
```

✅ Good:
```typescript
// In production
const message = env.NODE_ENV === "production"
  ? "An error occurred"
  : err.message;
sendError(res, "INTERNAL_ERROR", message);
```

### 5. Let Central Handler Process Unhandled Errors

```typescript
try {
  // Some risky operation
} catch (error) {
  // Don't swallow errors
  next(error); // ✅ Pass to central handler
}
```

## Testing Error Scenarios

```typescript
describe("Error Handling", () => {
  it("should return validation error for invalid input", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({ email: "invalid-email" });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(response.body.details.email).toBeTruthy();
  });

  it("should return not found for missing resource", async () => {
    const response = await request(app)
      .get("/api/v1/users/nonexistent-id");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("NOT_FOUND");
  });
});
```

## Migration Guide

If you find old error handling patterns, migrate them:

### Old Pattern
```typescript
res.status(400).json({ message: "Bad request" });
```

### New Pattern
```typescript
sendError(res, "BAD_REQUEST", "Bad request");
```

---

For questions or clarifications, see `src/utils/api-response.ts`.
