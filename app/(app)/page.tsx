import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate, monthLabel } from '@/lib/format';
import { userShortName } from '@/lib/userName';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const [
    { data: monthExpenses },
    { data: prevExpenses },
    { data: categories },
    { data: recent },
    { data: accounts },
  ] = await Promise.all([
    supabase.from('expenses').select('amount, category_id, spent_at').gte('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('expenses').select('amount').gte('spent_at', startOfPrevMonth.toISOString().slice(0, 10)).lt('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('categories').select('*').order('id'),
    supabase.from('expenses').select('id, amount, description, spent_at, category_id, source').order('spent_at', { ascending: false }).order('id', { ascending: false }).limit(4),
    supabase.from('accounts').select('id, type, name, balance, due_date').order('type').order('name'),
  ]);

  const totalMonth = (monthExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const totalPrev = (prevExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const diff = totalPrev > 0 ? ((totalMonth - totalPrev) / totalPrev) * 100 : 0;
  const count = (monthExpenses ?? []).length;

  const catsMap = new Map((categories ?? []).map((c: any) => [c.id, c]));
  const cards = (accounts ?? []).filter((a: any) => a.type === 'credit_card');
  const banks = (accounts ?? []).filter((a: any) => a.type === 'bank_account');
  const totalDeuda = cards.reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalDisp = banks.reduce((s: number, a: any) => s + Number(a.balance), 0);

  // Top 3 categorías del mes
  const byCat: Record<number, number> = {};
  (monthExpenses ?? []).forEach((e: any) => {
    const k = e.category_id ?? 0;
    byCat[k] = (byCat[k] ?? 0) + Number(e.amount);
  });
  const topCats = Object.entries(byCat)
    .map(([id, total]) => {
      const c: any = catsMap.get(Number(id));
      return { c, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const greeting = userShortName(user) ? `Hola, ${userShortName(user)}` : 'Hola';

  return (
    <div className="space-y-5">
      {/* Saludo y mes */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">{monthLabel(today)}</p>
        <h1 className="text-2xl sm:text-3xl font-black leading-tight">{greeting} 👋</h1>
      </div>

      {/* CTAs primarias gigantes */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/agregar?source=foto"
          className="border-3 border-ink rounded-xl bg-sky shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span className="text-3xl mb-0.5">📸</span>
          <span className="font-black text-sm leading-tight">Foto</span>
          <span className="text-[9px] font-bold mt-1 uppercase">IA lee boleta</span>
        </Link>
        <Link
          href="/agregar/voz"
          className="border-3 border-ink rounded-xl bg-bubble shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span className="text-3xl mb-0.5">🎤</span>
          <span className="font-black text-sm leading-tight">Voz</span>
          <span className="text-[9px] font-bold mt-1 uppercase">Habla, IA registra</span>
        </Link>
        <Link
          href="/agregar?source=manual"
          className="border-3 border-ink rounded-xl bg-lemon shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span className="text-3xl mb-0.5">✏️</span>
          <span className="font-black text-sm leading-tight">Manual</span>
          <span className="text-[9px] font-bold mt-1 uppercase">Form rápido</span>
        </Link>
      </div>

      {/* KPIs del mes — compactos */}
      <Card tone="white" className="p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] font-bold uppercase">Mes</p>
            <p className="text-xl font-black leading-tight">{formatUSD(totalMonth)}</p>
            {diff !== 0 && (
              <p className="text-[10px] font-bold mt-0.5">{diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%</p>
            )}
          </div>
          <div className="border-x-3 border-ink">
            <p className="text-[10px] font-bold uppercase">Gastos</p>
            <p className="text-xl font-black leading-tight">{count}</p>
            <p className="text-[10px] font-bold mt-0.5">registrados</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase">Promedio</p>
            <p className="text-xl font-black leading-tight">{count > 0 ? formatUSD(totalMonth / count) : '$0'}</p>
            <p className="text-[10px] font-bold mt-0.5">por gasto</p>
          </div>
        </div>
      </Card>

      {/* Top categorías compactas */}
      {topCats.length > 0 && (
        <Card tone="white" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-sm uppercase">Top categorías</h2>
            <Link href="/reporte" className="text-xs underline font-bold">Ver más →</Link>
          </div>
          <ul className="space-y-1.5">
            {topCats.map(({ c, total }) => (
              <li key={c?.id ?? 'none'} className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold flex-1 truncate">
                  {c ? `${c.emoji} ${c.name}` : 'Sin cat.'}
                </span>
                <Badge tone={(c?.color as any) ?? 'sky'}>{formatUSD(total)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Últimos gastos compactos */}
      {recent && recent.length > 0 && (
        <Card tone="lemon" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-sm uppercase">Últimos</h2>
            <Link href="/lista" className="text-xs underline font-bold">Todos →</Link>
          </div>
          <ul className="divide-y-3 divide-ink">
            {recent.map((e: any) => {
              const c: any = catsMap.get(e.category_id);
              return (
                <li key={e.id} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{e.description ?? 'Gasto'}</p>
                    <p className="text-[10px]">{formatDate(e.spent_at)} {c && `· ${c.emoji}`}{e.source === 'photo' && ' · 📸'}</p>
                  </div>
                  <span className="font-black text-sm whitespace-nowrap">{formatUSD(Number(e.amount))}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Cuentas resumen */}
      <Card tone="white" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-sm uppercase">Cuentas</h2>
          <Link href="/cuentas" className="text-xs underline font-bold">Editar →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="border-3 border-ink rounded-md bg-peach p-2 text-center">
            <p className="text-[9px] font-bold uppercase">Deuda tarjetas</p>
            <p className="text-lg font-black">{formatUSD(totalDeuda)}</p>
          </div>
          <div className="border-3 border-ink rounded-md bg-mint p-2 text-center">
            <p className="text-[9px] font-bold uppercase">Disponible</p>
            <p className="text-lg font-black">{formatUSD(totalDisp)}</p>
          </div>
        </div>
        <ul className="text-xs space-y-1">
          {(accounts ?? []).map((a: any) => (
            <li key={a.id} className="flex justify-between">
              <span className="font-bold">{a.type === 'credit_card' ? '💳' : '🏦'} {a.name}</span>
              <span className="font-black">{formatUSD(Number(a.balance))}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
