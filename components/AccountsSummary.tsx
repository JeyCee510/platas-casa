import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatUSD, formatDate } from '@/lib/format';

type Account = {
  id: number;
  type: 'credit_card' | 'bank_account';
  name: string;
  balance: number;
  due_date: string | null;
};

export function AccountsSummary({ accounts }: { accounts: Account[] }) {
  const cards = accounts.filter((a) => a.type === 'credit_card');
  const banks = accounts.filter((a) => a.type === 'bank_account');
  const totalDeuda = cards.reduce((s, a) => s + Number(a.balance), 0);
  const totalDisponible = banks.reduce((s, a) => s + Number(a.balance), 0);
  const neto = totalDisponible - totalDeuda;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-black">Cuentas</h2>
        <Link href="/cuentas" className="border-3 border-ink bg-lilac shadow-brutSm rounded-md px-3 py-1 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px]">
          Editar valores →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card tone="peach" className="p-5">
          <p className="text-sm font-bold uppercase">Deuda tarjetas</p>
          <p className="text-3xl font-black mt-2">{formatUSD(totalDeuda)}</p>
          <p className="text-xs mt-2 font-bold">{cards.length} tarjeta{cards.length === 1 ? '' : 's'}</p>
        </Card>
        <Card tone="mint" className="p-5">
          <p className="text-sm font-bold uppercase">Disponible bancos</p>
          <p className="text-3xl font-black mt-2">{formatUSD(totalDisponible)}</p>
          <p className="text-xs mt-2 font-bold">{banks.length} cuenta{banks.length === 1 ? '' : 's'}</p>
        </Card>
        <Card tone={neto >= 0 ? 'sky' : 'bubble'} className="p-5">
          <p className="text-sm font-bold uppercase">Neto</p>
          <p className="text-3xl font-black mt-2">{formatUSD(neto)}</p>
          <p className="text-xs mt-2 font-bold">disponible − deuda</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card tone="white" className="p-5">
          <h3 className="font-black text-lg mb-3">💳 Tarjetas</h3>
          {cards.length === 0 ? (
            <p className="text-sm">Sin tarjetas. <Link href="/cuentas" className="underline font-bold">Agregar</Link>.</p>
          ) : (
            <ul className="divide-y-3 divide-ink">
              {cards.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs">{c.due_date ? `Vence ${formatDate(c.due_date)}` : 'Sin fecha'}</p>
                  </div>
                  <Badge tone="peach">{formatUSD(Number(c.balance))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card tone="white" className="p-5">
          <h3 className="font-black text-lg mb-3">🏦 Bancos</h3>
          {banks.length === 0 ? (
            <p className="text-sm">Sin cuentas. <Link href="/cuentas" className="underline font-bold">Agregar</Link>.</p>
          ) : (
            <ul className="divide-y-3 divide-ink">
              {banks.map((b) => (
                <li key={b.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{b.name}</p>
                    <p className="text-xs">Saldo disponible</p>
                  </div>
                  <Badge tone="mint">{formatUSD(Number(b.balance))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
