import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatUSD, formatDate } from '@/lib/format';
import { isAdmin } from '@/lib/role';
import { DeleteButton } from './DeleteButton';
import { EditExpense } from './EditExpense';

export const dynamic = 'force-dynamic';

export default async function ListaPage({ searchParams }: { searchParams: { cat?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Limited (Ana): solo ve sus propios gastos como simple lista, sin montos detallados
  const limited = !isAdmin(user);


  let query = supabase
    .from('expenses')
    .select('id, amount, description, spent_at, category_id, account_id, source, needs_review, is_deferred')
    .order('needs_review', { ascending: false })
    .order('spent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);

  if (searchParams.cat) query = query.eq('category_id', Number(searchParams.cat));
  if (searchParams.q) query = query.ilike('description', `%${searchParams.q}%`);
  if (limited && user) query = query.eq('created_by', user.id);

  const [{ data: expenses }, { data: categories }, { data: accounts }] = await Promise.all([
    query,
    supabase.from('categories').select('*').order('ord'),
    supabase.from('accounts').select('id, type, name').order('type').order('name'),
  ]);

  const catMap = new Map((categories ?? []).map((c: any) => [c.id, c]));
  const total = (expenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Todos los gastos</h1>
          <p className="text-sm">{(expenses ?? []).length} resultados · total {formatUSD(total)}</p>
        </div>
        <Link href="/agregar"><Button variant="primary">+ Agregar</Button></Link>
      </div>

      <Card tone="white" className="p-4">
        <form className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-bold uppercase block mb-1">Categoría</label>
            <select name="cat" defaultValue={searchParams.cat ?? ''} className="border-3 border-ink rounded-md px-2 py-1 bg-white shadow-brutSm">
              <option value="">Todas</option>
              {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-bold uppercase block mb-1">Buscar</label>
            <input name="q" defaultValue={searchParams.q ?? ''} placeholder="descripción…" className="w-full border-3 border-ink rounded-md px-2 py-1 bg-white shadow-brutSm" />
          </div>
          <Button type="submit" variant="secondary">Filtrar</Button>
          {(searchParams.cat || searchParams.q) && (
            <Link href="/lista"><Button type="button" variant="ghost">Limpiar</Button></Link>
          )}
        </form>
      </Card>

      <Card tone="white" className="overflow-hidden">
        {(!expenses || expenses.length === 0) ? (
          <div className="p-8 text-center">
            <p className="font-bold mb-2">Sin gastos todavía.</p>
            <Link href="/agregar" className="underline font-bold">Agregar el primero →</Link>
          </div>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {expenses.map((e: any) => {
              const c: any = catMap.get(e.category_id);
              const sourceEmoji = e.source === 'photo' ? '📸' : e.source === 'voice' ? '🎤' : '';
              return (
                <li key={e.id} className={`p-3 flex items-center gap-2 ${e.needs_review ? 'bg-peach/40' : ''}`}>
                  <Badge tone={(c?.color as any) ?? 'sky'}>{c ? `${c.emoji} ${c.name}` : 'Sin cat.'}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-sm">
                      {e.needs_review && <span className="mr-1">🔍</span>}
                      {e.description ?? 'Gasto'}
                    </p>
                    <p className="text-[10px]">{formatDate(e.spent_at)} {sourceEmoji && `· ${sourceEmoji}`}{e.needs_review && ' · verificar'}</p>
                  </div>
                  <span className="font-black text-sm whitespace-nowrap">{formatUSD(Number(e.amount))}</span>
                  <EditExpense expense={e as any} categories={(categories ?? []) as any} accounts={(accounts ?? []) as any} />
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
