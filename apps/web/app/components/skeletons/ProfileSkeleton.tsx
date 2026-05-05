import { SkeletonRoot, SkeletonLine } from "../Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        <SkeletonLine size="lg" className="w-40 mb-3" />
        <SkeletonLine size="xs" className="w-24" />
      </SkeletonRoot>
    </div>
  );
}
