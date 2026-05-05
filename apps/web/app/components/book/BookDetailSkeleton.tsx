import { SkeletonRoot, SkeletonLine } from "../Skeleton";

export function BookDetailSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="max-w-3xl mx-auto px-6 py-10">
        {/* Back link */}
        <SkeletonLine size="sm" className="w-16 mb-8" />
        {/* Title + author */}
        <SkeletonLine size="md" className="w-2/3 mb-3" />
        <SkeletonLine size="sm" className="w-1/3 mb-6" />
        {/* Mood chips */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-20 bg-hover rounded-full" />
          ))}
        </div>
        {/* Body block */}
        <div className="h-16 w-full bg-hover rounded" />
      </SkeletonRoot>
    </div>
  );
}
