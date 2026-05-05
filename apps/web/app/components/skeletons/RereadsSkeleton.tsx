import { SkeletonRoot, SkeletonLine, SkeletonGrid } from "../Skeleton";

export function RereadsSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        <SkeletonLine size="sm" className="w-16 mb-8" />
        <SkeletonLine size="md" className="w-24 mb-2" />
        <SkeletonLine size="sm" className="w-56 mb-8" />
        <SkeletonGrid count={6} />
      </SkeletonRoot>
    </div>
  );
}
