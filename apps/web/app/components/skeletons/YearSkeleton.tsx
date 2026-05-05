import { SkeletonRoot } from "../Skeleton";

export function YearSkeleton() {
  return (
    <SkeletonRoot className="page">
      {/* Hero band */}
      <div className="-mt-6 -mx-6 mb-10 px-8 py-10 lg:px-12 lg:py-14 bg-plum">
        <div className="h-4 w-28 bg-white/20 rounded mb-3" />
        <div className="h-16 w-24 bg-white/20 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/20 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Cover grid */}
      <div className="page-content">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-hover rounded" />
          ))}
        </div>
      </div>
    </SkeletonRoot>
  );
}
