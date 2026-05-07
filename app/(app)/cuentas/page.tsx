import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatUSD, formatDate, monthLabel } from '@/lib/format';
import { isAdmin } from '@/lib/role';
import { AccountRow } from './AccountRow';
import { AddAccountForm } from './AddAccountForm';

export const dynamic = 'force-dynamic';

export default async function CuentasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) redirect('/');
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, type, name, balance, due_date, notes, updated_at, updated_by')
    .order('type')
    .order('name');

  const cards = (accounts ?? []).filter((a: any) => a.type === 'credit_card');
  const banks = (accounts ?? []).filter((a: any) => a.type === 'bank_account');
  const totalDeuda = cards.reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalDisponible = banks.reduce((s: number, a: any) => s + Number(a.balance), 0);
  const today = new Date();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">{monthLabel(today)}</p>
        <h1 className="text-2xl font-black">Cuentas</h1>
        <p className="text-xs">Tarjetas y bancos del hogar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card tone="peach" className="p-4">
          <p className="text-xs font-bold uppercase">Total deuda tarjetas</p>
          <p className="text-3xl font-black">{formatUSD(totalDeuda)}</p>
        </Card>
        <Card tone="mint" className="p-4">
          <p className="text-xs font-bold uppercase">Total disponible bancos</p>
          <p className="text-3xl font-black">{formatUSD(totalDisponible)}</p>
        </Card>
      </div>

      <Card tone="white" className="p-5">
        <h2 className="font-black text-lg mb-3">💳 Tarjetas de crédito</h2>
        {cards.length === 0 ? (
          <p className="text-sm">Sin tarjetas. Agrega abajo.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {cards.map((c: any) => (
              <AccountRow key={c.id} account={c} showDueDate />
            ))}
          </ul>
        )}
      </Card>

      <Card tone="white" className="p-5">
        <h2 className="font-black text-lg mb-3">🏦 Cuentas bancarias</h2>
        {banks.length === 0 ? (
          <p className="text-sm">Sin cuentas. Agrega abajo.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {banks.map((b: any) => (
              <AccountRow key={b.id} account={b} showDueDate={false} />
            ))}
          </ul>
        )}
      </Card>

      <AddAccountForm />

      <p className="text-xs">
        <Link href="/" className="underline font-bold">← Volver al inicio</Link>
      </p>
    </div>
  );
}
