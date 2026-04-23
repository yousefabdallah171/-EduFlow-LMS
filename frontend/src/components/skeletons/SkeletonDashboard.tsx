import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonProgressBar } from "@/components/skeletons/SkeletonProgressBar";

export const SkeletonDashboard = () => (
  <div aria-hidden="true" className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
      <div className="dashboard-panel dashboard-panel--strong rounded-[28px] p-6 sm:p-7">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <Skeleton className="mt-4 h-9 w-48 rounded-2xl" />
        <Skeleton className="mt-3 h-4 w-10/12 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-9/12 rounded-lg" />
        <div className="mt-6">
          <SkeletonProgressBar />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-[22px]" />
          <Skeleton className="h-28 rounded-[22px]" />
        </div>
      </div>

      <div className="dashboard-panel rounded-[28px] p-6 sm:p-7">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="mt-4 h-8 w-40 rounded-2xl" />
        <Skeleton className="mt-3 h-4 w-10/12 rounded-lg" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>

    <div className="dashboard-panel rounded-[28px] p-5">
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-72 rounded-lg" />
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </div>
  </div>
);

