'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { crearTransfer } from '@/lib/transfers';
import { formatUSD, todayISO } from '@/lib/format';

type Account = { id: number; type: 'credit_card' | 'bank_account'; name: string; balance: number };

export function TransferForm({ banks, cards }: { banks: Account[]; cards: Account[] }) {
  const pichincha = banks.find((b) => b.name.toLowerCase() === 'pichincha');
  const [tipo, setTipo] = useState<'pago_tarjeta' | 'transfer_banco'>('pago_tarjeta');
  const [fromId, setFromId] = useState<string>(pichincha ? String(pichincha.id) : '');
  const [toId, setToId] = useState<string>(cards[0] ? String(cards[0].id) : '');

  const targetOptions = tipo === 'pago_tarjeta' ? cards : banks.filter((b) => String(b.id) !== fromId);
  const [bankCommission, setBankCommission] = useState<number>(0);

  return (
    <Card tone="lemon" className="p-4 space-y-3">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setTipo('pago_tarjeta'); setToId(cards[0] ? String(cards[0].id) : ''); }}
          className={`border-3 border-ink rounded-md py-3 font-black text-sm ${tipo === 'pago_tarjeta' ? 'bg-sky shadow-brutSm' : 'bg-white'}`}
        >💳 Pagar tarjeta</button>
        <button
          type="button"
          onClick={() => { setTipo('transfer_banco'); setToId(banks.find((b) => String(b.id) !== fromId)?.id ? String(banks.find((b) => String(b.id) !== fromId)!.id) : ''); }}
          className={`border-3 border-ink rounded-md py-3 font-black text-sm ${tipo === 'transfer_banco' ? 'bg-mint shadow-brutSm' : 'bg-white'}`}
        >🔄 Banco a banco</button>
      </div>

      <form action={crearTransfer} className="space-y-3">
        <div>
          <Label htmlFor="famount">Monto (USD)</Label>
          <input
            id="famount"
            name="amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            required
            placeholder="0.00"
            className="w-full text-3xl font-black text-center border-3 border-ink rounded-md py-2 bg-white shadow-brutSm focus:outline-none tabular-nums"
          />
        </div>

        <div>
          <Label htmlFor="ffrom">Desde (banco)</Label>
          <Select id="ffrom" name="from_account_id" required value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>🏦 {b.name} · {formatUSD(Number(b.balance))}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="fto">{tipo === 'pago_tarjeta' ? 'Tarjeta a pagar' : 'A (banco destino)'}</Label>
          <Select id="fto" name="to_account_id" required value={toId} onChange={(e) => setToId(e.target.value)}>
            {targetOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.type === 'credit_card' ? '💳' : '🏦'} {a.name}
                {a.type === 'credit_card' ? ` · debe ${formatUSD(Number(a.balance))}` : ` · ${formatUSD(Number(a.balance))}`}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="fdate">Fecha</Label>
          <Input id="fdate" name="transferred_at" type="date" required defaultValue={todayISO()} />
        </div>

        <div>
          <Label htmlFor="fdesc">Nota (opcional)</Label>
          <Textarea id="fdesc" name="description" rows={2} placeholder="Ej: pago corte abril" />
        </div>

        {tipo === 'pago_tarjeta' && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase">🏦 Comisión bancaria</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 0.31, 0.39, 0.41].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBankCommission(c)}
                  className={`border-3 border-ink rounded-md py-2 text-xs font-bold ${bankCommission === c ? 'bg-mint shadow-brutSm' : 'bg-white'}`}
                >{c === 0 ? 'Sin' : `$${c.toFixed(2)}`}</button>
              ))}
            </div>
            <input type="hidden" name="bank_commission" value={bankCommission} />
          </div>
        )}

        <p className="text-[11px] font-bold uppercase text-ink/70">
          {tipo === 'pago_tarjeta'
            ? 'Reduce saldo banco, baja deuda tarjeta. Aparece en /lista. Comisión = gasto real extra.'
            : 'Reduce origen, aumenta destino. No afecta gastos.'}
        </p>

        <Button type="submit" full>💾 Guardar movimiento</Button>
      </form>
    </Card>
  );
}
