import { SkeletonRoot, SkeletonLine } from "../Skeleton";

export function YearGoalSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        <SkeletonLine size="sm" className="w-16 mb-8" />
        <SkeletonLine size="md" className="w-48 mb-3" />
      </SkeletonRoot>
    </div>
  );
}
