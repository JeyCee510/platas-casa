import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine w="w-40" h="h-8" />
        <SkeletonLine w="w-20" h="h-10" />
      </div>
      <SkeletonCard h="h-16" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} h="h-16" />
        ))}
      </div>
    </div>
  );
}
