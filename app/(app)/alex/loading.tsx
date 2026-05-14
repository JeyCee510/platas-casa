import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <SkeletonLine w="w-48" h="h-8" />
      <SkeletonCard h="h-32" />
      <div className="grid grid-cols-2 gap-2">
        <SkeletonCard h="h-20" />
        <SkeletonCard h="h-20" />
      </div>
      <SkeletonCard h="h-40" />
      <SkeletonCard h="h-48" />
    </div>
  );
}
