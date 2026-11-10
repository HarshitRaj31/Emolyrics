import React from "react";

export default function MarketplaceSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Hero Header Skeleton */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="h-4 w-32 bg-white/10 rounded-full mx-auto mb-4" />
        <div className="h-10 w-80 bg-white/10 rounded-xl mx-auto mb-3" />
        <div className="h-4 w-96 bg-white/5 rounded-full mx-auto" />
      </div>

      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-neutral-900/60 rounded-2xl border border-white/5 p-3" />
        ))}
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="h-11 w-full md:w-96 bg-neutral-900 rounded-xl border border-white/10" />
        <div className="h-10 w-full md:w-72 bg-neutral-900/80 rounded-full border border-white/5" />
      </div>

      {/* Category Pills Skeleton */}
      <div className="flex gap-2 overflow-hidden mb-10 pb-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-28 bg-neutral-900 rounded-full shrink-0" />
        ))}
      </div>

      {/* Grid of Plugin Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 flex flex-col justify-between h-80"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10" />
                <div className="w-20 h-6 rounded-full bg-white/10" />
              </div>
              <div className="h-6 w-44 bg-white/15 rounded-lg mb-2" />
              <div className="h-3 w-32 bg-white/5 rounded mb-4" />
              <div className="h-3 w-full bg-white/5 rounded mb-2" />
              <div className="h-3 w-5/6 bg-white/5 rounded" />
            </div>
            <div className="h-10 w-full bg-white/10 rounded-xl mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

