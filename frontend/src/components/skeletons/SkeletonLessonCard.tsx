import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonLessonCard = () => (
  <div
    className="rounded-[26px] border p-5 shadow-card"
    style={{
      background:
        "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 86%, transparent))",
      borderColor: "var(--color-border)"
    }}
    aria-hidden="true"
  >
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>

      <div className="content-stack gap-3">
        <Skeleton className="h-5 w-4/5 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-4 w-11/12 rounded-xl" />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
        <Skeleton className="h-4 w-16 rounded-lg" />
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

