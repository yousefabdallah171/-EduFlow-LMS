import { useQuery, type QueryKey, type QueryFunction, type UseQueryOptions } from "@tanstack/react-query";
import { CACHE_TIME, getGCTime, defaultQueryConfig } from "@/lib/query-config";

// PERFORMANCE: Factory hook for creating cached query hooks with consistent configuration
// Reduces boilerplate and ensures all queries follow same caching patterns
export const useQueryWithCache = <TData,>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  staleTime = CACHE_TIME.MEDIUM,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn" | "staleTime" | "gcTime">
) => {
  return useQuery<TData>({
    queryKey,
    queryFn,
    staleTime,
    gcTime: getGCTime(staleTime),
    ...defaultQueryConfig,
    ...options,
  });
};
