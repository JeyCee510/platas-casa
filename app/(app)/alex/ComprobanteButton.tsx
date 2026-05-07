'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TIPOS_VALIDOS = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
  'application/pdf',
]);

export function ComprobanteButton({ movimientoId, comprobante }: { movimientoId: number; comprobante: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pickAndUpload() {
    fileRef.current?.click();
  }

  async function viewComprobante() {
    if (!comprobante) return;
    const supabase = createClient();
    // El path es algo como "alex-comprobantes/123-xxxx.jpg" o legacy "uploads/alex/xxx.pdf" del SQLite
    let path = comprobante;
    if (comprobante.startsWith('uploads/alex/')) {
      // Path legacy del SQLite — el archivo no está aún en Supabase Storage. Avisar.
      alert('Este comprobante venía del sistema antiguo y aún no está migrado al nuevo storage. Sube uno nuevo si lo necesitas.');
      return;
    }
    const { data, error } = await supabase.storage.from('alex-comprobantes').createSignedUrl(path, 60);
    if (error) { alert(error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TIPOS_VALIDOS.has(file.type)) { alert('Tipo no permitido (jpg/png/heic/webp/pdf)'); return; }
    if (file.size > 15 * 1024 * 1024) { alert('Archivo > 15MB'); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `${movimientoId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('alex-comprobantes').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from('alex_movements').update({ comprobante: path }).eq('id', movimientoId);
      if (updErr) throw updErr;
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      {comprobante ? (
        <button
          type="button"
          onClick={viewComprobante}
          title="Ver comprobante"
          className="border-3 border-ink rounded-md w-8 h-8 bg-mint shadow-brutSm font-black text-sm"
        >📎</button>
      ) : (
        <button
          type="button"
          onClick={pickAndUpload}
          disabled={busy}
          title="Subir comprobante"
          className="border-3 border-ink rounded-md w-8 h-8 bg-white shadow-brutSm font-black text-sm opacity-70"
        >{busy ? '…' : '📤'}</button>
      )}
    </>
  );
}
