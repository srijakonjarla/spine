import { SkeletonRoot, SkeletonLine, SkeletonGrid } from "../Skeleton";

export function LibrarySkeleton() {
  return (
    <div className="page">
      <SkeletonRoot className="page-content">
        {/* Page title */}
        <div className="flex items-baseline justify-between mb-6">
          <SkeletonLine size="lg" className="w-32" />
          <SkeletonLine size="xs" className="w-20" />
        </div>

        {/* Search bar */}
        <SkeletonLine size="md" className="w-full mb-6" />

        {/* Currently reading + want-to-read */}
        <div className="mb-8 pb-8 border-b border-line space-y-6">
          {[0, 1].map((section) => (
            <div key={section}>
              <SkeletonLine size="xs" className="w-32 mb-3" />
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonLine size="sm" className="flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Finished by year — divider + grid */}
        <SkeletonLine size="xs" className="w-24 mb-4" />
        <SkeletonGrid count={12} />
      </SkeletonRoot>
    </div>
  );
}
