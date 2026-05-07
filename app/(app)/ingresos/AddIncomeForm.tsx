'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { crearIngreso } from '@/lib/incomes';
import { todayISO } from '@/lib/format';

type Account = { id: number; type: 'credit_card' | 'bank_account'; name: string };

export function AddIncomeForm({ accounts = [] }: { accounts?: Account[] }) {
  const [open, setOpen] = useState(false);
  const pichincha = accounts.find((a) => a.name.toLowerCase() === 'pichincha');

  if (!open) {
    return <Button variant="primary" full onClick={() => setOpen(true)}>+ Registrar ingreso</Button>;
  }

  return (
    <Card tone="lemon" className="p-4">
      <h3 className="font-black text-sm uppercase mb-3">Nuevo ingreso</h3>
      <form action={crearIngreso} className="space-y-3">
        <div>
          <Label htmlFor="source">Fuente</Label>
          <Select id="source" name="source" required defaultValue="aporte_jc">
            <option value="aporte_jc">👨 Aporte JC</option>
            <option value="aporte_ac">👩 Aporte AC</option>
            <option value="otros">💵 Otros</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="iamount">Monto (USD)</Label>
          <input
            id="iamount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            placeholder="0.00"
            className="w-full text-3xl font-black text-center border-3 border-ink rounded-md py-2 bg-white shadow-brutSm focus:outline-none tabular-nums"
          />
        </div>
        {accounts.length > 0 && (
          <div>
            <Label htmlFor="iaccount">Cuenta destino</Label>
            <Select id="iaccount" name="account_id" defaultValue={pichincha?.id ?? ''}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type === 'credit_card' ? '💳' : '🏦'} {a.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="ireceived">Fecha</Label>
          <Input id="ireceived" name="received_at" type="date" required defaultValue={todayISO()} />
        </div>
        <div>
          <Label htmlFor="idesc">Descripción (opcional)</Label>
          <Textarea id="idesc" name="description" rows={2} placeholder="Ej: sueldo, freelance, regalo" />
        </div>
        <div className="flex gap-2">
          <Button type="submit">💾 Guardar</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
