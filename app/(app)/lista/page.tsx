import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatUSD, formatDate, monthLabel } from '@/lib/format';
import { hasFullView } from '@/lib/role';
import { DeleteButton } from './DeleteButton';
import { EditExpense } from './EditExpense';

export const dynamic = 'force-dynamic';

type SP = { cat?: string; grp?: string; q?: string; mes?: string; account?: string };

export default async function ListaPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const limited = !hasFullView(user);

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('*').order('ord'),
    supabase.from('accounts').select('id, type, name').order('type').order('name'),
  ]);

  const cats = categories ?? [];
  const accMap = new Map((accounts ?? []).map((a: any) => [a.id, a]));
  const catMap = new Map(cats.map((c: any) => [c.id, c]));
  const groups = cats.filter((c: any) => c.parent_id === null);
  const subsByGroup = new Map<number, any[]>();
  cats.forEach((c: any) => {
    if (c.parent_id) {
      const arr = subsByGroup.get(c.parent_id) ?? [];
      arr.push(c);
      subsByGroup.set(c.parent_id, arr);
    }
  });

  let query = supabase
    .from('expenses')
    .select('id, amount, description, spent_at, category_id, account_id, source, needs_review, is_deferred, bank_commission')
    .order('needs_review', { ascending: false })
    .order('spent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(500);

  // Filtro por subcategoría individual
  if (searchParams.cat) {
    query = query.eq('category_id', Number(searchParams.cat));
  }
  // Filtro por grupo entero (incluye todas sus subs + el grupo mismo)
  if (searchParams.grp) {
    const grpId = Number(searchParams.grp);
    const subs = (subsByGroup.get(grpId) ?? []).map((s: any) => s.id);
    const ids = [grpId, ...subs];
    query = query.in('category_id', ids);
  }
  // Filtro por mes (formato YYYY-MM)
  if (searchParams.mes) {
    const [y, m] = searchParams.mes.split('-').map(Number);
    if (y && m) {
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const endMonth = m === 12 ? 1 : m + 1;
      const endYear = m === 12 ? y + 1 : y;
      const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      query = query.gte('spent_at', start).lt('spent_at', end);
    }
  }
  if (searchParams.account) query = query.eq('account_id', Number(searchParams.account));
  if (searchParams.q) query = query.ilike('description', `%${searchParams.q}%`);
  if (limited && user) query = query.eq('created_by', user.id);

  const { data: expenses } = await query;
  const totalAmount = (expenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
  const totalComm = (expenses ?? []).reduce((s, e: any) => s + Number(e.bank_commission || 0), 0);

  // Opciones de mes: últimos 24 meses
  const today = new Date();
  const mesOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    mesOptions.push({ value, label: monthLabel(d) });
  }

  const hasFilters = !!(searchParams.cat || searchParams.grp || searchParams.q || searchParams.mes || searchParams.account);

  // Si filtro por grupo, mostrar desglose por subcategoría
  let groupBreakdown: { sub: any; total: number; count: number }[] = [];
  if (searchParams.grp && expenses) {
    const bySub = new Map<number, { sub: any; total: number; count: number }>();
    for (const e of expenses) {
      const sub = catMap.get(e.category_id);
      if (!sub) continue;
      const key = sub.id;
      const cur = bySub.get(key) ?? { sub, total: 0, count: 0 };
      cur.total += Number(e.amount);
      cur.count += 1;
      bySub.set(key, cur);
    }
    groupBreakdown = [...bySub.values()].sort((a, b) => b.total - a.total);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Gastos</h1>
          <p className="text-sm">
            {(expenses ?? []).length} resultados · total <span className="font-black">{formatUSD(totalAmount)}</span>
            {totalComm > 0 && <span className="text-xs"> · comisiones {formatUSD(totalComm)}</span>}
          </p>
        </div>
        <Link href="/agregar"><Button variant="primary">+ Agregar</Button></Link>
      </div>

      <Card tone="white" className="p-3 space-y-2">
        <form className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase block mb-0.5">Mes</label>
              <select name="mes" defaultValue={searchParams.mes ?? ''} className="w-full text-xs border-3 border-ink rounded-md px-1.5 py-1 bg-white shadow-brutSm font-bold">
                <option value="">Todos</option>
                {mesOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase block mb-0.5">Grupo</label>
              <select name="grp" defaultValue={searchParams.grp ?? ''} className="w-full text-xs border-3 border-ink rounded-md px-1.5 py-1 bg-white shadow-brutSm font-bold">
                <option value="">Todos</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase block mb-0.5">Subcategoría</label>
              <select name="cat" defaultValue={searchParams.cat ?? ''} className="w-full text-xs border-3 border-ink rounded-md px-1.5 py-1 bg-white shadow-brutSm font-bold">
                <option value="">Todas</option>
                {cats.filter((c: any) => c.parent_id !== null).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase block mb-0.5">Cuenta</label>
              <select name="account" defaultValue={searchParams.account ?? ''} className="w-full text-xs border-3 border-ink rounded-md px-1.5 py-1 bg-white shadow-brutSm font-bold">
                <option value="">Todas</option>
                {(accounts ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.type === 'credit_card' ? '💳' : '🏦'} {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase block mb-0.5">Buscar texto</label>
              <input name="q" defaultValue={searchParams.q ?? ''} placeholder="descripción…" className="w-full text-sm border-3 border-ink rounded-md px-2 py-1 bg-white shadow-brutSm" />
            </div>
            <Button type="submit" variant="secondary">🔎 Aplicar</Button>
            {hasFilters && <Link href="/lista"><Button type="button" variant="ghost">Limpiar</Button></Link>}
          </div>
        </form>
      </Card>

      {groupBreakdown.length > 1 && (
        <Card tone="lemon" className="p-3">
          <p className="text-xs font-black uppercase mb-2">Desglose por subcategoría</p>
          <ul className="space-y-1">
            {groupBreakdown.map((b) => (
              <li key={b.sub.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">{b.sub.emoji} {b.sub.name} <span className="text-[10px] opacity-70">({b.count})</span></span>
                <span className="font-black tabular-nums">{formatUSD(b.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card tone="white" className="overflow-hidden">
        {(!expenses || expenses.length === 0) ? (
          <div className="p-8 text-center">
            <p className="font-bold mb-2">Sin gastos con esos filtros.</p>
            <Link href="/agregar" className="underline font-bold">Agregar uno →</Link>
          </div>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {expenses.map((e: any) => {
              const c: any = catMap.get(e.category_id);
              const acc: any = e.account_id ? accMap.get(e.account_id) : null;
              const sourceEmoji =
                e.source === 'photo' ? '📸' :
                e.source === 'voice' ? '🎤' :
                e.source === 'alex' ? '👷' :
                e.source === 'transfer' ? '💳' :
                e.source === 'ajuste' ? '⚖️' : '';

              // Título: prioriza descripción, fallback al nombre de la subcategoría
              const title = e.description?.trim()
                ? e.description
                : (c?.name ?? 'Gasto');

              // Línea secundaria: fecha + cuenta + comisión + flags
              const subPieces: string[] = [formatDate(e.spent_at)];
              if (acc) subPieces.push(`${acc.type === 'credit_card' ? '💳' : '🏦'} ${acc.name}`);
              if (Number(e.bank_commission) > 0) subPieces.push(`+${formatUSD(Number(e.bank_commission))} com`);
              if (sourceEmoji) subPieces.push(sourceEmoji);
              if (e.is_deferred) subPieces.push('📆 dif');
              if (e.needs_review) subPieces.push('🔍 verificar');

              return (
                <li key={e.id} className={`p-3 flex items-center gap-2 ${e.needs_review ? 'bg-peach/40' : ''}`}>
                  <Badge tone={(c?.color as any) ?? 'sky'}>{c ? `${c.emoji} ${c.name}` : 'Sin cat.'}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-sm">
                      {e.needs_review && <span className="mr-1">🔍</span>}
                      {title}
                    </p>
                    <p className="text-[10px] opacity-80">{subPieces.join(' · ')}</p>
                  </div>
                  <span className="font-black text-sm whitespace-nowrap">{formatUSD(Number(e.amount))}</span>
                  <EditExpense expense={e as any} categories={cats as any} accounts={(accounts ?? []) as any} />
                  <DeleteButton id={e.id} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
