'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label } from '@/components/ui/Input';

export function AddAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'credit_card' | 'bank_account'>('credit_card');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sesión expirada'); setSaving(false); return; }

    const { error: err } = await supabase.from('accounts').insert({
      type,
      name: name.trim(),
      balance: Number(balance) || 0,
      due_date: type === 'credit_card' && dueDate ? dueDate : null,
      currency: 'USD',
      created_by: user.id,
      updated_by: user.id,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setName(''); setBalance('0'); setDueDate(''); setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>+ Agregar cuenta</Button>
    );
  }

  return (
    <Card tone="lemon" className="p-5">
      <h3 className="font-black text-lg mb-3">Nueva cuenta</h3>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="credit_card">💳 Tarjeta de crédito</option>
              <option value="bank_account">🏦 Cuenta bancaria</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" required placeholder={type === 'credit_card' ? 'Diners, Amex…' : 'Pichincha, Guayaquil…'} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bal">{type === 'credit_card' ? 'Monto pendiente' : 'Saldo disponible'} (USD)</Label>
            <Input id="bal" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" value={balance} onChange={(e) => setBalance(e.target.value.replace(',', '.'))} />
          </div>
          {type === 'credit_card' && (
            <div>
              <Label htmlFor="dd">Fecha de vencimiento</Label>
              <Input id="dd" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
        </div>
        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : '💾 Crear'}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
