import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-3">
      <SkeletonLine w="w-40" h="h-7" />
      <SkeletonCard h="h-32" tone="white" />
      <SkeletonCard h="h-24" />
      <SkeletonCard h="h-40" />
      <SkeletonCard h="h-20" />
    </div>
  );
}
