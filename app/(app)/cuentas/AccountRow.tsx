'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { formatUSD, formatDate } from '@/lib/format';

type Account = {
  id: number;
  type: 'credit_card' | 'bank_account';
  name: string;
  balance: number | string;
  due_date: string | null;
  notes: string | null;
  updated_at: string;
};

export function AccountRow({ account, showDueDate }: { account: Account; showDueDate: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState(String(account.balance));
  const [dueDate, setDueDate] = useState(account.due_date ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      balance: Number(balance) || 0,
      updated_by: user?.id ?? null,
    };
    if (showDueDate) payload.due_date = dueDate || null;
    const { error } = await supabase.from('accounts').update(payload).eq('id', account.id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`¿Borrar ${account.name}? Esto no se puede deshacer.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('accounts').delete().eq('id', account.id);
    if (error) { alert(error.message); return; }
    router.refresh();
  }

  if (!editing) {
    const dueLabel = showDueDate && account.due_date
      ? new Date(account.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    return (
      <li className="py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm">{account.name}</p>
          {dueLabel && <p className="text-[10px] font-bold uppercase">📅 Vence {dueLabel}</p>}
          {!showDueDate && <p className="text-[10px]">Saldo disponible</p>}
        </div>
        <span className="font-black text-base whitespace-nowrap">{formatUSD(Number(account.balance))}</span>
        <Button variant="secondary" onClick={() => setEditing(true)}>Editar</Button>
      </li>
    );
  }

  return (
    <li className="py-3 space-y-3">
      <p className="font-black">{account.name}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`bal-${account.id}`}>{account.type === 'credit_card' ? 'Monto pendiente' : 'Saldo disponible'} (USD)</Label>
          <Input
            id={`bal-${account.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
        {showDueDate && (
          <div>
            <Label htmlFor={`dd-${account.id}`}>Fecha de vencimiento</Label>
            <Input
              id={`dd-${account.id}`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : '💾 Guardar'}</Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button variant="danger" onClick={remove}>🗑️ Borrar</Button>
      </div>
    </li>
  );
}
