import {
  SkeletonRoot,
  SkeletonLine,
  SkeletonBlock,
  SkeletonCover,
} from "../Skeleton";

export function HomeSkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        {/* Greeting */}
        <SkeletonLine size="md" className="w-36 mb-1.5" />
        <SkeletonLine size="sm" className="w-48 mb-8" />

        {/* Three index cards (streak / goal / quick stat) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-16" />
          ))}
        </div>

        {/* Mini cover row */}
        <div className="flex gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCover key={i} className="w-14" />
          ))}
        </div>

        {/* Recent entries */}
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      </SkeletonRoot>
    </div>
  );
}
