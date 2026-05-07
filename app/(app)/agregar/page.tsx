import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AddExpenseForm } from './AddExpenseForm';

export const dynamic = 'force-dynamic';

export default async function AgregarPage() {
  const supabase = createClient();
  const [{ data: categories }, { data: alexConcepts }, { data: accounts }, { data: ultimos }] = await Promise.all([
    supabase.from('categories').select('*').order('ord'),
    supabase.from('alex_concepts').select('id, nombre, activo, monto_tipo, es_extra_default, orden').eq('activo', true).order('orden'),
    supabase.from('accounts').select('id, type, name').order('type').order('name'),
    supabase.from('expenses').select('category_id').not('category_id', 'is', null).order('id', { ascending: false }).limit(50),
  ]);

  // Calcular recientes (top 6 categorías más usadas en los últimos 50 gastos)
  const counts = new Map<number, number>();
  (ultimos ?? []).forEach((e: any) => {
    if (e.category_id) counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
  });
  const recentIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);

  return (
    <Suspense>
      <AddExpenseForm
        categories={categories ?? []}
        alexConcepts={alexConcepts ?? []}
        accounts={accounts ?? []}
        recentCategoryIds={recentIds}
      />
    </Suspense>
  );
}
