export const LandingLoadingSkeleton = () => (
  <div className="space-y-8">
    <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
      <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-64 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
      <div className="h-64 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
      <div className="h-64 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse" />
    </div>
  </div>
);
