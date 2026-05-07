import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate, monthLabel } from '@/lib/format';
import { CategoryChart } from '@/components/CategoryChart';
import { userShortName } from '@/lib/userName';
import { AccountsSummary } from '@/components/AccountsSummary';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const [{ data: monthExpenses }, { data: prevExpenses }, { data: categories }, { data: recent }, { data: accounts }] = await Promise.all([
    supabase.from('expenses').select('amount, category_id, spent_at').gte('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('expenses').select('amount').gte('spent_at', startOfPrevMonth.toISOString().slice(0, 10)).lt('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('categories').select('*').order('id'),
    supabase.from('expenses').select('id, amount, description, spent_at, category_id, source').order('spent_at', { ascending: false }).order('id', { ascending: false }).limit(5),
    supabase.from('accounts').select('id, type, name, balance, due_date').order('type').order('name'),
  ]);

  const totalMonth = (monthExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const totalPrev = (prevExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const diff = totalPrev > 0 ? ((totalMonth - totalPrev) / totalPrev) * 100 : 0;
  const count = (monthExpenses ?? []).length;

  const byCat: Record<number, number> = {};
  (monthExpenses ?? []).forEach((e: any) => {
    const k = e.category_id ?? 0;
    byCat[k] = (byCat[k] ?? 0) + Number(e.amount);
  });

  const catsMap = new Map((categories ?? []).map((c: any) => [c.id, c]));
  const chartData = Object.entries(byCat)
    .map(([id, total]) => {
      const c: any = catsMap.get(Number(id));
      return { name: c ? `${c.emoji ?? ''} ${c.name}` : 'Sin categoría', value: total };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">{monthLabel(today)}</p>
          <h1 className="text-3xl sm:text-4xl font-black">Hola{userShortName(user) ? `, ${userShortName(user)}` : ''} 👋</h1>
          <p className="text-sm">Resumen del mes</p>
        </div>
        <div className="flex gap-2">
          <Link href="/agregar" className="border-3 border-ink bg-sky shadow-brutSm rounded-md px-4 py-2 font-bold hover:translate-x-[1px] hover:translate-y-[1px]">+ Agregar gasto</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card tone="sky" className="p-5">
          <p className="text-sm font-bold uppercase">Total del mes</p>
          <p className="text-4xl font-black mt-2">{formatUSD(totalMonth)}</p>
          <p className="text-xs mt-2 font-bold">{diff === 0 ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs mes pasado`}</p>
        </Card>
        <Card tone="mint" className="p-5">
          <p className="text-sm font-bold uppercase">Gastos registrados</p>
          <p className="text-4xl font-black mt-2">{count}</p>
          <p className="text-xs mt-2 font-bold">este mes</p>
        </Card>
        <Card tone="peach" className="p-5">
          <p className="text-sm font-bold uppercase">Promedio por gasto</p>
          <p className="text-4xl font-black mt-2">{count > 0 ? formatUSD(totalMonth / count) : formatUSD(0)}</p>
          <p className="text-xs mt-2 font-bold">USD por movimiento</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card tone="white" className="p-5 lg:col-span-2">
          <h2 className="font-black text-lg mb-3">Por categoría</h2>
          {chartData.length === 0 ? (
            <p className="text-sm">Aún no hay gastos este mes. <Link href="/agregar" className="underline font-bold">Agrega uno</Link>.</p>
          ) : (
            <CategoryChart data={chartData} />
          )}
        </Card>

        <Card tone="lemon" className="p-5">
          <h2 className="font-black text-lg mb-3">Últimos gastos</h2>
          {(!recent || recent.length === 0) ? (
            <p className="text-sm">Sin movimientos.</p>
          ) : (
            <ul className="divide-y-3 divide-ink">
              {recent.map((e: any) => {
                const c: any = catsMap.get(e.category_id);
                return (
                  <li key={e.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{e.description ?? 'Gasto'}</p>
                      <p className="text-xs">{formatDate(e.spent_at)} {c && `· ${c.emoji} ${c.name}`}</p>
                    </div>
                    <Badge tone={(c?.color as any) ?? 'sky'}>{formatUSD(Number(e.amount))}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/lista" className="mt-3 inline-block underline font-bold text-sm">Ver todos →</Link>
        </Card>
      </div>

      <AccountsSummary accounts={accounts ?? []} />
    </div>
  );
}
