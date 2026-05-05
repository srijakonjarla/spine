import { SkeletonRoot, SkeletonLine, SkeletonBlock } from "../Skeleton";

export function YearListsSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="mx-auto px-6 py-12">
        <SkeletonLine size="md" className="w-16 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-40" />
          ))}
        </div>
      </SkeletonRoot>
    </div>
  );
}
