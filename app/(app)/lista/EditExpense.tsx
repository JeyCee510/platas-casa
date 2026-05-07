'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { formatUSD, formatDate } from '@/lib/format';

type Cat = { id: number; slug: string; name: string; emoji: string | null; color: string; parent_id: number | null; ord: number };
type Account = { id: number; type: string; name: string };
type Expense = {
  id: number;
  amount: number | string;
  description: string | null;
  category_id: number | null;
  account_id: number | null;
  spent_at: string;
  source: string;
  needs_review: boolean;
  is_deferred: boolean;
};

export function EditExpense({ expense, categories, accounts }: { expense: Expense; categories: Cat[]; accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount));
  const [date, setDate] = useState(expense.spent_at);
  const [categoryId, setCategoryId] = useState(String(expense.category_id ?? ''));
  const [accountId, setAccountId] = useState(String(expense.account_id ?? ''));
  const [description, setDescription] = useState(expense.description ?? '');
  const [needsReview, setNeedsReview] = useState(expense.needs_review);
  const [isDeferred, setIsDeferred] = useState(expense.is_deferred);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subs = categories.filter((c) => c.parent_id !== null).sort((a, b) => a.ord - b.ord);

  async function save() {
    setSaving(true); setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from('expenses').update({
      amount: Number(amount),
      description: description || null,
      category_id: categoryId ? Number(categoryId) : null,
      account_id: accountId ? Number(accountId) : null,
      spent_at: date,
      needs_review: needsReview,
      is_deferred: isDeferred,
    }).eq('id', expense.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    router.refresh();
  }

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
        <Card tone="white" className="p-4 space-y-3 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg">Editar gasto</h2>
            <button onClick={() => setOpen(false)} className="text-xs underline font-bold">Cerrar</button>
          </div>

          <div>
            <Label>Monto (USD)</Label>
            <input
              type="number" inputMode="decimal" step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full text-2xl font-black text-center border-3 border-ink rounded-md py-2 bg-bg shadow-brutSm focus:outline-none tabular-nums"
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— sin categoría —</option>
              {subs.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Cuenta</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">— ninguna —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'credit_card' ? '💳' : '🏦'} {a.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isDeferred} onChange={(e) => setIsDeferred(e.target.checked)} className="w-5 h-5 border-3 border-ink" />
            <span className="text-sm font-bold">💳 Compra diferida</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={needsReview} onChange={(e) => setNeedsReview(e.target.checked)} className="w-5 h-5 border-3 border-ink" />
            <span className="text-sm font-bold">🔍 Verificar</span>
          </label>
          {error && <p className="text-sm font-bold text-red-700">{error}</p>}
          <p className="text-[11px] font-bold uppercase text-ink/70">
            Cambiar el monto o la cuenta ajusta el saldo de la cuenta automáticamente.
          </p>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : '💾 Guardar'}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
