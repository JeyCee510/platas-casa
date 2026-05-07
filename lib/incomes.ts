'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { IncomeSource } from '@/lib/incomes-shared';

export async function listIncomes(limit = 50) {
  const supabase = createClient();
  const { data } = await supabase
    .from('incomes')
    .select('id, source, amount, currency, description, received_at, created_by, created_at')
    .order('received_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function totalIncomesMes(anio: number, mes: number) {
  const supabase = createClient();
  const start = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const next = mes === 12
    ? `${anio + 1}-01-01`
    : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  const { data } = await supabase
    .from('incomes')
    .select('amount, source')
    .gte('received_at', start)
    .lt('received_at', next);
  return (data ?? []).reduce((acc, r: any) => {
    const s = String(r.source);
    acc.total = (acc.total ?? 0) + Number(r.amount);
    acc[s] = (acc[s] ?? 0) + Number(r.amount);
    return acc;
  }, {} as Record<string, number>);
}

export async function crearIngreso(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión expirada');

  const source = String(formData.get('source')) as IncomeSource;
  const amount = Number(formData.get('amount'));
  const description = String(formData.get('description') ?? '').trim() || null;
  const receivedAt = String(formData.get('received_at') ?? new Date().toISOString().slice(0, 10));
  if (!source || !amount) throw new Error('Datos incompletos');

  const { error } = await supabase.from('incomes').insert({
    source, amount, description, received_at: receivedAt,
    created_by: user.id, currency: 'USD',
  });
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/ingresos');
}

export async function eliminarIngreso(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  await supabase.from('incomes').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/ingresos');
}
