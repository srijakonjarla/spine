import { SkeletonRoot, SkeletonLine, SkeletonGrid } from "../Skeleton";

export function YearBooksSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        <SkeletonLine size="md" className="w-20 mb-8" />
        <SkeletonGrid count={12} />
      </SkeletonRoot>
    </div>
  );
}
