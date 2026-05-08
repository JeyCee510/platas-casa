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

/**
 * Resuelve la categoría a usar para los expenses espejo de pago de tarjeta.
 * Prioriza una sub 'pago-tarjeta' si existe, luego el grupo 'grp-pagos'.
 */
async function getCategoriaPagos(supabase: any): Promise<number | null> {
  const { data: sub } = await supabase.from('categories').select('id').eq('slug', 'pago-tarjeta').maybeSingle();
  if (sub) return sub.id;
  const { data: grp } = await supabase.from('categories').select('id').eq('slug', 'grp-pagos').maybeSingle();
  return grp?.id ?? null;
}

export async function crearTransfer(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión expirada');

  const fromId = Number(formData.get('from_account_id'));
  const toId = Number(formData.get('to_account_id'));
  const amount = Number(formData.get('amount'));
  const bankCommission = Number(formData.get('bank_commission') ?? 0) || 0;
  const description = String(formData.get('description') ?? '').trim() || null;
  const transferredAt = String(formData.get('transferred_at') ?? new Date().toISOString().slice(0, 10));

  if (!fromId || !toId || !amount) throw new Error('Datos incompletos');
  if (fromId === toId) throw new Error('Las cuentas deben ser diferentes');

  // 1. Insertar transfer (trigger ajusta balance: from-, to depende del tipo).
  const { error: tErr } = await supabase.from('transfers').insert({
    from_account_id: fromId,
    to_account_id: toId,
    amount,
    description,
    transferred_at: transferredAt,
    created_by: user.id,
  });
  if (tErr) throw tErr;

  // 2. Si es pago de tarjeta, crear espejos visibles en /lista (no afectan balance: account_id null para el espejo del pago).
  const { data: toAccount } = await supabase.from('accounts').select('type, name').eq('id', toId).maybeSingle();
  const isPagoTarjeta = toAccount?.type === 'credit_card';

  if (isPagoTarjeta) {
    const categoryId = await getCategoriaPagos(supabase);
    const baseDesc = description ?? `Pago tarjeta ${toAccount?.name ?? ''}`.trim();

    // Espejo del pago (visible en /lista, no afecta balance porque account_id=null).
    await supabase.from('expenses').insert({
      created_by: user.id,
      amount,
      currency: 'USD',
      description: baseDesc,
      category_id: categoryId,
      account_id: null,
      spent_at: transferredAt,
      source: 'transfer',
      needs_review: false,
      is_deferred: false,
      bank_commission: 0,
    });

    // Comisión bancaria como expense REAL en la cuenta origen (afecta balance).
    if (bankCommission > 0) {
      await supabase.from('expenses').insert({
        created_by: user.id,
        amount: bankCommission,
        currency: 'USD',
        description: `Comisión: ${baseDesc}`,
        category_id: categoryId,
        account_id: fromId,
        spent_at: transferredAt,
        source: 'transfer',
        needs_review: false,
        is_deferred: false,
        bank_commission: 0,
      });
    }
  }

  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/transferir');
  revalidatePath('/lista');
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
