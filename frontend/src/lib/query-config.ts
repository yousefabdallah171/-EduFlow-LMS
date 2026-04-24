// React Query cache configuration constants
// Defines how long query results should be cached before refetching

export const CACHE_TIME = {
  // 1 minute - for frequently changing data (user profile, lesson progress)
  SHORT: 1 * 60 * 1000,

  // 5 minutes - for moderately changing data (lessons, courses, resources)
  MEDIUM: 5 * 60 * 1000,

  // 30 minutes - for rarely changing data (admin lists, order history, analytics)
  LONG: 30 * 60 * 1000,

  // Never automatically invalidate - only on explicit invalidation
  NEVER: Infinity,
};

// Garbage collection time: keep data in memory 2x longer than staleTime
// This allows quick navigation back to recently viewed pages without refetch
export const getGCTime = (staleTime: number): number => {
  return staleTime === Infinity ? Infinity : staleTime * 2;
};

// Default React Query config with best practices for this app
export const defaultQueryConfig = {
  refetchOnWindowFocus: false, // Don't refetch on tab focus (config per-hook if needed)
  refetchOnReconnect: true, // Refetch when internet reconnects (data may have changed)
  refetchOnMount: false, // Don't refetch on component mount if data is fresh
  retry: 1, // Retry once on failure (then exponential backoff)
};
