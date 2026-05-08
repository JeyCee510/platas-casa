// Server actions y queries del módulo Platas Alex.
// Solo accesible para admin (RLS hace cumplir esto a nivel DB también).

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type AlexConcepto = {
  id: number;
  nombre: string;
  activo: boolean;
  orden: number;
  es_fijo: boolean;
  monto_tipo: number | null;
  es_extra_default: boolean;
  notas: string | null;
};

export type AlexPrestamo = {
  id: number;
  monto: number;
  cuotas: number;
  cuota_size: number;
  fecha_prestamo: string;
  descripcion: string | null;
  saldo_actual: number;
  cuotas_cobradas: number;
  activo: boolean;
};

export type AlexMovimiento = {
  id: number;
  concepto_id: number;
  concepto_nombre?: string;
  fecha: string;
  anio: number;
  mes: number;
  monto: number;
  cantidad: number | null;
  nota: string | null;
  planeado: boolean;
  es_extra: boolean;
  prestamo_id: number | null;
  comprobante: string | null;
};

export type ResumenMes = {
  anio: number;
  mes: number;
  totalPagado: number;
  totalExtras: number;
  totalPlaneado: number;
  totalEsperado: number;
  falta: number;
  saldoPrestamos: number;
  movimientos: AlexMovimiento[];
};

export type ResumenAnio = {
  anio: number;
  meses: ResumenMes[];
  totalPagadoAnio: number;
  totalExtrasAnio: number;
  totalEsperadoAnio: number;
};

export async function getAlexConfig() {
  const supabase = createClient();
  const { data } = await supabase.from('alex_config').select('*').eq('id', 'singleton').single();
  return data ?? {
    id: 'singleton',
    sueldo_base: 526.16,
    fondo_reserva: 43.84,
    total_mensual: 570,
    saldo_prestamo_nuestro: 0,
    notas: null,
  };
}

export async function listConcepts(): Promise<AlexConcepto[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('alex_concepts')
    .select('*')
    .order('activo', { ascending: false })
    .order('orden');
  return (data as any) ?? [];
}

export async function listLoans(): Promise<AlexPrestamo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('alex_loans')
    .select('*')
    .order('activo', { ascending: false })
    .order('fecha_prestamo', { ascending: false });
  return (data as any) ?? [];
}

export async function getResumenMes(anio: number, mes: number): Promise<ResumenMes> {
  const supabase = createClient();
  const config = await getAlexConfig();
  const { data: movs } = await supabase
    .from('alex_movements')
    .select('id, concepto_id, fecha, anio, mes, monto, cantidad, nota, planeado, es_extra, prestamo_id, comprobante, alex_concepts(nombre)')
    .eq('anio', anio)
    .eq('mes', mes)
    .order('planeado')
    .order('fecha');

  const movimientos: AlexMovimiento[] = ((movs ?? []) as any[]).map((m) => ({
    id: m.id,
    concepto_id: m.concepto_id,
    concepto_nombre: m.alex_concepts?.nombre ?? 'Sin concepto',
    fecha: m.fecha,
    anio: m.anio,
    mes: m.mes,
    monto: Number(m.monto),
    cantidad: m.cantidad,
    nota: m.nota,
    planeado: m.planeado,
    es_extra: m.es_extra,
    prestamo_id: m.prestamo_id,
    comprobante: m.comprobante,
  }));

  const reales = movimientos.filter((m) => !m.planeado);
  const realesSueldo = reales.filter((m) => !m.es_extra);
  const realesExtras = reales.filter((m) => m.es_extra);
  const planeados = movimientos.filter((m) => m.planeado);

  const totalPagado = round(realesSueldo.reduce((s, m) => s + m.monto, 0));
  const totalExtras = round(realesExtras.reduce((s, m) => s + m.monto, 0));
  const totalPlaneado = round(planeados.reduce((s, m) => s + m.monto, 0));
  const totalEsperado = Number(config.total_mensual);
  const falta = Math.max(0, round(totalEsperado - totalPagado));

  return {
    anio, mes,
    totalPagado, totalExtras, totalPlaneado, totalEsperado, falta,
    saldoPrestamos: Number(config.saldo_prestamo_nuestro),
    movimientos,
  };
}

function round(n: number) { return Math.round(n * 100) / 100; }

