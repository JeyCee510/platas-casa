'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatUSD } from '@/lib/format';

type Props = {
  accountId: number;
  accountName: string;
  saldoApp: number;
};

// Último día del mes ANTERIOR en TZ Ecuador (formato YYYY-MM-DD).
function ultimoDiaMesPasado(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const hoy = new Date();
  // primer día del mes actual menos 1 día = último día del mes pasado
  const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimo = new Date(primerDiaMesActual.getTime() - 86400000);
  return fmt.format(ultimo);
}

export function AdjustClose({ accountId, accountName, saldoApp }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saldoReal, setSaldoReal] = useState('');
  const [fecha, setFecha] = useState(ultimoDiaMesPasado());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const real = Number(saldoReal) || 0;
  const diff = +(saldoApp - real).toFixed(2);
  // diff > 0: la app tenía más que el banco → registramos GASTO de diff
  // diff < 0: la app tenía menos que el banco → registramos INGRESO de |diff|
  const tipoMovimiento = diff > 0 ? 'gasto' : diff < 0 ? 'ingreso' : 'ninguno';

  async function save() {
    if (!saldoReal || diff === 0) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sesión expirada'); setSaving(false); return; }

    if (diff > 0) {
      // GASTO de ajuste — usa categoría 'ajuste-indeterminado'
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'ajuste-indeterminado').maybeSingle();
      const { error: eErr } = await supabase.from('expenses').insert({
        created_by: user.id,
        amount: diff,
        currency: 'USD',
        description: `Ajuste indeterminado al cierre de ${fecha}`,
        category_id: cat?.id ?? null,
        account_id: accountId,
        spent_at: fecha,
        source: 'ajuste',
        needs_review: false,
        is_deferred: false,
        bank_commission: 0,
      });
      if (eErr) { setError(eErr.message); setSaving(false); return; }
    } else {
      // INGRESO de ajuste — source 'otros'
      const { error: iErr } = await supabase.from('incomes').insert({
        created_by: user.id,
        amount: Math.abs(diff),
        source: 'otros',
        description: `Ajuste indeterminado al cierre de ${fecha}`,
        account_id: accountId,
        received_at: fecha,
      });
      if (iErr) { setError(iErr.message); setSaving(false); return; }
    }

    setSaving(false);
    setOpen(false);
    setSaldoReal('');
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-1 border-3 border-ink rounded-md bg-lemon shadow-brutSm text-[11px] font-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        title="Conciliar saldo con el banco"
      >⚖️ Ajustar</button>
    );
  }

  return (
    <Card tone="lemon" className="p-3 space-y-2 col-span-full">
      <p className="text-xs font-black uppercase">⚖️ Ajustar al cierre · {accountName}</p>
      <p className="text-[11px]">
        Ingresa el saldo real del banco al fin del mes pasado. La app crea el movimiento de ajuste por la diferencia.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label htmlFor="real">Saldo real (USD)</Label>
          <Input
            id="real"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={saldoReal}
            onChange={(e) => setSaldoReal(e.target.value.replace(',', '.'))}
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="fecha-aj">Fecha del cierre</Label>
          <Input
            id="fecha-aj"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>
      {saldoReal && (
        <div className="border-3 border-ink rounded-md bg-white p-2 text-[11px] space-y-0.5">
          <div className="flex justify-between"><span>Saldo en app:</span><span className="font-black tabular-nums">{formatUSD(saldoApp)}</span></div>
          <div className="flex justify-between"><span>Saldo real:</span><span className="font-black tabular-nums">{formatUSD(real)}</span></div>
          <div className="flex justify-between border-t border-ink/30 pt-1 mt-1">
            <span className="font-bold">Ajuste:</span>
            <span className={`font-black tabular-nums ${diff > 0 ? 'text-red-700' : diff < 0 ? 'text-green-700' : ''}`}>
              {diff > 0 ? `−${formatUSD(diff)} (gasto)` : diff < 0 ? `+${formatUSD(-diff)} (ingreso)` : '$0.00'}
            </span>
          </div>
        </div>
      )}
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !saldoReal || diff === 0} variant="primary">
          {saving ? 'Creando…' : tipoMovimiento === 'ninguno' ? 'Sin diferencia' : `💾 Crear ${tipoMovimiento}`}
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); setSaldoReal(''); setError(null); }}>Cancelar</Button>
      </div>
    </Card>
  );
}
