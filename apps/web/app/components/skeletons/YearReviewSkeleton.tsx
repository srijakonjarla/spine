import { SkeletonRoot } from "../Skeleton";

export function YearReviewSkeleton() {
  return (
    <SkeletonRoot className="page">
      {/* Hero band */}
      <div className="px-6 pt-16 pb-12 mb-10 bg-plum">
        <div className="max-w-3xl mx-auto">
          <div className="h-3 w-16 bg-white/20 rounded mb-6" />
          <div className="h-10 w-40 bg-white/20 rounded mb-3" />
          <div className="h-3 w-36 bg-white/20 rounded" />
        </div>
      </div>
      {/* Stat cards */}
      <div className="page-content">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-hover rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonRoot>
  );
}
