import { SkeletonRoot, SkeletonLine } from "../Skeleton";

export function YearReadSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        <SkeletonLine size="sm" className="w-28 mb-8" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-hover rounded" />
          ))}
        </div>
      </SkeletonRoot>
    </div>
  );
}
