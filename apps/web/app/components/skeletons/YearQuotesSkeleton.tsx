import { SkeletonRoot, SkeletonLine } from "../Skeleton";

export function YearQuotesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRoot className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-l-2 border-line pl-4">
          <SkeletonLine size="xs" className="w-3/4 mb-2" />
          <SkeletonLine size="xs" className="w-1/2 mb-3" />
          <SkeletonLine size="xs" className="w-24" />
        </div>
      ))}
    </SkeletonRoot>
  );
}
