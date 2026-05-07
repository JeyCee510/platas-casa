import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD } from '@/lib/format';
import {
  getAlexConfig, listConcepts, listLoans, getResumenMes, getResumenAnio,
  eliminarMovimiento, confirmarMovimientoPlaneado, eliminarPrestamo,
  generarResumenWhatsApp,
} from '@/lib/alex';
import { AddMovimientoForm } from './AddMovimientoForm';
import { AddPrestamoForm } from './AddPrestamoForm';
import { ConceptosToggle } from './ConceptosToggle';
import { ComprobanteButton } from './ComprobanteButton';
import { ExportWhatsApp } from './ExportWhatsApp';
import { AlexMovimientosCliente } from './AlexMovimientosCliente';

export const dynamic = 'force-dynamic';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ymStr = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}`;

function fmtFecha(s: string) {
  const d = new Date(s);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function AlexPage({ searchParams }: { searchParams: { ym?: string; v?: string; y?: string } }) {
  const supabase = createClient();
  await supabase.auth.getUser();

  const today = new Date();
  let anio = today.getUTCFullYear();
  let mes = today.getUTCMonth() + 1;
  if (searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)) {
    const [a, m] = searchParams.ym.split('-').map(Number);
    if (m >= 1 && m <= 12) { anio = a; mes = m; }
  }
  const vistaAnio = searchParams.v === 'ano';
  let yearAnio = today.getUTCFullYear();
  if (searchParams.y && /^\d{4}$/.test(searchParams.y)) yearAnio = Number(searchParams.y);

  const [config, concepts, loans] = await Promise.all([
    getAlexConfig(),
    listConcepts(),
    listLoans(),
  ]);
  const conceptsActivos = concepts.filter((c) => c.activo);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-ink/70">Platas Alex</p>
          <h1 className="text-2xl font-black">Pagos a Alex</h1>
        </div>
        <div className="flex border-3 border-ink rounded-md overflow-hidden shadow-brutSm">
          <Link href="/alex" className={`px-3 py-1 text-xs font-black uppercase ${!vistaAnio ? 'bg-lemon' : 'bg-white'}`}>Mes</Link>
          <Link href="/alex?v=ano" className={`px-3 py-1 text-xs font-black uppercase border-l-3 border-ink ${vistaAnio ? 'bg-lemon' : 'bg-white'}`}>Año</Link>
        </div>
      </div>

      {vistaAnio
        ? <VistaAnio yearAnio={yearAnio} loans={loans} />
        : <VistaMes anio={anio} mes={mes} concepts={conceptsActivos} todosConceptos={concepts} loans={loans} configTotalMensual={Number(config.total_mensual)} />
      }
    </div>
  );
}

async function VistaMes({ anio, mes, concepts, todosConceptos, loans, configTotalMensual }: {
  anio: number; mes: number;
  concepts: any[]; todosConceptos: any[]; loans: any[]; configTotalMensual: number;
}) {
  const resumen = await getResumenMes(anio, mes);
  const textoWA = await generarResumenWhatsApp(anio, mes);

  const realesSueldo = resumen.movimientos.filter((m) => !m.planeado && !m.es_extra);
  const realesExtras = resumen.movimientos.filter((m) => !m.planeado && m.es_extra);
  const planeados = resumen.movimientos.filter((m) => m.planeado);
  const prevMes = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const nextMes = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
  const today = new Date();
  const ultDia = new Date(anio, mes, 0).getDate();
  const dia = anio === today.getUTCFullYear() && mes === today.getUTCMonth() + 1
    ? today.getUTCDate()
    : Math.min(today.getUTCDate(), ultDia);
  const fechaDefault = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  return (
    <>
      {/* Nav mes */}
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
        Total mensual: {formatUSD(configTotalMensual)}
        {resumen.totalExtras > 0 && <> · Extras: {formatUSD(resumen.totalExtras)}</>}
        {resumen.totalPlaneado > 0 && <> · Planeado: {formatUSD(resumen.totalPlaneado)}</>}
      </p>

      <AlexMovimientosCliente
        realesSueldo={realesSueldo.map((m) => ({ id: m.id, concepto_nombre: m.concepto_nombre ?? '', fecha: m.fecha, monto: m.monto, cantidad: m.cantidad, nota: m.nota, planeado: m.planeado, es_extra: m.es_extra, comprobante: m.comprobante }))}
        realesExtras={realesExtras.map((m) => ({ id: m.id, concepto_nombre: m.concepto_nombre ?? '', fecha: m.fecha, monto: m.monto, cantidad: m.cantidad, nota: m.nota, planeado: m.planeado, es_extra: m.es_extra, comprobante: m.comprobante }))}
        planeados={planeados.map((m) => ({ id: m.id, concepto_nombre: m.concepto_nombre ?? '', fecha: m.fecha, monto: m.monto, cantidad: m.cantidad, nota: m.nota, planeado: m.planeado, es_extra: m.es_extra, comprobante: m.comprobante }))}
        loans={loans.map((p: any) => ({ id: p.id, monto: p.monto, cuotas: p.cuotas, cuota_size: p.cuota_size, cuotas_cobradas: p.cuotas_cobradas, saldo_actual: p.saldo_actual, activo: p.activo }))}
        mes={mes}
        anio={anio}
        totalPagado={resumen.totalPagado}
        totalExtras={resumen.totalExtras}
        totalEsperado={resumen.totalEsperado}
        falta={resumen.falta}
        saldoPrestamos={resumen.saldoPrestamos}
      />

      <ConceptosToggle todos={todosConceptos} />

      <AddMovimientoForm concepts={concepts} fechaDefault={fechaDefault} />

      <ExportWhatsApp texto={textoWA} mes={mes} anio={anio} />

      <Card tone="bubble" className="p-4">
        <h2 className="font-black text-sm uppercase mb-2">💰 Préstamos activos</h2>
        {loans.filter((p: any) => p.activo).length === 0 ? (
          <p className="text-xs">Sin préstamos activos.</p>
        ) : (
          <ul className="space-y-2">
            {loans.filter((p: any) => p.activo).map((p: any) => {
              const pct = p.cuotas > 0 ? (p.cuotas_cobradas / p.cuotas) * 100 : 0;
              return (
                <li key={p.id} className="border-3 border-ink rounded-md bg-white p-2">
                  <div className="flex items-center justify-between text-xs font-bold gap-1 flex-wrap">
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

      <p className="text-xs"><Link href="/" className="underline font-bold">← Volver al inicio</Link></p>
    </>
  );
}

async function VistaAnio({ yearAnio, loans }: { yearAnio: number; loans: any[] }) {
  const resumenAnio = await getResumenAnio(yearAnio);

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <Link href={`/alex?v=ano&y=${yearAnio - 1}`} className="border-3 border-ink bg-white shadow-brutSm rounded-md px-3 py-1 font-black">←</Link>
        <Badge tone="lemon">Año {yearAnio}</Badge>
        <Link href={`/alex?v=ano&y=${yearAnio + 1}`} className="border-3 border-ink bg-white shadow-brutSm rounded-md px-3 py-1 font-black">→</Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="border-3 border-ink rounded-md p-2 text-center bg-mint">
          <p className="text-[10px] font-bold uppercase">Sueldo año</p>
          <p className="text-lg font-black">{formatUSD(resumenAnio.totalPagadoAnio)}</p>
        </div>
        <div className="border-3 border-ink rounded-md p-2 text-center bg-lemon">
          <p className="text-[10px] font-bold uppercase">Esperado</p>
          <p className="text-lg font-black">{formatUSD(resumenAnio.totalEsperadoAnio)}</p>
        </div>
        <div className="border-3 border-ink rounded-md p-2 text-center bg-lilac">
          <p className="text-[10px] font-bold uppercase">Extras año</p>
          <p className="text-lg font-black">{formatUSD(resumenAnio.totalExtrasAnio)}</p>
        </div>
        <div className="border-3 border-ink rounded-md p-2 text-center bg-sky">
          <p className="text-[10px] font-bold uppercase">Promedio/mes</p>
          <p className="text-lg font-black">{formatUSD(resumenAnio.totalPagadoAnio / 12)}</p>
        </div>
      </div>
      <Card tone="white" className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg border-b-3 border-ink">
            <tr>
              <th className="px-2 py-1 text-left font-black uppercase">Mes</th>
              <th className="px-2 py-1 text-right font-black uppercase">Pagado</th>
              <th className="px-2 py-1 text-right font-black uppercase">Falta</th>
              <th className="px-2 py-1 text-right font-black uppercase">Extras</th>
              <th className="px-2 py-1 text-center font-black uppercase">Movs</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {resumenAnio.meses.map((r) => {
              const reales = r.movimientos.filter((m) => !m.planeado).length;
              return (
                <tr key={r.mes} className="border-b border-ink/30">
                  <td className="px-2 py-1 font-bold uppercase">{MESES[r.mes - 1].slice(0, 3)}</td>
                  <td className="px-2 py-1 text-right tabular-nums font-bold">{r.totalPagado > 0 ? formatUSD(r.totalPagado) : '—'}</td>
                  <td className={`px-2 py-1 text-right tabular-nums font-bold ${r.totalPagado === 0 ? 'text-ink/30' : r.falta === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {r.totalPagado === 0 ? '—' : r.falta === 0 ? '✓' : formatUSD(r.falta)}
                  </td>
                  <td className={`px-2 py-1 text-right tabular-nums font-bold ${r.totalExtras > 0 ? '' : 'text-ink/30'}`}>{r.totalExtras > 0 ? formatUSD(r.totalExtras) : '—'}</td>
                  <td className="px-2 py-1 text-center text-ink/70">{reales || '—'}</td>
                  <td className="px-2 py-1 text-center">
                    <Link href={`/alex?ym=${ymStr(r.anio, r.mes)}`} className="border-2 border-ink bg-white px-1 text-[10px] font-bold hover:bg-lemon">Ver</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-3 border-ink bg-bg">
            <tr>
              <td className="px-2 py-1 font-black uppercase">Total</td>
              <td className="px-2 py-1 text-right tabular-nums font-black">{formatUSD(resumenAnio.totalPagadoAnio)}</td>
              <td className="px-2 py-1 text-right tabular-nums font-black">{formatUSD(Math.max(0, resumenAnio.totalEsperadoAnio - resumenAnio.totalPagadoAnio))}</td>
              <td className="px-2 py-1 text-right tabular-nums font-black">{formatUSD(resumenAnio.totalExtrasAnio)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </Card>
      <Card tone="bubble" className="p-4">
        <h2 className="font-black text-sm uppercase mb-2">💰 Préstamos activos</h2>
        {loans.filter((p: any) => p.activo).length === 0 ? (
          <p className="text-xs">Sin préstamos activos.</p>
        ) : (
          <ul className="space-y-2">
            {loans.filter((p: any) => p.activo).map((p: any) => (
              <li key={p.id} className="border-3 border-ink rounded-md bg-white p-2 text-xs">
                <div className="flex items-center justify-between font-bold gap-1 flex-wrap">
                  <span>{formatUSD(Number(p.monto))} · {p.cuotas_cobradas}/{p.cuotas} cuotas</span>
                  <Badge tone={Number(p.saldo_actual) > 0 ? 'peach' : 'mint'}>saldo {formatUSD(Number(p.saldo_actual))}</Badge>
                </div>
                {p.descripcion && <p className="text-[10px] mt-1">{p.descripcion}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs"><Link href="/" className="underline font-bold">← Volver al inicio</Link></p>
    </>
  );
}
