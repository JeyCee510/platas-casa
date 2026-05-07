'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { todayISO } from '@/lib/format';

type Category = { id: number; slug: string; name: string; emoji: string | null; color: string };

const COLOR_BG: Record<string, string> = {
  mint: 'bg-mint', sky: 'bg-sky', peach: 'bg-peach', lemon: 'bg-lemon',
  lilac: 'bg-lilac', bubble: 'bg-bubble', teal: 'bg-teal',
};

export function AddExpenseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const source = params.get('source') ?? 'manual'; // manual | foto | voz
  const fileRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);

  // Auto-abrir cámara al entrar con source=foto
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
    setParsing(true);
    setError(null);
    setAiQuestion(null);
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
        if (c) setCategoryId(String(c.id));
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
    setSaving(true);
    setError(null);
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

      const { error: insErr } = await supabase.from('expenses').insert({
        created_by: user.id,
        amount: Number(amount),
        currency: 'USD',
        description: description || null,
        category_id: categoryId ? Number(categoryId) : null,
        spent_at: date,
        source: photo ? 'photo' : (source === 'voz' ? 'voice' : 'manual'),
        receipt_url,
        needs_review: needsReview,
      });
      if (insErr) throw insErr;

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Nuevo gasto</h1>

      {/* Foto preview / botón si source=foto o quieren agregar */}
      {(source === 'foto' || photo) && (
        <Card tone="lemon" className="p-4">
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
              📸 Tomar foto de boleta
            </Button>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview!} alt="boleta" className="max-h-40 mx-auto border-3 border-ink rounded-md shadow-brutSm" />
              <p className="text-xs font-bold mt-2 text-center">
                {parsing ? '🔍 Leyendo boleta...' : '✨ Datos extraídos. Revisa abajo.'}
              </p>
              {aiQuestion && (
                <Card tone="peach" className="p-2 mt-2">
                  <p className="text-xs font-bold">🤔 {aiQuestion}</p>
                </Card>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs underline font-bold w-full text-center">
                Cambiar foto
              </button>
            </>
          )}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Monto gigante */}
        <Card tone="white" className="p-4">
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
            className="w-full text-4xl font-black text-center border-3 border-ink rounded-md py-3 bg-bg shadow-brutSm focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-transform tabular-nums"
            autoFocus={source === 'manual'}
          />
        </Card>

        {/* Categorías como chips */}
        <Card tone="white" className="p-4">
          <Label>Categoría</Label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => {
              const selected = categoryId === String(c.id);
              const bg = selected ? (COLOR_BG[c.color] ?? 'bg-sky') : 'bg-white';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(String(c.id))}
                  className={`border-3 border-ink rounded-md px-2 py-3 font-bold text-xs ${bg} ${selected ? 'shadow-brutSm' : 'opacity-80'} active:translate-x-[1px] active:translate-y-[1px]`}
                >
                  <div className="text-2xl mb-0.5">{c.emoji}</div>
                  <div className="leading-tight">{c.name}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Fecha y descripción colapsadas */}
        <Card tone="white" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Fecha</Label>
            <button type="button" onClick={() => setShowDate(!showDate)} className="text-xs underline font-bold">
              {dateLabel} · cambiar
            </button>
          </div>
          {showDate && (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          <div>
            <Label htmlFor="desc">Descripción (opcional)</Label>
            <Textarea id="desc" rows={2} placeholder="Ej: Jumbo Costanera" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </Card>

        {/* Flag verificar */}
        <label className="flex items-center gap-2 px-2">
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => setNeedsReview(e.target.checked)}
            className="w-5 h-5 border-3 border-ink"
          />
          <span className="text-sm font-bold">🔍 Marcar como "verificar"</span>
        </label>

        {error && <p className="text-sm font-bold text-red-700 px-2">{error}</p>}

        <div className="flex gap-2 sticky bottom-24">
          <Button type="submit" full disabled={saving || !amount}>
            {saving ? 'Guardando…' : '💾 Guardar gasto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
