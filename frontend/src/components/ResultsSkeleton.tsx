function SkeletonBar({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} rounded bg-[#1E293B] animate-pulse`} />
  )
}

export default function ResultsSkeleton() {
  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <SkeletonBar w="w-48" h="h-8" />
          <SkeletonBar w="w-72" h="h-3" />
        </div>
        <div className="flex gap-3">
          <SkeletonBar w="w-28" h="h-9" />
          <SkeletonBar w="w-20" h="h-9" />
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mb-6 p-5 rounded-xl border border-[#1E293B] bg-[#0F172A] space-y-2">
        <SkeletonBar w="w-32" h="h-2" />
        <div className="space-y-1.5 mt-3">
          <SkeletonBar />
          <SkeletonBar />
          <SkeletonBar w="w-3/4" />
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6 p-5 rounded-xl border border-[#1E293B] bg-[#0F172A]">
        <SkeletonBar w="w-32" h="h-2" />
        <div className="mt-4 space-y-4 pl-8">
          {[1,2,3].map(i => (
            <div key={i} className="space-y-1.5">
              <SkeletonBar w="w-24" h="h-2" />
              <SkeletonBar w="w-full" h="h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Evidence table */}
      <div className="mb-6 rounded-xl border border-[#1E293B] overflow-hidden">
        <div className="p-3 bg-[#0F172A] border-b border-[#1E293B]">
          <SkeletonBar w="w-32" h="h-2" />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#0F172A]">
            <SkeletonBar w="w-full" />
            <SkeletonBar w="w-24" />
            <SkeletonBar w="w-16" />
          </div>
        ))}
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="p-4 rounded-xl border border-[#1E293B] space-y-2">
            <SkeletonBar w="w-16" h="h-2" />
            <SkeletonBar w="w-12" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
