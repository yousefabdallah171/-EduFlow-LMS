import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCourseHeader = () => (
  <div className="dashboard-panel rounded-[28px] p-7" aria-hidden="true">
    <Skeleton className="h-4 w-24 rounded-lg" />
    <Skeleton className="mt-4 h-9 w-64 rounded-2xl" />
    <Skeleton className="mt-4 h-4 w-10/12 rounded-lg" />
    <Skeleton className="mt-2 h-4 w-9/12 rounded-lg" />
    <div className="mt-6 flex flex-wrap gap-3">
      <Skeleton className="h-11 w-44 rounded-xl" />
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  </div>
);

