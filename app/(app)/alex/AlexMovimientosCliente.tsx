'use client';
import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ComprobanteButton } from './ComprobanteButton';
import { eliminarMovimiento, confirmarMovimientoPlaneado } from '@/lib/alex';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type Mov = {
  id: number;
  concepto_nombre: string;
  fecha: string;
  monto: number;
  cantidad: number | null;
  nota: string | null;
  planeado: boolean;
  es_extra: boolean;
  comprobante: string | null;
};

type Loan = {
  id: number;
  monto: number | string;
  cuotas: number;
  cuota_size: number | string;
  cuotas_cobradas: number;
  saldo_actual: number | string;
  activo: boolean;
};

function fmtFecha(s: string) {
  const d = new Date(s);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fmtUSD(n: number) {
  return '$' + Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AlexMovimientosCliente({
  realesSueldo, realesExtras, planeados, loans,
  mes, anio, totalPagado, totalExtras, totalEsperado, falta, saldoPrestamos,
}: {
  realesSueldo: Mov[]; realesExtras: Mov[]; planeados: Mov[]; loans: Loan[];
  mes: number; anio: number;
  totalPagado: number; totalExtras: number; totalEsperado: number; falta: number; saldoPrestamos: number;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [shareMode, setShareMode] = useState<'mes' | 'sel' | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allReales = [...realesSueldo, ...realesExtras];
  const selectedMovs = allReales.filter((m) => selected.has(m.id));
  const allMovsForMes = [...realesSueldo, ...realesExtras]; // sólo reales, no planeados

  async function compartir(mode: 'mes' | 'sel') {
    setShareMode(mode);
    setGenerating(true);
    // Esperar al render del sheet oculto
    await new Promise((r) => setTimeout(r, 100));
    const node = sheetRef.current;
    if (!node) { setGenerating(false); setShareMode(null); return; }
    try {
      const dataUrl = await toPng(node, { quality: 0.95, pixelRatio: 2, backgroundColor: '#E8F1FF' });
      const blob = await (await fetch(dataUrl)).blob();
      const filename = `platas-alex-${anio}-${String(mes).padStart(2, '0')}${mode === 'sel' ? '-sel' : ''}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Try Web Share API with file
      if (typeof navigator.share === 'function' && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Platas Alex · ${MESES[mes - 1]} ${anio}`,
          text: `Resumen Platas Alex — ${MESES[mes - 1]} ${anio}`,
        });
      } else {
        // Fallback: descargar + abrir wa.me
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
        await new Promise((r) => setTimeout(r, 500));
        window.open('https://wa.me/?text=' + encodeURIComponent(`Adjunto resumen Platas Alex — ${MESES[mes - 1]} ${anio}`), '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') alert('Error generando imagen: ' + (err?.message ?? err));
    } finally {
      setGenerating(false);
      setShareMode(null);
    }
  }

  const movsParaSheet = shareMode === 'sel' ? selectedMovs : allMovsForMes;
  const sheetSueldo = movsParaSheet.filter((m) => !m.es_extra);
  const sheetExtras = movsParaSheet.filter((m) => m.es_extra);
  const sheetTotalSueldo = sheetSueldo.reduce((s, m) => s + Number(m.monto), 0);
  const sheetTotalExtras = sheetExtras.reduce((s, m) => s + Number(m.monto), 0);

  function renderItem(m: Mov) {
    const checked = selected.has(m.id);
    return (
      <li key={m.id} className="p-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggle(m.id)}
          className={`w-5 h-5 border-3 border-ink rounded flex-shrink-0 ${checked ? 'bg-lemon' : 'bg-white'}`}
          aria-label={checked ? 'Deseleccionar' : 'Seleccionar'}
        >{checked ? '✓' : ''}</button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{m.concepto_nombre}{m.cantidad ? ` · ${m.cantidad}×` : ''}</p>
          <p className="text-[10px]">{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
        </div>
        <span className="font-black text-sm whitespace-nowrap">{fmtUSD(m.monto)}</span>
        <ComprobanteButton movimientoId={m.id} comprobante={m.comprobante} />
        <form action={eliminarMovimiento}>
          <input type="hidden" name="id" value={m.id} />
          <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
        </form>
      </li>
    );
  }

  return (
    <>
      {/* Botones compartir arriba */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => compartir('mes')} disabled={generating || allMovsForMes.length === 0} variant="secondary">
          📲 Compartir mes
        </Button>
        <Button onClick={() => compartir('sel')} disabled={generating || selected.size === 0}>
          📲 Compartir selección ({selected.size})
        </Button>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} className="text-xs underline font-bold">Limpiar</button>
        )}
      </div>

      {/* Movs sueldo */}
      <Card tone="white" className="overflow-hidden">
        <div className="bg-mint border-b-3 border-ink px-3 py-1.5">
          <p className="text-xs font-black uppercase">Sueldo · {MESES[mes - 1]} {anio}</p>
        </div>
        {realesSueldo.length === 0 ? (
          <p className="p-4 text-xs text-center font-bold">Sin pagos este mes.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">{realesSueldo.map(renderItem)}</ul>
        )}
      </Card>

      {realesExtras.length > 0 && (
        <Card tone="lilac" className="overflow-hidden">
          <div className="bg-lilac border-b-3 border-ink px-3 py-1.5">
            <p className="text-xs font-black uppercase">Extras (no cuentan al sueldo)</p>
          </div>
          <ul className="divide-y-3 divide-ink bg-white">{realesExtras.map(renderItem)}</ul>
        </Card>
      )}

      {planeados.length > 0 && (
        <Card tone="white" className="overflow-hidden">
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
                <span className="font-bold italic text-sm">{fmtUSD(m.monto)}</span>
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

      {/* Hoja oculta para generar imagen */}
      {generating && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <div ref={sheetRef} style={{
            width: 600, padding: 24, background: '#E8F1FF',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            color: '#0A0A0A',
          }}>
            {/* Header */}
            <div style={{ background: '#C9F0D5', border: '3px solid #0A0A0A', borderRadius: 8, padding: 12, marginBottom: 16, boxShadow: '6px 6px 0 0 #0A0A0A' }}>
              <p style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>PLATAS·CASA</p>
              <h2 style={{ fontSize: 28, fontWeight: 900, margin: '4px 0 0 0' }}>
                Pagos a Alex {shareMode === 'sel' ? '(selección)' : ''}
              </h2>
              <p style={{ fontSize: 18, fontWeight: 700, margin: '6px 0 0 0' }}>{MESES[mes - 1]} {anio}</p>
            </div>

            {/* KPIs (solo en modo mes) */}
            {shareMode === 'mes' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                <Kpi label="PAGADO" valor={fmtUSD(totalPagado)} bg="#C9F0D5" />
                <Kpi label="FALTA" valor={fmtUSD(falta)} bg={falta === 0 ? '#C9F0D5' : '#F5C6BA'} />
                <Kpi label="PRÉSTAMOS" valor={fmtUSD(saldoPrestamos)} bg={saldoPrestamos > 0 ? '#F5C2E6' : '#C9F0D5'} />
              </div>
            )}
            {shareMode === 'mes' && (
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', color: '#555', marginBottom: 16 }}>
                Total mensual: {fmtUSD(totalEsperado)}
                {totalExtras > 0 && <> · Extras: {fmtUSD(totalExtras)}</>}
              </p>
            )}

            {/* Movs sueldo */}
            {sheetSueldo.length > 0 && (
              <div style={{ background: 'white', border: '3px solid #0A0A0A', borderRadius: 8, marginBottom: 12, boxShadow: '6px 6px 0 0 #0A0A0A', overflow: 'hidden' }}>
                <div style={{ background: '#C9F0D5', borderBottom: '3px solid #0A0A0A', padding: '6px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Sueldo</p>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {sheetSueldo.map((m, i) => (
                    <li key={m.id} style={{
                      padding: '8px 12px',
                      borderBottom: i < sheetSueldo.length - 1 ? '3px solid #0A0A0A' : 'none',
                      display: 'flex', justifyContent: 'space-between', gap: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{m.concepto_nombre}{m.cantidad ? ` · ${m.cantidad}×` : ''}</p>
                        <p style={{ fontSize: 11, margin: 0 }}>{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{fmtUSD(m.monto)}</span>
                    </li>
                  ))}
                </ul>
                {(shareMode === 'sel' || sheetSueldo.length > 1) && (
                  <div style={{ borderTop: '3px solid #0A0A0A', background: '#FBE8A6', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 14 }}>
                    <span>Total sueldo</span>
                    <span>{fmtUSD(sheetTotalSueldo)}</span>
                  </div>
                )}
              </div>
            )}

            {sheetExtras.length > 0 && (
              <div style={{ background: 'white', border: '3px solid #0A0A0A', borderRadius: 8, marginBottom: 12, boxShadow: '6px 6px 0 0 #0A0A0A', overflow: 'hidden' }}>
                <div style={{ background: '#C7C0F4', borderBottom: '3px solid #0A0A0A', padding: '6px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Extras (no cuentan al sueldo)</p>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {sheetExtras.map((m, i) => (
                    <li key={m.id} style={{
                      padding: '8px 12px',
                      borderBottom: i < sheetExtras.length - 1 ? '3px solid #0A0A0A' : 'none',
                      display: 'flex', justifyContent: 'space-between', gap: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{m.concepto_nombre}{m.cantidad ? ` · ${m.cantidad}×` : ''}</p>
                        <p style={{ fontSize: 11, margin: 0 }}>{fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</p>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{fmtUSD(m.monto)}</span>
                    </li>
                  ))}
                </ul>
                {(shareMode === 'sel' || sheetExtras.length > 1) && (
                  <div style={{ borderTop: '3px solid #0A0A0A', background: '#FBE8A6', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 14 }}>
                    <span>Total extras</span>
                    <span>{fmtUSD(sheetTotalExtras)}</span>
                  </div>
                )}
              </div>
            )}

            {shareMode === 'sel' && sheetTotalSueldo > 0 && sheetTotalExtras > 0 && (
              <div style={{ background: '#FBE8A6', border: '3px solid #0A0A0A', borderRadius: 8, padding: 10, boxShadow: '6px 6px 0 0 #0A0A0A', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16 }}>
                <span>TOTAL</span>
                <span>{fmtUSD(sheetTotalSueldo + sheetTotalExtras)}</span>
              </div>
            )}

            {/* Préstamos activos en modo mes */}
            {shareMode === 'mes' && loans.filter((p) => p.activo).length > 0 && (
              <div style={{ background: '#F5C2E6', border: '3px solid #0A0A0A', borderRadius: 8, padding: 10, marginTop: 12, boxShadow: '6px 6px 0 0 #0A0A0A' }}>
                <p style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 6px 0' }}>💰 Préstamos activos</p>
                {loans.filter((p) => p.activo).map((p) => (
                  <div key={p.id} style={{ background: 'white', border: '3px solid #0A0A0A', borderRadius: 4, padding: 6, fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{fmtUSD(Number(p.monto))} · {p.cuotas_cobradas}/{p.cuotas} cuotas — saldo {fmtUSD(Number(p.saldo_actual))}</span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', color: '#999', marginTop: 16 }}>
              platas-casa.vercel.app · {new Date().toLocaleDateString('es')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ label, valor, bg }: { label: string; valor: string; bg: string }) {
  return (
    <div style={{ background: bg, border: '3px solid #0A0A0A', borderRadius: 6, padding: 8, textAlign: 'center', boxShadow: '4px 4px 0 0 #0A0A0A' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 900, margin: '4px 0 0 0' }}>{valor}</p>
    </div>
  );
}
