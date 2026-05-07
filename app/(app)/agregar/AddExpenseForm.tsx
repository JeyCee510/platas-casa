'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { todayISO } from '@/lib/format';

type Category = { id: number; slug: string; name: string; emoji: string | null; color: string };

export function AddExpenseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  function onPickPhoto(file: File) {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    void parsePhoto(file);
  }

  async function parsePhoto(file: File) {
    setParsing(true);
    setError(null);
    setAiQuestion(null);
    setAiNote(null);
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
      if (data.question) setAiQuestion(data.question);
      else setAiNote('✨ Datos extraídos. Revisa y guarda.');
    } catch (e: any) {
      setError(e.message);
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
        source: photo ? 'photo' : 'manual',
        receipt_url,
      });
      if (insErr) throw insErr;

      router.push('/');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Agregar gasto</h1>
      <p className="text-sm mb-6">Manual o sube una foto de la boleta y el sistema lee.</p>

      {/* Bloque foto */}
      <Card tone="lemon" className="p-5 mb-6">
        <Label>📸 Foto de boleta (opcional)</Label>
        <div className="flex flex-wrap gap-3 items-center">
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
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            {photo ? '📷 Cambiar foto' : '📷 Tomar / subir foto'}
          </Button>
          {parsing && <span className="font-bold text-sm">Leyendo boleta…</span>}
        </div>
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPreview} alt="boleta" className="mt-3 max-h-48 border-3 border-ink rounded-md shadow-brutSm" />
        )}
        {aiQuestion && (
          <Card tone="peach" className="p-3 mt-3">
            <p className="font-bold text-sm">🤔 La IA pregunta:</p>
            <p className="text-sm mt-1">{aiQuestion}</p>
          </Card>
        )}
        {aiNote && <p className="text-sm font-bold mt-3">{aiNote}</p>}
      </Card>

      {/* Formulario */}
      <Card tone="white" className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Monto (USD)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— elegir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="desc">Descripción</Label>
            <Textarea id="desc" rows={2} placeholder="Ej: Jumbo semanal" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm font-bold text-red-700">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : '💾 Guardar gasto'}</Button>
            <Button type="button" variant="ghost" onClick={() => history.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
