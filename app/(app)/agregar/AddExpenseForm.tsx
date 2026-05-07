'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { todayISO } from '@/lib/format';

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  color: string;
  parent_id: number | null;
  ord: number;
};

type AlexConcept = { id: number; nombre: string; monto_tipo: number | null; es_extra_default: boolean };
type Account = { id: number; type: 'credit_card' | 'bank_account'; name: string };

const ALEX_SLUGS = new Set(['alex', 'iess-alex']);

const COLOR_BG: Record<string, string> = {
  mint: 'bg-mint', sky: 'bg-sky', peach: 'bg-peach', lemon: 'bg-lemon',
  lilac: 'bg-lilac', bubble: 'bg-bubble', teal: 'bg-teal',
};

export function AddExpenseForm({ categories, alexConcepts = [], accounts = [], recentCategoryIds = [] }: { categories: Category[]; alexConcepts?: AlexConcept[]; accounts?: Account[]; recentCategoryIds?: number[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const source = params.get('source') ?? 'manual';
  const fileRef = useRef<HTMLInputElement>(null);

  // Separar grupos y subcategorías
  const groups = useMemo(() => categories.filter((c) => c.parent_id === null).sort((a, b) => a.ord - b.ord), [categories]);
  const subsByGroup = useMemo(() => {
    const m = new Map<number, Category[]>();
    categories.filter((c) => c.parent_id !== null).forEach((c) => {
      const list = m.get(c.parent_id!) ?? [];
      list.push(c);
      m.set(c.parent_id!, list);
    });
    m.forEach((list) => list.sort((a, b) => a.ord - b.ord));
    return m;
  }, [categories]);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isDeferred, setIsDeferred] = useState(false);
  const [alexConceptoId, setAlexConceptoId] = useState<string>('');
  const [alexEsExtra, setAlexEsExtra] = useState(false);
  // Cuenta default Pichincha (id 3)
  const pichincha = accounts.find((a) => a.name.toLowerCase() === 'pichincha');
  const [accountId, setAccountId] = useState<string>(pichincha ? String(pichincha.id) : '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (source === 'foto') {
      setTimeout(() => fileRef.current?.click(), 100);
    }
  }, [source]);

  function onPickPhoto(file: File) {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    void parsePhoto(file);
  }

  async function parsePhoto(file: File) {
    setParsing(true); setError(null); setAiQuestion(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error procesando foto');
      if (data.amount) setAmount(String(data.amount));
      if (data.date) setDate(data.date);
      if (data.description) setDescription(data.description);
      if (data.category_slug) {
        const c = categories.find((x) => x.slug === data.category_slug);
        if (c) {
          setCategoryId(String(c.id));
          if (c.parent_id) setActiveGroupId(c.parent_id);
        }
      }
      if (data.confidence !== 'alta' || data.question) setNeedsReview(true);
      if (data.question) setAiQuestion(data.question);
    } catch (e: any) {
      setError(e.message);
      setNeedsReview(true);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada');

      let receipt_url: string | null = null;
      if (photo) {
        const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('receipts').upload(path, photo, { upsert: false });
        if (upErr) throw upErr;
        receipt_url = path;
      }

      const selectedSub = categories.find((c) => String(c.id) === categoryId);
      const isAlexLink = !!selectedSub && ALEX_SLUGS.has(selectedSub.slug) && !!alexConceptoId;

      const res = await fetch('/api/save-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          description: description || null,
          category_id: categoryId ? Number(categoryId) : null,
          account_id: accountId ? Number(accountId) : null,
          spent_at: date,
          source: photo ? 'photo' : 'manual',
          receipt_url,
          needs_review: needsReview,
          is_deferred: isDeferred,
          alex_link: isAlexLink,
          alex_concepto_id: isAlexLink ? Number(alexConceptoId) : null,
          alex_es_extra: alexEsExtra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando gasto');
      if (data.warning) alert(data.warning);

      router.push('/');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  const todayStr = todayISO();
  const dateLabel = date === todayStr ? 'Hoy' :
    date === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? 'Ayer' :
    new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short' });

  const selectedSub = categories.find((c) => String(c.id) === categoryId);
  const activeSubs = activeGroupId ? subsByGroup.get(activeGroupId) ?? [] : [];
  const showAlexLink = !!selectedSub && ALEX_SLUGS.has(selectedSub.slug);
  // Categorías recientes (subs)
  const recentCats = recentCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c && c.parent_id !== null);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-black">Nuevo gasto</h1>

      {/* Foto */}
      {(source === 'foto' || photo) && (
        <Card tone="lemon" className="p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickPhoto(f);
            }}
          />
          {!photo ? (
            <Button type="button" variant="secondary" full onClick={() => fileRef.current?.click()}>
              📸 Tomar foto
            </Button>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview!} alt="boleta" className="max-h-32 mx-auto border-3 border-ink rounded-md shadow-brutSm" />
              <p className="text-xs font-bold mt-2 text-center">
                {parsing ? '🔍 Leyendo…' : '✨ Datos extraídos'}
              </p>
              {aiQuestion && (
                <Card tone="peach" className="p-2 mt-2">
                  <p className="text-xs font-bold">🤔 {aiQuestion}</p>
                </Card>
              )}
            </>
          )}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Monto gigante */}
        <Card tone="white" className="p-3">
          <Label htmlFor="amount">Monto (USD)</Label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-4xl font-black text-center border-3 border-ink rounded-md py-2 bg-bg shadow-brutSm focus:outline-none tabular-nums"
            autoFocus={source === 'manual'}
          />
        </Card>

        {/* Categoría: recientes + grupos + subcategorías */}
        <Card tone="white" className="p-3">
          <Label>Categoría {selectedSub && <span className="text-xs">→ {selectedSub.emoji} {selectedSub.name}</span>}</Label>

          {/* Recientes (top 6) */}
          {recentCats.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase text-ink/70 mb-1">Recientes</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {recentCats.map((c) => {
                  const selected = categoryId === String(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCategoryId(String(c.id)); setActiveGroupId(c.parent_id); }}
                      className={`border-3 border-ink rounded-md px-1 py-1.5 text-[11px] font-bold ${selected ? 'bg-lemon shadow-brutSm' : 'bg-white'} active:translate-x-[1px] active:translate-y-[1px]`}
                    >
                      {c.emoji} {c.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <p className="text-[10px] font-bold uppercase text-ink/70 mb-1">Grupos</p>
          {/* Grupos */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {groups.map((g) => {
              const active = activeGroupId === g.id;
              const bg = active ? (COLOR_BG[g.color] ?? 'bg-sky') : 'bg-white';
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setActiveGroupId(active ? null : g.id); }}
                  className={`border-3 border-ink rounded-md px-1 py-1.5 font-bold text-[10px] ${bg} ${active ? 'shadow-brutSm' : 'opacity-80'} active:translate-x-[1px] active:translate-y-[1px] leading-tight`}
                >
                  <div className="text-base">{g.emoji}</div>
                  <div>{g.name}</div>
                </button>
              );
            })}
          </div>

          {/* Subcategorías del grupo activo */}
          {activeGroupId && (
            <div className="border-t-3 border-ink pt-2 grid grid-cols-2 gap-1.5">
              {activeSubs.map((s) => {
                const selected = categoryId === String(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCategoryId(String(s.id))}
                    className={`border-3 border-ink rounded-md px-2 py-1.5 text-left text-xs font-bold ${selected ? 'bg-lemon shadow-brutSm' : 'bg-white'} active:translate-x-[1px] active:translate-y-[1px]`}
                  >
                    <span className="mr-1">{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Sub-form Alex: aparece cuando subcategoría es Alex / IESS Alex */}
        {showAlexLink && (
          <Card tone="bubble" className="p-3 space-y-2">
            <p className="text-xs font-black uppercase">🔗 Vincular a Platas Alex</p>
            <p className="text-[10px]">Este gasto se registrará también como pago en el módulo Alex.</p>
            <div>
              <Label htmlFor="alex-concept">Concepto en Alex</Label>
              <select
                id="alex-concept"
                value={alexConceptoId}
                onChange={(e) => setAlexConceptoId(e.target.value)}
                className="w-full border-3 border-ink rounded-md px-2 py-2 bg-white shadow-brutSm font-bold"
              >
                <option value="">— no vincular —</option>
                {alexConcepts.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.monto_tipo ? ` · $${c.monto_tipo}` : ''}</option>
                ))}
              </select>
            </div>
            {alexConceptoId && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={alexEsExtra}
                  onChange={(e) => setAlexEsExtra(e.target.checked)}
                  className="w-5 h-5 border-3 border-ink"
                />
                <span className="text-xs font-bold">Es extra (no cuenta al sueldo de $570)</span>
              </label>
            )}
          </Card>
        )}

        {/* Cuenta de origen */}
        {accounts.length > 0 && (
          <Card tone="white" className="p-3">
            <Label htmlFor="account">Cuenta (de dónde sale el dinero)</Label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border-3 border-ink rounded-md px-3 py-2 bg-white shadow-brutSm font-bold"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type === 'credit_card' ? '💳' : '🏦'} {a.name}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Diferida + Fecha + Desc */}
        <Card tone="white" className="p-3 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDeferred}
              onChange={(e) => setIsDeferred(e.target.checked)}
              className="w-5 h-5 border-3 border-ink"
            />
            <span className="text-sm font-bold">💳 Compra diferida (en cuotas)</span>
          </label>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase">Fecha:</span>
            <button type="button" onClick={() => setShowDate(!showDate)} className="text-xs underline font-bold">
              {dateLabel} · cambiar
            </button>
          </div>
          {showDate && (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          <div>
            <Label htmlFor="desc-field">📝 Nota / detalle</Label>
            <Textarea id="desc-field" rows={2} placeholder="Lo que sea útil recordar después" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </Card>

        {/* Verificar */}
        <label className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => setNeedsReview(e.target.checked)}
            className="w-5 h-5 border-3 border-ink"
          />
          <span className="text-xs font-bold">🔍 Marcar como "verificar"</span>
        </label>

        {error && <p className="text-sm font-bold text-red-700 px-2">{error}</p>}

        <Button type="submit" full disabled={saving || !amount}>
          {saving ? 'Guardando…' : '💾 Guardar gasto'}
        </Button>
      </form>
    </div>
  );
}
