// Endpoint que guarda un gasto en /expenses y opcionalmente lo replica en /alex_movements
// si se marca "es pago a Alex".

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });

  const {
    amount, description, category_id, account_id, spent_at, source,
    receipt_url, needs_review, is_deferred,
    alex_link, alex_concepto_id, alex_es_extra,
  } = body as {
    amount: number; description: string | null; category_id: number | null;
    account_id: number | null;
    spent_at: string; source: string;
    receipt_url: string | null; needs_review: boolean; is_deferred: boolean;
    alex_link?: boolean; alex_concepto_id?: number | null; alex_es_extra?: boolean;
  };

  const fecha = new Date(spent_at);

  // 1. Crear el gasto
  const { data: expense, error: expErr } = await supabase
    .from('expenses')
    .insert({
      created_by: user.id,
      amount,
      currency: 'USD',
      description,
      category_id,
      account_id,
      spent_at,
      source,
      receipt_url,
      needs_review,
      is_deferred,
    })
    .select('id')
    .single();
  if (expErr || !expense) return NextResponse.json({ error: expErr?.message ?? 'Error creando gasto' }, { status: 500 });

  // 2. Si se marca link a Alex y hay concepto, crear movimiento Alex vinculado
  if (alex_link && alex_concepto_id) {
    const { error: alexErr } = await supabase.from('alex_movements').insert({
      concepto_id: alex_concepto_id,
      fecha: spent_at,
      anio: fecha.getUTCFullYear(),
      mes: fecha.getUTCMonth() + 1,
      monto: amount,
      nota: description ?? '(desde gasto general)',
      planeado: false,
      es_extra: !!alex_es_extra,
      expense_id: expense.id,
    });
    if (alexErr) {
      // No hacemos rollback automático — dejamos el expense, devolvemos warning
      return NextResponse.json({
        ok: true, expense_id: expense.id,
        warning: 'Gasto guardado pero no se pudo vincular a Alex: ' + alexErr.message,
      });
    }
  }

  return NextResponse.json({ ok: true, expense_id: expense.id });
}
