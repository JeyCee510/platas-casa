'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export function ExportWhatsApp({ texto, mes, anio }: { texto: string; mes: number; anio: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar. Copia el texto manualmente.');
    }
  }

  function shareWhatsApp() {
    const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
    window.open(url, '_blank');
  }

  if (!open) {
    return <Button variant="ghost" onClick={() => setOpen(true)}>📲 Exportar resumen WhatsApp</Button>;
  }

  return (
    <Card tone="lemon" className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xs uppercase">Resumen WhatsApp · {MESES[mes - 1]} {anio}</h3>
        <button onClick={() => setOpen(false)} className="text-xs underline font-bold">Cerrar</button>
      </div>
      <pre className="border-3 border-ink rounded-md bg-white p-2 text-[11px] whitespace-pre-wrap font-mono max-h-64 overflow-auto">{texto || 'Sin pagos en este mes.'}</pre>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={copy} variant="primary">{copied ? '✓ Copiado' : '📋 Copiar'}</Button>
        <Button onClick={shareWhatsApp} variant="secondary">📲 Abrir WhatsApp</Button>
      </div>
    </Card>
  );
}
