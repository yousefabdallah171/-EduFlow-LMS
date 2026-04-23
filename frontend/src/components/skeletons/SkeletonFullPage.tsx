import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonFullPage = ({ label = "Loading..." }: { label?: string }) => (
  <div className="min-h-dvh px-6 py-10" style={{ backgroundColor: "var(--color-page)" }} aria-label={label}>
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="dashboard-panel rounded-[28px] p-6 sm:p-7">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="mt-4 h-9 w-72 rounded-2xl" />
        <Skeleton className="mt-4 h-4 w-10/12 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-9/12 rounded-lg" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-40 rounded-[28px]" />
      </div>
      <Skeleton className="h-60 rounded-[28px]" />
    </div>
  </div>
);

