// User roles - use these instead of hardcoded strings
export const ROLES = {
  ADMIN: "ADMIN",
  STUDENT: "STUDENT"
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Role arrays for validation
export const ROLE_VALUES = Object.values(ROLES);
