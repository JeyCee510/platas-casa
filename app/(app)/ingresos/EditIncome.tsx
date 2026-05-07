'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { actualizarIngreso } from '@/lib/incomes';

type Account = { id: number; type: string; name: string };
type Income = {
  id: number;
  source: string;
  amount: number | string;
  description: string | null;
  received_at: string;
  account_id?: number | null;
};

export function EditIncome({ income, accounts }: { income: Income; accounts: Account[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-3 border-ink rounded-md w-8 h-8 bg-lemon shadow-brutSm font-black text-sm"
        title="Editar"
      >✏️</button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-2 overflow-auto" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <Card tone="white" className="p-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg">Editar ingreso</h2>
            <button onClick={() => setOpen(false)} className="text-xs underline font-bold">Cerrar</button>
          </div>
          <form action={actualizarIngreso} className="space-y-3">
            <input type="hidden" name="id" value={income.id} />
            <div>
              <Label>Fuente</Label>
              <Select name="source" required defaultValue={income.source}>
                <option value="aporte_jc">👨 Aporte JC</option>
                <option value="aporte_ac">👩 Aporte AC</option>
                <option value="intereses">📈 Intereses</option>
                <option value="otros">💵 Otros</option>
              </Select>
            </div>
            <div>
              <Label>Monto (USD)</Label>
              <input
                name="amount" type="number" inputMode="decimal" step="0.01" required
                defaultValue={String(income.amount)}
                className="w-full text-2xl font-black text-center border-3 border-ink rounded-md py-2 bg-bg shadow-brutSm focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <Label>Cuenta destino</Label>
              <Select name="account_id" defaultValue={income.account_id ?? ''}>
                <option value="">— ninguna —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'credit_card' ? '💳' : '🏦'} {a.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input name="received_at" type="date" required defaultValue={income.received_at} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea name="description" rows={2} defaultValue={income.description ?? ''} />
            </div>
            <p className="text-[11px] font-bold uppercase text-ink/70">
              Cambiar el monto o la cuenta ajusta el saldo automáticamente.
            </p>
            <div className="flex gap-2">
              <Button type="submit">💾 Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
