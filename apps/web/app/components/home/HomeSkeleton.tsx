export function HomeSkeleton() {
  return (
    <div className="page">
      <div className="page-content animate-pulse">
        <div className="h-5 w-36 bg-hover rounded mb-1.5" />
        <div className="h-3.5 w-48 bg-hover rounded mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-hover rounded-xl" />
          ))}
        </div>
        <div className="flex gap-3 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-14 aspect-[2/3] bg-hover rounded" />
          ))}
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-hover rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