export async function getResumenAnio(anio: number): Promise<ResumenAnio> {
  const meses: ResumenMes[] = [];
  for (let m = 1; m <= 12; m++) meses.push(await getResumenMes(anio, m));
  const totalPagadoAnio = round(meses.reduce((s, r) => s + r.totalPagado, 0));
  const totalExtrasAnio = round(meses.reduce((s, r) => s + r.totalExtras, 0));
  const totalEsperadoAnio = round(meses.reduce((s, r) => s + r.totalEsperado, 0));
  return { anio, meses, totalPagadoAnio, totalExtrasAnio, totalEsperadoAnio };
}

const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFechaCorta(s: string) {
  const d = new Date(s);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function generarResumenWhatsApp(anio: number, mes: number): Promise<string> {
  const r = await getResumenMes(anio, mes);
  const config = await getAlexConfig();
  const loans = await listLoans();

  const lineas: string[] = [];
  lineas.push(`*Platas Alex — ${MESES_ES[mes - 1]} ${anio}*`);
  lineas.push('');
  lineas.push(`Total mensual: ${fmtMoney(r.totalEsperado)}`);
  lineas.push(`Pagado:        ${fmtMoney(r.totalPagado)}`);
  lineas.push(`Falta:         ${fmtMoney(r.falta)}`);
  if (r.totalExtras > 0) lineas.push(`Extras:        ${fmtMoney(r.totalExtras)}  _(adicionales al sueldo)_`);
  lineas.push('');

  const reales = r.movimientos.filter((m) => !m.planeado);
  const sueldo = reales.filter((m) => !m.es_extra);
  const extras = reales.filter((m) => m.es_extra);

  if (sueldo.length === 0 && extras.length === 0) {
    lineas.push('_Sin pagos registrados este mes._');
  }
  if (sueldo.length > 0) {
    lineas.push('*Detalle (sueldo):*');
    for (const m of sueldo) {
      const cant = m.cantidad ? ` (${m.cantidad}×)` : '';
      const nota = m.nota ? `  _${m.nota}_` : '';
      lineas.push(`• ${fmtFechaCorta(m.fecha)} · ${m.concepto_nombre}${cant}: ${fmtMoney(m.monto)}${nota}`);
    }
  }
  if (extras.length > 0) {
    if (sueldo.length > 0) lineas.push('');
    lineas.push('*Gastos extras (no incluidos en sueldo):*');
    for (const m of extras) {
      const cant = m.cantidad ? ` (${m.cantidad}×)` : '';
      const nota = m.nota ? `  _${m.nota}_` : '';
      lineas.push(`◦ ${fmtFechaCorta(m.fecha)} · ${m.concepto_nombre}${cant}: ${fmtMoney(m.monto)} [EXTRA]${nota}`);
    }
  }

  const planeados = r.movimientos.filter((m) => m.planeado);
  if (planeados.length > 0) {
    lineas.push('');
    lineas.push('*Planeado este mes:*');
    for (const m of planeados) {
      lineas.push(`◦ ${fmtFechaCorta(m.fecha)} · ${m.concepto_nombre}: ${fmtMoney(m.monto)}${m.nota ? '  _' + m.nota + '_' : ''}`);
    }
  }

  const activos = loans.filter((p) => p.activo);
  if (activos.length > 0) {
    lineas.push('');
    lineas.push('*Préstamos activos:*');
    for (const p of activos) {
      lineas.push(`• ${fmtMoney(Number(p.monto))} (${p.cuotas_cobradas}/${p.cuotas} cuotas) — saldo ${fmtMoney(Number(p.saldo_actual))}`);
    }
  }

  if (config.notas) {
    lineas.push('');
    lineas.push(`_${config.notas}_`);
  }

  return lineas.join('\n');
}

// ----- Helpers para mantener integridad con módulo general -----

/**
 * Crea un expense espejo en general para un movimiento Alex.
 * - Cuenta: Pichincha (default) o primera cuenta bancaria.
 * - Categoría: 'alex' (subcategoría definida en migraciones).
 * - source: 'alex' para distinguir.
 * Devuelve el expense.id o null si falla.
 */
async function crearExpenseEspejoAlex(opts: {
  amount: number;
  description: string | null;
  spent_at: string;
  conceptoNombre?: string;
}): Promise<number | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [catRes, pichRes] = await Promise.all([
    supabase.from('categories').select('id').eq('slug', 'alex').maybeSingle(),
    supabase.from('accounts').select('id').ilike('name', '%pichincha%').eq('type', 'bank_account').maybeSingle(),
  ]);
  let accountId = pichRes.data?.id ?? null;
  if (!accountId) {
    const { data: anyBank } = await supabase.from('accounts').select('id').eq('type', 'bank_account').limit(1).maybeSingle();
    accountId = anyBank?.id ?? null;
  }

  const desc = opts.description ?? (opts.conceptoNombre ? `Alex: ${opts.conceptoNombre}` : 'Pago Alex');
  const { data, error } = await supabase.from('expenses').insert({
    created_by: user.id,
    amount: opts.amount,
    currency: 'USD',
    description: desc,
    category_id: catRes.data?.id ?? null,
    account_id: accountId,
    spent_at: opts.spent_at,
    source: 'alex',
    needs_review: false,
    is_deferred: false,
    bank_commission: 0,
  }).select('id').single();
  if (error) {
    console.error('crearExpenseEspejoAlex falló:', error);
    return null;
  }
  return data.id;
}

