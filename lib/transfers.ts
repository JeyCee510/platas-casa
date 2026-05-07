'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function listTransfers(limit = 50) {
  const supabase = createClient();
  const { data } = await supabase
    .from('transfers')
    .select('id, from_account_id, to_account_id, amount, description, transferred_at, created_by, created_at')
    .order('transferred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function crearTransfer(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión expirada');

  const fromId = Number(formData.get('from_account_id'));
  const toId = Number(formData.get('to_account_id'));
  const amount = Number(formData.get('amount'));
  const description = String(formData.get('description') ?? '').trim() || null;
  const transferredAt = String(formData.get('transferred_at') ?? new Date().toISOString().slice(0, 10));

  if (!fromId || !toId || !amount) throw new Error('Datos incompletos');
  if (fromId === toId) throw new Error('Las cuentas deben ser diferentes');

  const { error } = await supabase.from('transfers').insert({
    from_account_id: fromId,
    to_account_id: toId,
    amount,
    description,
    transferred_at: transferredAt,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/transferir');
}

export async function eliminarTransfer(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  await supabase.from('transfers').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/transferir');
}
