'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { todayISO } from '@/lib/format';

type Category = { id: number; slug: string; name: string; emoji: string | null; color: string };

type Phase = 'idle' | 'listening' | 'thinking' | 'review';

export function VoiceRecorder({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const recRef = useRef<any>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Datos parseados (editables)
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const supported = typeof window !== 'undefined' &&
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  function start() {
    setError(null);
    setTranscript('');
    setInterim('');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Tu navegador no soporta reconocimiento de voz. Prueba Chrome o Safari.');
      return;
    }
    const rec = new SR();
    rec.lang = 'es-EC';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let final = '';
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else inter += t;
      }
      if (final) setTranscript((prev) => (prev + ' ' + final).trim());
      setInterim(inter);
    };
    rec.onerror = (e: any) => {
      setError(`Error: ${e.error}`);
      setPhase('idle');
    };
    rec.onend = () => {
      setPhase((p) => p === 'listening' ? 'idle' : p);
    };

    recRef.current = rec;
    rec.start();
    setPhase('listening');
  }

  function stop() {
    recRef.current?.stop();
    setPhase('idle');
  }

  async function process() {
    const text = transcript.trim();
    if (!text) {
      setError('No grabé nada todavía.');
      return;
    }
    setPhase('thinking');
    setError(null);
    try {
      const res = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error procesando');

      if (data.amount) setAmount(String(data.amount));
      if (data.date) setDate(data.date);
      if (data.description) setDescription(data.description);
      if (data.category_slug) {
        const c = categories.find((x) => x.slug === data.category_slug);
        if (c) setCategoryId(String(c.id));
      }
      setConfidence(data.confidence ?? '');
      setNeedsReview(!!data.needs_review || data.confidence !== 'alta');
      setAiQuestion(data.question ?? null);
      setPhase('review');
    } catch (e: any) {
      setError(e.message);
      setPhase('idle');
    }
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada');
      const { error: err } = await supabase.from('expenses').insert({
        created_by: user.id,
        amount: Number(amount),
        currency: 'USD',
        description: description || transcript.slice(0, 100),
        category_id: categoryId ? Number(categoryId) : null,
        spent_at: date,
        source: 'voice',
        needs_review: needsReview,
        raw_ocr: { transcript, confidence },
      });
      if (err) throw err;
      router.push('/lista');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => recRef.current?.abort?.(), []);

  if (!supported && phase === 'idle') {
    return (
      <Card tone="peach" className="p-4">
        <p className="font-bold">Tu navegador no soporta reconocimiento de voz nativo.</p>
        <p className="text-sm mt-2">Usa Chrome (Android) o Safari (iOS) para esta función. Mientras tanto puedes usar 📸 Foto o ✏️ Manual.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">🎤 Gasto por voz</h1>
      <p className="text-sm">Habla natural: "almuerzo cincuenta dólares en La Mar" o "gasolina veinte y cinco con cincuenta".</p>

      {phase === 'idle' && !transcript && (
        <Card tone="white" className="p-6 text-center">
          <Button onClick={start} full>
            <span className="text-2xl mr-2">🎤</span>
            <span className="text-lg">Empezar a hablar</span>
          </Button>
        </Card>
      )}

      {phase === 'listening' && (
        <Card tone="bubble" className="p-6 text-center">
          <div className="text-5xl animate-pulse mb-3">🎤</div>
          <p className="font-black text-lg">Escuchando…</p>
          {interim && <p className="text-sm mt-2 italic">{interim}</p>}
          {transcript && <p className="text-sm mt-2 font-bold">"{transcript}"</p>}
          <div className="mt-4">
            <Button onClick={stop} variant="danger">⏹ Parar</Button>
          </div>
        </Card>
      )}

      {phase === 'idle' && transcript && (
        <Card tone="lemon" className="p-4">
          <p className="text-xs font-bold uppercase mb-1">Lo que escuché:</p>
          <p className="text-base font-bold">"{transcript}"</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={process}>✨ Procesar con IA</Button>
            <Button variant="ghost" onClick={() => { setTranscript(''); setInterim(''); }}>Borrar</Button>
            <Button variant="secondary" onClick={start}>🎤 Re-grabar</Button>
          </div>
        </Card>
      )}

      {phase === 'thinking' && (
        <Card tone="sky" className="p-6 text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="font-black">Analizando con Claude Haiku…</p>
        </Card>
      )}

      {phase === 'review' && (
        <>
          {aiQuestion && (
            <Card tone="peach" className="p-3">
              <p className="font-bold text-sm">🤔 La IA pregunta:</p>
              <p className="text-sm mt-1">{aiQuestion}</p>
            </Card>
          )}

          <Card tone="white" className="p-4 space-y-3">
            <div>
              <Label htmlFor="vamount">Monto (USD)</Label>
              <input
                id="vamount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(',', '.'))}
                className="w-full text-3xl font-black text-center border-3 border-ink rounded-md py-2 bg-bg shadow-brutSm focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <Label htmlFor="vcat">Categoría</Label>
              <select
                id="vcat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border-3 border-ink rounded-md px-3 py-2 bg-white shadow-brutSm font-bold"
              >
                <option value="">— elegir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vdate">Fecha</Label>
                <Input id="vdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="vdesc">Descripción</Label>
                <Input id="vdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resumen" />
              </div>
            </div>
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={needsReview}
                onChange={(e) => setNeedsReview(e.target.checked)}
                className="w-5 h-5 border-3 border-ink"
              />
              <span className="text-sm font-bold">🔍 Marcar como "verificar"</span>
            </label>
            {confidence && <Badge tone={confidence === 'alta' ? 'mint' : confidence === 'media' ? 'lemon' : 'peach'}>Confianza IA: {confidence}</Badge>}
          </Card>

          {error && <p className="text-sm font-bold text-red-700">{error}</p>}

          <Button onClick={save} disabled={saving || !amount} full>
            {saving ? 'Guardando…' : '💾 Guardar gasto'}
          </Button>
          <Button variant="ghost" onClick={() => { setPhase('idle'); setTranscript(''); setInterim(''); setAmount(''); setDescription(''); setCategoryId(''); }} full>
            ← Volver a empezar
          </Button>
        </>
      )}

      {error && phase !== 'review' && (
        <p className="text-sm font-bold text-red-700">{error}</p>
      )}
    </div>
  );
}
