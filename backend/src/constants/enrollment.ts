// Enrollment statuses - use these instead of hardcoded strings
export const ENROLLMENT_STATUS = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
  NONE: "NONE"
} as const;

export type EnrollmentStatus = typeof ENROLLMENT_STATUS[keyof typeof ENROLLMENT_STATUS];

export const ENROLLMENT_STATUS_VALUES = Object.values(ENROLLMENT_STATUS);

// Enrollment types
export const ENROLLMENT_TYPE = {
  PAID: "PAID",
  ADMIN_ENROLLED: "ADMIN_ENROLLED"
} as const;

export type EnrollmentType = typeof ENROLLMENT_TYPE[keyof typeof ENROLLMENT_TYPE];

export const ENROLLMENT_TYPE_VALUES = Object.values(ENROLLMENT_TYPE);
