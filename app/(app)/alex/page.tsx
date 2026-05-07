import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/role';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatUSD } from '@/lib/format';
import {
  getAlexConfig, listConcepts, listLoans, getResumenMes,
  eliminarMovimiento, confirmarMovimientoPlaneado, eliminarPrestamo,
} from '@/lib/alex';
import { AddMovimientoForm } from './AddMovimientoForm';
import { AddPrestamoForm } from './AddPrestamoForm';

export const dynamic = 'force-dynamic';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default async function AlexPage({ searchParams }: { searchParams: { ym?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) redirect('/');

  const today = new Date();
  let anio = today.getUTCFullYear();
  let mes = today.getUTCMonth() + 1;
  if (searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)) {
    const [a, m] = searchParams.ym.split('-').map(Number);
    if (m >= 1 && m <= 12) { anio = a; mes = m; }
  }

  const [config, concepts, loans, resumen] = await Promise.all([
    getAlexConfig(),
    listConcepts(),
    listLoans(),
    getResumenMes(anio, mes),
  ]);

  const realesSueldo = resumen.movimientos.filter((m) => !m.planeado && !m.es_extra);
  const realesExtras = resumen.movimientos.filter((m) => !m.planeado && m.es_extra);
  const planeados = resumen.movimientos.filter((m) => m.planeado);

  const prevMes = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const nextMes = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
  const ymStr = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">Platas Alex</p>
        <h1 className="text-2xl font-black">Pagos a Alex</h1>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-center gap-2">
        <Link href={`/alex?ym=${ymStr(prevMes.anio, prevMes.mes)}`} className="border-3 border-ink bg-white shadow-brutSm rounded-md px-3 py-1 font-black active:translate-x-[1px] active:translate-y-[1px]">←</Link>
        <Badge tone="lemon">{MESES[mes - 1]} {anio}</Badge>
        <Link href={`/alex?ym=${ymStr(nextMes.anio, nextMes.mes)}`} className="border-3 border-ink bg-white shadow-brutSm rounded-md px-3 py-1 font-black active:translate-x-[1px] active:translate-y-[1px]">→</Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`border-3 border-ink rounded-md p-2 text-center ${resumen.totalPagado > 0 ? 'bg-mint' : 'bg-white'}`}>
          <p className="text-[10px] font-bold uppercase">Pagado</p>
          <p className="text-lg font-black">{formatUSD(resumen.totalPagado)}</p>
        </div>
        <div className={`border-3 border-ink rounded-md p-2 text-center ${resumen.falta === 0 ? 'bg-mint' : 'bg-peach'}`}>
          <p className="text-[10px] font-bold uppercase">Falta</p>
          <p className="text-lg font-black">{formatUSD(resumen.falta)}</p>
        </div>
        <div className={`border-3 border-ink rounded-md p-2 text-center ${resumen.saldoPrestamos > 0 ? 'bg-bubble' : 'bg-mint'}`}>
          <p className="text-[10px] font-bold uppercase">Préstamos</p>
          <p className="text-lg font-black">{formatUSD(resumen.saldoPrestamos)}</p>
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase text-ink/70 text-center">
        Total mensual: {formatUSD(Number(config.total_mensual))}
        {resumen.totalExtras > 0 && <> · Extras: {formatUSD(resumen.totalExtras)}</>}
        {resumen.totalPlaneado > 0 && <> · Planeado: {formatUSD(resumen.totalPlaneado)}</>}
      </p>

      {/* Movimientos reales (sueldo) */}
      <Card tone="white" className="overflow-hidden">
        <div className="bg-mint border-b-3 border-ink px-3 py-1.5">
          <p className="text-xs font-black uppercase">Sueldo · {MESES[mes - 1]} {anio}</p>
        </div>
        {realesSueldo.length === 0 ? (
          <p className="p-4 text-xs text-center font-bold">Sin pagos este mes.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {realesSueldo.map((m) => (
              <li key={m.id} className="p-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">{m.concepto_nombre}</p>
                  <p className="text-[10px]">{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
                </div>
                <span className="font-black text-sm">{formatUSD(m.monto)}</span>
                <form action={eliminarMovimiento}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Extras */}
      {realesExtras.length > 0 && (
        <Card tone="lilac" className="overflow-hidden">
          <div className="bg-lilac border-b-3 border-ink px-3 py-1.5">
            <p className="text-xs font-black uppercase">Extras (no cuentan al sueldo)</p>
          </div>
          <ul className="divide-y-3 divide-ink bg-white">
            {realesExtras.map((m) => (
              <li key={m.id} className="p-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">{m.concepto_nombre}</p>
                  <p className="text-[10px]">{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
                </div>
                <span className="font-black text-sm">{formatUSD(m.monto)}</span>
                <form action={eliminarMovimiento}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Planeados */}
      {planeados.length > 0 && (
        <Card tone="white" className="overflow-hidden border-dashed">
          <div className="bg-bg border-b-3 border-dashed border-ink px-3 py-1.5">
            <p className="text-xs font-black uppercase">Planeado este mes (✓ confirmar)</p>
          </div>
          <ul className="divide-y-3 divide-dashed divide-ink/50">
            {planeados.map((m) => (
              <li key={m.id} className="p-2 flex items-center justify-between gap-2 bg-white/50">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm italic">{m.concepto_nombre}</p>
                  <p className="text-[10px] italic">{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
                </div>
                <span className="font-bold italic text-sm">{formatUSD(m.monto)}</span>
                <form action={confirmarMovimientoPlaneado}>
                  <input type="hidden" name="id" value={m.id} />
                  <button title="Confirmar como pagado" className="border-3 border-ink rounded-md w-8 h-8 bg-mint shadow-brutSm font-black text-sm">✓</button>
                </form>
                <form action={eliminarMovimiento}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Form para agregar movimiento */}
      <AddMovimientoForm concepts={concepts.filter((c) => c.activo)} fechaDefault={`${anio}-${String(mes).padStart(2, '0')}-${String(Math.min(today.getUTCDate(), new Date(anio, mes, 0).getDate())).padStart(2, '0')}`} />

      {/* Préstamos */}
      <Card tone="bubble" className="p-4">
        <h2 className="font-black text-sm uppercase mb-2">💰 Préstamos activos</h2>
        {loans.filter((p) => p.activo).length === 0 ? (
          <p className="text-xs">Sin préstamos activos.</p>
        ) : (
          <ul className="space-y-2">
            {loans.filter((p) => p.activo).map((p) => {
              const pct = p.cuotas > 0 ? (p.cuotas_cobradas / p.cuotas) * 100 : 0;
              return (
                <li key={p.id} className="border-3 border-ink rounded-md bg-white p-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{formatUSD(Number(p.monto))} · {p.cuotas_cobradas}/{p.cuotas} cuotas (× {formatUSD(Number(p.cuota_size))})</span>
                    <Badge tone={Number(p.saldo_actual) > 0 ? 'peach' : 'mint'}>saldo {formatUSD(Number(p.saldo_actual))}</Badge>
                  </div>
                  <div className="mt-1 h-1.5 w-full border-2 border-ink bg-white">
                    <div className="h-full bg-mint border-r-2 border-ink" style={{ width: `${pct}%` }} />
                  </div>
                  {p.descripcion && <p className="text-[10px] mt-1">{p.descripcion}</p>}
                  <form action={eliminarPrestamo} className="mt-1">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-[10px] underline font-bold">Eliminar préstamo</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AddPrestamoForm />

      <p className="text-xs">
        <Link href="/" className="underline font-bold">← Volver al inicio</Link>
      </p>
    </div>
  );
}

function fmtFecha(s: string) {
  const d = new Date(s);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