async function eliminarExpenseEspejo(expenseId: number | null | undefined) {
  if (!expenseId) return;
  const supabase = createClient();
  await supabase.from('expenses').delete().eq('id', expenseId);
}

// ----- Mutaciones -----

export async function crearMovimiento(formData: FormData) {
  const supabase = createClient();
  const conceptoId = Number(formData.get('concepto_id'));
  const fechaStr = String(formData.get('fecha'));
  const monto = Number(formData.get('monto'));
  const cantidadRaw = String(formData.get('cantidad') ?? '');
  const cantidad = cantidadRaw ? Number(cantidadRaw) : null;
  const nota = String(formData.get('nota') ?? '').trim() || null;
  const esExtra = formData.get('es_extra') === 'on';
  if (!conceptoId || !fechaStr || !monto) throw new Error('Datos incompletos');
  const fecha = new Date(fechaStr);

  // Crear expense espejo en general (sale plata real). Sólo movimientos no-planeados.
  const { data: concepto } = await supabase.from('alex_concepts').select('nombre').eq('id', conceptoId).maybeSingle();
  const expenseId = await crearExpenseEspejoAlex({
    amount: monto,
    description: nota,
    spent_at: fechaStr,
    conceptoNombre: concepto?.nombre,
  });

  const { error } = await supabase.from('alex_movements').insert({
    concepto_id: conceptoId,
    fecha: fechaStr,
    anio: fecha.getUTCFullYear(),
    mes: fecha.getUTCMonth() + 1,
    monto, cantidad, nota, es_extra: esExtra, planeado: false,
    expense_id: expenseId,
  });
  if (error) {
    // Rollback expense espejo si falla insertar movimiento
    await eliminarExpenseEspejo(expenseId);
    throw error;
  }
  revalidatePath('/alex');
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/lista');
}

export async function eliminarMovimiento(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  // Si está vinculado a préstamo y NO es planeado, devolver al saldo
  const { data: m } = await supabase.from('alex_movements').select('*').eq('id', id).single();
  if (m && m.prestamo_id && !m.planeado) {
    const { data: p } = await supabase.from('alex_loans').select('*').eq('id', m.prestamo_id).single();
    if (p) {
      const nuevoSaldo = round(Number(p.saldo_actual) + Number(m.monto));
      await supabase.from('alex_loans').update({
        saldo_actual: nuevoSaldo,
        cuotas_cobradas: Math.max(0, p.cuotas_cobradas - 1),
        activo: nuevoSaldo > 0,
      }).eq('id', p.id);
    }
  }
  // Si tiene expense espejo, borrarlo también (cobros de préstamo no tienen)
  if (m?.expense_id) await eliminarExpenseEspejo(m.expense_id);
  await supabase.from('alex_movements').delete().eq('id', id);
  await syncSaldoCache();
  revalidatePath('/alex');
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/lista');
}

export async function confirmarMovimientoPlaneado(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  const { data: m } = await supabase.from('alex_movements').select('*, alex_concepts(nombre)').eq('id', id).single();
  if (!m || !m.planeado) return;

  // Si NO es cuota de préstamo, crear expense espejo (sale plata al confirmar).
  // Si SÍ es cuota de préstamo, NO crear expense (es cobro: el préstamo entero ya creó su expense al darse).
  let expenseId: number | null = m.expense_id ?? null;
  if (!m.prestamo_id && !expenseId) {
    expenseId = await crearExpenseEspejoAlex({
      amount: Number(m.monto),
      description: m.nota,
      spent_at: m.fecha,
      conceptoNombre: (m.alex_concepts as any)?.nombre,
    });
  }

  await supabase.from('alex_movements').update({ planeado: false, expense_id: expenseId }).eq('id', id);

  if (m.prestamo_id) {
    const { data: p } = await supabase.from('alex_loans').select('*').eq('id', m.prestamo_id).single();
    if (p) {
      const nuevoSaldo = round(Math.max(0, Number(p.saldo_actual) - Number(m.monto)));
      await supabase.from('alex_loans').update({
        saldo_actual: nuevoSaldo,
        cuotas_cobradas: p.cuotas_cobradas + 1,
        activo: nuevoSaldo > 0,
      }).eq('id', p.id);
    }
  }
  await syncSaldoCache();
  revalidatePath('/alex');
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/lista');
}

