// Skeletons neobrutalistas reutilizables para loading states.
// Pulsan suave y mantienen el shape de la página para evitar layout shift.

export function SkeletonLine({ w = 'w-3/4', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-ink/10 rounded-md animate-pulse`} />;
}

export function SkeletonCard({ tone = 'white', h = 'h-24' }: { tone?: string; h?: string }) {
  const bg = tone === 'white' ? 'bg-white' : `bg-${tone}`;
  return (
    <div className={`border-3 border-ink rounded-md ${bg} shadow-brutSm p-4 ${h} animate-pulse`}>
      <div className="w-1/2 h-3 bg-ink/15 rounded mb-2" />
      <div className="w-2/3 h-6 bg-ink/10 rounded" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SkeletonLine w="w-32" h="h-3" />
        <SkeletonLine w="w-48" h="h-8" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="border-3 border-ink rounded-xl bg-ink/5 shadow-brut min-h-[110px] animate-pulse" />
        <div className="border-3 border-ink rounded-xl bg-ink/5 shadow-brut min-h-[110px] animate-pulse" />
        <div className="border-3 border-ink rounded-xl bg-ink/5 shadow-brut min-h-[110px] animate-pulse" />
      </div>
      <SkeletonCard h="h-28" />
      <SkeletonCard h="h-32" />
    </div>
  );
}
