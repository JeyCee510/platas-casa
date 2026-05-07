import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatUSD, formatDate } from '@/lib/format';
import { DeleteButton } from './DeleteButton';

export const dynamic = 'force-dynamic';

export default async function ListaPage({ searchParams }: { searchParams: { cat?: string; q?: string } }) {
  const supabase = createClient();

  let query = supabase
    .from('expenses')
    .select('id, amount, description, spent_at, category_id, source')
    .order('spent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);

  if (searchParams.cat) query = query.eq('category_id', Number(searchParams.cat));
  if (searchParams.q) query = query.ilike('description', `%${searchParams.q}%`);

  const [{ data: expenses }, { data: categories }] = await Promise.all([
    query,
    supabase.from('categories').select('*').order('id'),
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
              return (
                <li key={e.id} className="p-3 flex items-center gap-3">
                  <Badge tone={(c?.color as any) ?? 'sky'}>{c ? `${c.emoji} ${c.name}` : 'Sin cat.'}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{e.description ?? 'Gasto'}</p>
                    <p className="text-xs">{formatDate(e.spent_at)} {e.source === 'photo' && '· 📸'}</p>
                  </div>
                  <span className="font-black">{formatUSD(Number(e.amount))}</span>
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
