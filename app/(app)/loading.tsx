import { PageSkeleton } from '@/components/ui/Skeleton';

// Loading state default para todas las rutas del grupo (app).
// Cuando una page específica quiere otro skeleton, crear loading.tsx en su carpeta.
export default function Loading() {
  return <PageSkeleton />;
}
