import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <SkeletonLine w="w-40" h="h-8" />
      <SkeletonCard h="h-20" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} h="h-24" />
        ))}
      </div>
    </div>
  );
}
