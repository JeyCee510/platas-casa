import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate } from '@/lib/format';
import { listTransfers, eliminarTransfer } from '@/lib/transfers';
import { TransferForm } from './TransferForm';

export const dynamic = 'force-dynamic';

export default async function TransferirPage() {
  const supabase = createClient();
  await supabase.auth.getUser();
  const [{ data: accounts }, transfers] = await Promise.all([
    supabase.from('accounts').select('id, type, name, balance, due_date').order('type').order('name'),
    listTransfers(20),
  ]);

  const accs = accounts ?? [];
  const banks = accs.filter((a: any) => a.type === 'bank_account');
  const cards = accs.filter((a: any) => a.type === 'credit_card');
  const accMap = new Map(accs.map((a: any) => [a.id, a]));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">Transferencia</p>
        <h1 className="text-2xl font-black">Pagar tarjeta o mover plata</h1>
        <p className="text-xs">Mueve dinero entre cuentas. <b>No cuenta como gasto del mes.</b></p>
      </div>

      <TransferForm banks={banks as any} cards={cards as any} />

      <Card tone="white" className="overflow-hidden">
        <div className="bg-bg border-b-3 border-ink px-3 py-1.5">
          <p className="text-xs font-black uppercase">Últimas transferencias</p>
        </div>
        {transfers.length === 0 ? (
          <p className="p-4 text-xs text-center font-bold">Sin transferencias todavía.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {transfers.map((t: any) => {
              const from: any = accMap.get(t.from_account_id);
              const to: any = accMap.get(t.to_account_id);
              const isCardPayment = to?.type === 'credit_card';
              return (
                <li key={t.id} className="p-3 flex items-center gap-2">
                  <Badge tone={isCardPayment ? 'sky' : 'mint'}>{isCardPayment ? '💳 Pago' : '🔄 Mov'}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {from?.name ?? '?'} → {to?.name ?? '?'}
                    </p>
                    <p className="text-[10px]">{formatDate(t.transferred_at)}{t.description ? ` · ${t.description}` : ''}</p>
                  </div>
                  <span className="font-black text-sm">{formatUSD(Number(t.amount))}</span>
                  <form action={eliminarTransfer}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="border-3 border-ink rounded-md w-8 h-8 bg-peach shadow-brutSm font-black text-sm">×</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs"><Link href="/" className="underline font-bold">← Volver al inicio</Link></p>
    </div>
  );
}
