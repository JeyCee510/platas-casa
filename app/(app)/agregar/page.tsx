import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AddExpenseForm } from './AddExpenseForm';

export const dynamic = 'force-dynamic';

export default async function AgregarPage() {
  const supabase = createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('id');
  return (
    <Suspense>
      <AddExpenseForm categories={categories ?? []} />
    </Suspense>
  );
}
