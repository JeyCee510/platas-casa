import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <SkeletonLine w="w-48" h="h-8" />
      <SkeletonCard h="h-48" />
      <SkeletonLine w="w-32" h="h-6" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} h="h-16" />
        ))}
      </div>
    </div>
  );
}
