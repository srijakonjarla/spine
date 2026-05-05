import { SkeletonRoot, SkeletonBlock } from "../Skeleton";

export function ListDetailSkeleton() {
  return (
    <SkeletonRoot className="page">
      {/* Header band */}
      <div className="h-48 bg-hover mb-8" />
      <div className="page-content space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    </SkeletonRoot>
  );
}
