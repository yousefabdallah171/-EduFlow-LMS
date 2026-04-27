// OAuth providers and authentication types - use these instead of hardcoded strings
export const OAUTH_PROVIDER = {
  GOOGLE: "GOOGLE",
  EMAIL: "EMAIL"
} as const;

export type OAuthProvider = typeof OAUTH_PROVIDER[keyof typeof OAUTH_PROVIDER];

export const OAUTH_PROVIDER_VALUES = Object.values(OAUTH_PROVIDER);
