import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonProgressBar = () => (
  <div className="space-y-2" aria-hidden="true">
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="h-4 w-10 rounded-lg" />
    </div>
    <Skeleton className="h-3 w-full rounded-full" />
  </div>
);

