import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate, monthLabel, fullDateLabel } from '@/lib/format';
import { userShortName } from '@/lib/userName';
import { hasFullView } from '@/lib/role';
import { totalIncomesMes } from '@/lib/incomes';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullView = hasFullView(user);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const greeting = userShortName(user) ? `Hola, ${userShortName(user)}` : 'Hola';

  // Vista LIMITED: solo CTAs grandes y total general del mes, sin detalle
  if (!fullView) {
    const { data: monthExpenses } = await supabase
      .from('expenses').select('amount').gte('spent_at', startOfMonth.toISOString().slice(0, 10));
    const totalMonth = (monthExpenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
    const count = (monthExpenses ?? []).length;

    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-ink/70">{fullDateLabel(today)}</p>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">{greeting} 👋</h1>
        </div>

        {/* CTAs primarias gigantes */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/agregar?source=foto" className="border-3 border-ink rounded-xl bg-sky shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <span className="text-3xl mb-0.5">📸</span>
            <span className="font-black text-sm leading-tight">Foto</span>
            <span className="text-[9px] font-bold mt-1 uppercase">IA lee boleta</span>
          </Link>
          <Link href="/agregar/voz" className="border-3 border-ink rounded-xl bg-bubble shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <span className="text-3xl mb-0.5">🎤</span>
            <span className="font-black text-sm leading-tight">Voz</span>
            <span className="text-[9px] font-bold mt-1 uppercase">Habla, IA registra</span>
          </Link>
          <Link href="/agregar?source=manual" className="border-3 border-ink rounded-xl bg-lemon shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <span className="text-3xl mb-0.5">✏️</span>
            <span className="font-black text-sm leading-tight">Manual</span>
            <span className="text-[9px] font-bold mt-1 uppercase">Form rápido</span>
          </Link>
        </div>

        <Card tone="white" className="p-5 text-center">
          <p className="text-xs font-bold uppercase">Gastos del mes</p>
          <p className="text-4xl font-black mt-2">{formatUSD(totalMonth)}</p>
          <p className="text-xs font-bold mt-1">{count} registrados</p>
        </Card>

        <p className="text-xs text-center font-bold opacity-70">
          Modo familiar simplificado. Para detalle de cuentas y reportes, pídele a Juan acceso.
        </p>
      </div>
    );
  }

  // Vista FULL VIEW (admin / full / readonly)
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [
    { data: monthExpenses },
    { data: prevExpenses },
    { data: categories },
    { data: recent },
    { data: accounts },
    incomesMes,
  ] = await Promise.all([
    supabase.from('expenses').select('amount, category_id, spent_at').gte('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('expenses').select('amount').gte('spent_at', startOfPrevMonth.toISOString().slice(0, 10)).lt('spent_at', startOfMonth.toISOString().slice(0, 10)),
    supabase.from('categories').select('*').order('ord'),
    supabase.from('expenses').select('id, amount, description, spent_at, category_id, source, needs_review, is_deferred').order('spent_at', { ascending: false }).order('id', { ascending: false }).limit(4),
    supabase.from('accounts').select('id, type, name, balance, due_date').order('type').order('name'),
    totalIncomesMes(today.getFullYear(), today.getMonth() + 1),
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

  // Top 3 grupos del mes (por parent_id)
  const byGroup: Record<number, number> = {};
  (monthExpenses ?? []).forEach((e: any) => {
    const cat: any = catsMap.get(e.category_id);
    const groupId = cat?.parent_id ?? cat?.id ?? 0;
    byGroup[groupId] = (byGroup[groupId] ?? 0) + Number(e.amount);
  });
  const topGroups = Object.entries(byGroup)
    .map(([id, total]) => {
      const c: any = catsMap.get(Number(id));
      return { c, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">{monthLabel(today)}</p>
        <h1 className="text-2xl sm:text-3xl font-black leading-tight">{greeting} 👋</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/agregar?source=foto" className="border-3 border-ink rounded-xl bg-sky shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          <span className="text-3xl mb-0.5">📸</span>
          <span className="font-black text-sm leading-tight">Foto</span>
          <span className="text-[9px] font-bold mt-1 uppercase">IA lee boleta</span>
        </Link>
        <Link href="/agregar/voz" className="border-3 border-ink rounded-xl bg-bubble shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          <span className="text-3xl mb-0.5">🎤</span>
          <span className="font-black text-sm leading-tight">Voz</span>
          <span className="text-[9px] font-bold mt-1 uppercase">Habla, IA registra</span>
        </Link>
        <Link href="/agregar?source=manual" className="border-3 border-ink rounded-xl bg-lemon shadow-brut p-3 flex flex-col items-center justify-center text-center min-h-[110px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          <span className="text-3xl mb-0.5">✏️</span>
          <span className="font-black text-sm leading-tight">Manual</span>
          <span className="text-[9px] font-bold mt-1 uppercase">Form rápido</span>
        </Link>
      </div>

      {/* CTAs secundarios: ingreso + transferir */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/ingresos" className="border-3 border-ink rounded-md bg-mint shadow-brutSm p-2.5 flex items-center justify-center gap-2 font-black text-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
          💰 Ingreso
        </Link>
        <Link href="/transferir" className="border-3 border-ink rounded-md bg-teal shadow-brutSm p-2.5 flex items-center justify-center gap-2 font-black text-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
          💳 Pagar tarjeta
        </Link>
      </div>

      {/* Balance del mes: ingresos vs gastos */}
      <Card tone="white" className="p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase">Ingresos</p>
            <p className="text-sm sm:text-base font-black leading-tight text-green-700 tabular-nums whitespace-nowrap">{formatUSD(incomesMes.total ?? 0)}</p>
            <Link href="/ingresos" className="text-[10px] font-bold underline mt-0.5 inline-block">Detalle →</Link>
          </div>
          <div className="min-w-0 border-x-3 border-ink px-1">
            <p className="text-[10px] font-bold uppercase">Gastos</p>
            <p className="text-sm sm:text-base font-black leading-tight text-red-700 tabular-nums whitespace-nowrap">−{formatUSD(totalMonth)}</p>
            <p className="text-[10px] font-bold mt-0.5">{count} mov</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase">Balance</p>
            <p className={`text-sm sm:text-base font-black leading-tight tabular-nums whitespace-nowrap ${(incomesMes.total ?? 0) - totalMonth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatUSD((incomesMes.total ?? 0) - totalMonth)}
            </p>
            <p className="text-[10px] font-bold mt-0.5">del mes</p>
          </div>
        </div>
      </Card>

      {topGroups.length > 0 && (
        <Card tone="white" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-sm uppercase">Top grupos</h2>
            <Link href="/reporte" className="text-xs underline font-bold">Ver más →</Link>
          </div>
          <ul className="space-y-1.5">
            {topGroups.map(({ c, total }) => (
              <li key={c?.id ?? 'none'} className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold flex-1 truncate">{c ? `${c.emoji} ${c.name}` : 'Sin grupo'}</span>
                <Badge tone={(c?.color as any) ?? 'sky'}>{formatUSD(total)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {recent && recent.length > 0 && (
        <Card tone="lemon" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-sm uppercase">Últimos</h2>
            <Link href="/lista" className="text-xs underline font-bold">Todos →</Link>
          </div>
          <ul className="divide-y-3 divide-ink">
            {recent.map((e: any) => {
              const c: any = catsMap.get(e.category_id);
              const sourceEmoji = e.source === 'photo' ? '📸' : e.source === 'voice' ? '🎤' : '';
              return (
                <li key={e.id} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">
                      {e.needs_review && '🔍 '}{e.is_deferred && '💳 '}{e.description ?? 'Gasto'}
                    </p>
                    <p className="text-[10px]">{formatDate(e.spent_at)} {c && `· ${c.emoji}`}{sourceEmoji && ` · ${sourceEmoji}`}</p>
                  </div>
                  <span className="font-black text-sm whitespace-nowrap">{formatUSD(Number(e.amount))}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

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
