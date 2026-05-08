'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { todayISO, yesterdayISO } from '@/lib/format';

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
  // Comisión bancaria
  const [bankCommission, setBankCommission] = useState<number>(0);
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
      // Bloqueo: gastos Alex deben crearse desde el módulo /alex
      if (selectedSub && ALEX_SLUGS.has(selectedSub.slug)) {
        setSaving(false);
        setError('Para Alex usa el módulo Platas Alex (botón arriba).');
        return;
      }
      const isAlexLink = false;

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
          bank_commission: bankCommission || 0,
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
    date === yesterdayISO() ? 'Ayer' :
    new Date(date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' });

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
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(',', '.'))}
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

        {/* Bloqueo Alex: si seleccionan categoría Alex, fuerzan ir al módulo. */}
        {showAlexLink && (
          <Card tone="peach" className="p-3 space-y-2">
            <p className="text-sm font-black uppercase">⚠️ Pagos a Alex van por el módulo</p>
            <p className="text-xs">Para mantener todo cuadrado, los pagos a Alex se registran desde el módulo Platas Alex. Allí se crea automáticamente el gasto en general.</p>
            <Link
              href="/alex"
              className="block text-center border-3 border-ink rounded-md bg-white shadow-brutSm py-2 font-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              👷 Ir a Platas Alex →
            </Link>
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

        {/* Fecha (siempre visible) */}
        <Card tone="white" className="p-3 space-y-2">
          <Label htmlFor="date-field">📅 Fecha — {dateLabel}</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDate(todayStr)}
              className={`border-3 border-ink rounded-md py-2 text-xs font-black uppercase ${date === todayStr ? 'bg-mint shadow-brutSm' : 'bg-white'}`}
            >Hoy</button>
            <button
              type="button"
              onClick={() => setDate(yesterdayISO())}
              className={`border-3 border-ink rounded-md py-2 text-xs font-black uppercase ${date === yesterdayISO() ? 'bg-peach shadow-brutSm' : 'bg-white'}`}
            >Ayer</button>
          </div>
          <Input
            id="date-field"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: '16px', minHeight: '40px' }}
            className="text-sm"
          />
        </Card>

        {/* Comisión bancaria */}
        <Card tone="white" className="p-3 space-y-2">
          <p className="text-xs font-black uppercase">🏦 Comisión bancaria</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setBankCommission(0)}
              className={`border-3 border-ink rounded-md py-2 text-xs font-bold ${bankCommission === 0 ? 'bg-mint shadow-brutSm' : 'bg-white'}`}
            >Sin comisión</button>
            <button
              type="button"
              onClick={() => setBankCommission(0.31)}
              className={`border-3 border-ink rounded-md py-2 text-xs font-bold ${bankCommission === 0.31 ? 'bg-lemon shadow-brutSm' : 'bg-white'}`}
            >$0.31</button>
            <button
              type="button"
              onClick={() => setBankCommission(0.41)}
              className={`border-3 border-ink rounded-md py-2 text-xs font-bold ${bankCommission === 0.41 ? 'bg-lemon shadow-brutSm' : 'bg-white'}`}
            >$0.41</button>
          </div>
          {bankCommission > 0 && amount && (
            <p className="text-[10px] font-bold uppercase text-ink/70">
              Total que sale del banco: ${(Number(amount) + bankCommission).toFixed(2)}
            </p>
          )}
        </Card>

        {/* Compra diferida + Nota */}
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

        <Button type="submit" full disabled={saving || !amount || showAlexLink}>
          {saving ? 'Guardando…' : showAlexLink ? '⚠️ Usa el módulo Alex' : '💾 Guardar gasto'}
        </Button>
      </form>
    </div>
  );
}