export async function crearPrestamo(formData: FormData) {
  const supabase = createClient();
  const monto = Number(formData.get('monto'));
  const cuotas = Math.max(1, Math.min(12, Number(formData.get('cuotas')) || 1));
  const fechaStr = String(formData.get('fecha') ?? new Date().toISOString().slice(0, 10));
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;
  if (!monto || monto <= 0) throw new Error('Monto inválido');
  const cuotaSize = round(monto / cuotas);

  const { data: concepto } = await supabase.from('alex_concepts').select('id').eq('nombre', 'Préstamo nuestro').single();
  if (!concepto) throw new Error('Concepto "Préstamo nuestro" no existe');

  // Crear expense espejo del MONTO TOTAL (sale plata al darle el préstamo).
  // Las cuotas de cobro NO crean expenses adicionales (es recuperación, no gasto nuevo).
  const expenseId = await crearExpenseEspejoAlex({
    amount: monto,
    description: descripcion ? `Préstamo Alex: ${descripcion}` : `Préstamo Alex (${cuotas} cuotas)`,
    spent_at: fechaStr,
  });

  const { data: prestamo } = await supabase.from('alex_loans').insert({
    monto, cuotas, cuota_size: cuotaSize, fecha_prestamo: fechaStr, descripcion,
    saldo_actual: monto, cuotas_cobradas: 0, activo: true,
    expense_id: expenseId,
  }).select('id').single();
  if (!prestamo) {
    await eliminarExpenseEspejo(expenseId);
    throw new Error('No se pudo crear préstamo');
  }

  const baseFecha = new Date(fechaStr);
  for (let i = 0; i < cuotas; i++) {
    const m = baseFecha.getUTCMonth() + i;
    const anio = baseFecha.getUTCFullYear() + Math.floor(m / 12);
    const mes = (m % 12) + 1;
    const ultDia = new Date(anio, mes, 0).getDate();
    const dia = Math.min(30, ultDia);
    const fechaCuota = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    await supabase.from('alex_movements').insert({
      concepto_id: concepto.id,
      fecha: fechaCuota, anio, mes,
      monto: cuotaSize,
      nota: `Cuota ${i + 1}/${cuotas} (planeada)`,
      planeado: true,
      prestamo_id: prestamo.id,
    });
  }
  await syncSaldoCache();
  revalidatePath('/alex');
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/lista');
}

export async function eliminarPrestamo(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  // Borrar expense espejo del préstamo si existe
  const { data: p } = await supabase.from('alex_loans').select('expense_id').eq('id', id).maybeSingle();
  if (p?.expense_id) await eliminarExpenseEspejo(p.expense_id);
  await supabase.from('alex_movements').delete().eq('prestamo_id', id).eq('planeado', true);
  await supabase.from('alex_movements').update({ prestamo_id: null }).eq('prestamo_id', id);
  await supabase.from('alex_loans').delete().eq('id', id);
  await syncSaldoCache();
  revalidatePath('/alex');
  revalidatePath('/');
  revalidatePath('/cuentas');
  revalidatePath('/lista');
}

async function syncSaldoCache() {
  const supabase = createClient();
  const { data } = await supabase.from('alex_loans').select('saldo_actual').eq('activo', true);
  const total = (data ?? []).reduce((s, p: any) => s + Number(p.saldo_actual), 0);
  await supabase.from('alex_config').update({ saldo_prestamo_nuestro: round(total) }).eq('id', 'singleton');
}

export async function toggleConcepto(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  const { data: c } = await supabase.from('alex_concepts').select('activo').eq('id', id).single();
  if (!c) return;
  await supabase.from('alex_concepts').update({ activo: !c.activo }).eq('id', id);
  revalidatePath('/alex');
}
