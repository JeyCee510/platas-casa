import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AddExpenseForm } from './AddExpenseForm';

export const dynamic = 'force-dynamic';

export default async function AgregarPage() {
  const supabase = createClient();
  const [{ data: categories }, { data: alexConcepts }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('*').order('id'),
    supabase.from('alex_concepts').select('id, nombre, activo, monto_tipo, es_extra_default, orden').eq('activo', true).order('orden'),
    supabase.from('accounts').select('id, type, name').order('type').order('name'),
  ]);
  return (
    <Suspense>
      <AddExpenseForm categories={categories ?? []} alexConcepts={alexConcepts ?? []} accounts={accounts ?? []} />
    </Suspense>
  );
}
