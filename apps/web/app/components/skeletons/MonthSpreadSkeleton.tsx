import { SkeletonRoot } from "../Skeleton";

export function MonthSpreadSkeleton() {
  return (
    <SkeletonRoot className="page">
      <div className="mx-auto px-6 py-12">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-32 bg-hover rounded" />
          <div className="flex gap-2">
            <div className="h-7 w-7 bg-hover rounded-full" />
            <div className="h-7 w-7 bg-hover rounded-full" />
          </div>
        </div>
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 bg-hover rounded" />
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-hover rounded" />
          ))}
        </div>
      </div>
    </SkeletonRoot>
  );
}
