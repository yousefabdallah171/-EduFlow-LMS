import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonLessonDetail = () => (
  <div className="space-y-5" aria-hidden="true">
    <div className="dashboard-panel rounded-[28px] p-5">
      <Skeleton className="h-5 w-48 rounded-xl" />
      <Skeleton className="mt-4 h-64 w-full rounded-[22px]" />
      <div className="mt-4 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)]">
      <div className="dashboard-panel rounded-[28px] p-5">
        <Skeleton className="h-4 w-36 rounded-lg" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-[22px]" />
          <Skeleton className="h-24 rounded-[22px]" />
          <Skeleton className="h-24 rounded-[22px]" />
          <Skeleton className="h-24 rounded-[22px]" />
        </div>
      </div>

      <div className="dashboard-panel rounded-[28px] p-5">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 rounded-[22px]" />
          <Skeleton className="h-16 rounded-[22px]" />
          <Skeleton className="h-16 rounded-[22px]" />
        </div>
      </div>
    </div>
  </div>
);

