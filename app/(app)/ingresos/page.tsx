import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate, monthLabel } from '@/lib/format';
import { listIncomes, totalIncomesMes, eliminarIngreso } from '@/lib/incomes';
import { SOURCE_LABEL, SOURCE_EMOJI } from '@/lib/incomes-shared';
import { AddIncomeForm } from './AddIncomeForm';
import { EditIncome } from './EditIncome';

export const dynamic = 'force-dynamic';

async function getAccounts() {
  const supabase = createClient();
  const { data } = await supabase.from('accounts').select('id, type, name').order('type').order('name');
  return data ?? [];
}

export default async function IngresosPage() {
  await createClient().auth.getUser();
  const today = new Date();
  const [items, totalMes, accounts] = await Promise.all([
    listIncomes(),
    totalIncomesMes(today.getUTCFullYear(), today.getUTCMonth() + 1),
    getAccounts(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">{monthLabel(today)}</p>
        <h1 className="text-2xl font-black">Ingresos del hogar</h1>
      </div>

      <Card tone="mint" className="p-4">
        <p className="text-xs font-bold uppercase">Total recibido este mes</p>
        <p className="text-4xl font-black">{formatUSD(totalMes.total ?? 0)}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="border-3 border-ink rounded-md bg-white p-1.5">
            <p className="text-[10px] font-bold">👩 AC</p>
            <p className="text-sm font-black">{formatUSD(totalMes.aporte_ac ?? 0)}</p>
          </div>
          <div className="border-3 border-ink rounded-md bg-white p-1.5">
            <p className="text-[10px] font-bold">👨 JC</p>
            <p className="text-sm font-black">{formatUSD(totalMes.aporte_jc ?? 0)}</p>
          </div>
          <div className="border-3 border-ink rounded-md bg-white p-1.5">
            <p className="text-[10px] font-bold">💵 Otros</p>
            <p className="text-sm font-black">{formatUSD(totalMes.otros ?? 0)}</p>
          </div>
        </div>
      </Card>

      <AddIncomeForm accounts={accounts} />

      <Card tone="white" className="overflow-hidden">
        <div className="bg-bg border-b-3 border-ink px-3 py-1.5">
          <p className="text-xs font-black uppercase">Últimos ingresos</p>
        </div>
        {items.length === 0 ? (
          <p className="p-4 text-xs text-center font-bold">Sin ingresos registrados aún.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {items.map((i: any) => (
              <li key={i.id} className="p-3 flex items-center justify-between gap-2">
                <Badge tone={i.source === 'aporte_ac' ? 'bubble' : i.source === 'aporte_jc' ? 'sky' : 'lemon'}>
                  {SOURCE_EMOJI[i.source as keyof typeof SOURCE_EMOJI]} {SOURCE_LABEL[i.source as keyof typeof SOURCE_LABEL]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{i.description ?? '—'}</p>
                  <p className="text-[10px]">{formatDate(i.received_at)}</p>
                </div>
                <span className="font-black text-sm">{formatUSD(Number(i.amount))}</span>
                <EditIncome income={i as any} accounts={accounts as any} />
                <form action={eliminarIngreso}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs"><Link href="/" className="underline font-bold">← Volver al inicio</Link></p>
    </div>
  );
}
