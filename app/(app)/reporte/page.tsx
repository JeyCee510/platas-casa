import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, monthLabel } from '@/lib/format';
import { CategoryChart } from '@/components/CategoryChart';

export const dynamic = 'force-dynamic';

export default async function ReportePage() {
  const supabase = createClient();
  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.from('expenses').select('amount, category_id, spent_at').gte('spent_at', sixMonthsAgo.toISOString().slice(0, 10)),
    supabase.from('categories').select('*').order('id'),
  ]);

  const catMap = new Map((categories ?? []).map((c: any) => [c.id, c]));

  // Agrupar por mes
  const byMonth: Record<string, { total: number; n: number }> = {};
  // Agrupar por categoría (total 6m)
  const byCat: Record<number, number> = {};

  (rows ?? []).forEach((r: any) => {
    const d = new Date(r.spent_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { total: 0, n: 0 };
    byMonth[key].total += Number(r.amount);
    byMonth[key].n++;
    const cid = r.category_id ?? 0;
    byCat[cid] = (byCat[cid] ?? 0) + Number(r.amount);
  });

  const monthsSorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const catData = Object.entries(byCat)
    .map(([id, total]) => {
      const c: any = catMap.get(Number(id));
      return { name: c ? `${c.emoji} ${c.name}` : 'Sin cat.', value: total };
    })
    .sort((a, b) => b.value - a.value);

  const grandTotal = (rows ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
  const avgMonth = monthsSorted.length > 0 ? grandTotal / monthsSorted.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Reporte últimos 6 meses</h1>
        <p className="text-sm">Total: {formatUSD(grandTotal)} · Promedio mensual: {formatUSD(avgMonth)}</p>
      </div>

      <Card tone="white" className="p-5">
        <h2 className="font-black text-lg mb-3">Total por mes</h2>
        {monthsSorted.length === 0 ? (
          <p className="text-sm">Sin datos.</p>
        ) : (
          <ul className="space-y-2">
            {monthsSorted.map(([k, v]) => {
              const max = Math.max(...monthsSorted.map(([, x]) => x.total));
              const w = max > 0 ? (v.total / max) * 100 : 0;
              const [y, m] = k.split('-');
              const label = monthLabel(new Date(Number(y), Number(m) - 1, 1));
              return (
                <li key={k} className="flex items-center gap-3">
                  <span className="w-32 font-bold text-sm capitalize">{label}</span>
                  <div className="flex-1 h-7 bg-bg border-3 border-ink rounded-md overflow-hidden">
                    <div className="h-full bg-sky border-r-3 border-ink" style={{ width: `${w}%` }} />
                  </div>
                  <span className="font-black w-28 text-right">{formatUSD(v.total)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card tone="white" className="p-5">
        <h2 className="font-black text-lg mb-3">Por categoría (6 meses)</h2>
        {catData.length === 0 ? <p className="text-sm">Sin datos.</p> : <CategoryChart data={catData} />}
        <div className="flex flex-wrap gap-2 mt-4">
          {catData.map((c) => (
            <Badge key={c.name} tone="sky">{c.name}: {formatUSD(c.value)}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
