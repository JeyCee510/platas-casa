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

// ----- Mutaciones -----

export async function crearMovimiento(formData: FormData) {
  const supabase = createClient();
  const conceptoId = Number(formData.get('concepto_id'));
  const fechaStr = String(formData.get('fecha'));
  const monto = Number(formData.get('monto'));
  const nota = String(formData.get('nota') ?? '').trim() || null;
  const esExtra = formData.get('es_extra') === 'on';
  if (!conceptoId || !fechaStr || !monto) throw new Error('Datos incompletos');
  const fecha = new Date(fechaStr);
  const { error } = await supabase.from('alex_movements').insert({
    concepto_id: conceptoId,
    fecha: fechaStr,
    anio: fecha.getUTCFullYear(),
    mes: fecha.getUTCMonth() + 1,
    monto, nota, es_extra: esExtra, planeado: false,
  });
  if (error) throw error;
  revalidatePath('/alex');
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
  await supabase.from('alex_movements').delete().eq('id', id);
  await syncSaldoCache();
  revalidatePath('/alex');
}

export async function confirmarMovimientoPlaneado(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  const { data: m } = await supabase.from('alex_movements').select('*').eq('id', id).single();
  if (!m || !m.planeado) return;
  await supabase.from('alex_movements').update({ planeado: false }).eq('id', id);
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

  const { data: prestamo } = await supabase.from('alex_loans').insert({
    monto, cuotas, cuota_size: cuotaSize, fecha_prestamo: fechaStr, descripcion,
    saldo_actual: monto, cuotas_cobradas: 0, activo: true,
  }).select('id').single();
  if (!prestamo) throw new Error('No se pudo crear préstamo');

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
}

export async function eliminarPrestamo(formData: FormData) {
  const supabase = createClient();
  const id = Number(formData.get('id'));
  if (!id) return;
  await supabase.from('alex_movements').delete().eq('prestamo_id', id).eq('planeado', true);
  await supabase.from('alex_movements').update({ prestamo_id: null }).eq('prestamo_id', id);
  await supabase.from('alex_loans').delete().eq('id', id);
  await syncSaldoCache();
  revalidatePath('/alex');
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
