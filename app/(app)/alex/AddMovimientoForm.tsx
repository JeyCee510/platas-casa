'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label } from '@/components/ui/Input';
import { crearMovimiento } from '@/lib/alex';

type Concept = { id: number; nombre: string; monto_tipo: number | null; es_extra_default: boolean };

export function AddMovimientoForm({ concepts, fechaDefault }: { concepts: Concept[]; fechaDefault: string }) {
  const [open, setOpen] = useState(false);
  const [conceptoId, setConceptoId] = useState<string>(String(concepts[0]?.id ?? ''));
  const [monto, setMonto] = useState('');
  const [esExtra, setEsExtra] = useState(false);

  const concepto = concepts.find((c) => String(c.id) === conceptoId);
  // Auto-llenar monto sugerido y flag extra cuando cambia concepto
  function onConceptoChange(id: string) {
    setConceptoId(id);
    const c = concepts.find((x) => String(x.id) === id);
    if (c?.monto_tipo) setMonto(String(c.monto_tipo));
    if (c) setEsExtra(c.es_extra_default);
  }

  if (!open) {
    return <Button variant="secondary" onClick={() => setOpen(true)}>+ Registrar pago</Button>;
  }

  return (
    <Card tone="lemon" className="p-4">
      <h3 className="font-black text-sm uppercase mb-3">Nuevo pago</h3>
      <form action={crearMovimiento} className="space-y-3">
        <div>
          <Label htmlFor="concepto">Concepto</Label>
          <Select id="concepto" name="concepto_id" value={conceptoId} onChange={(e) => onConceptoChange(e.target.value)}>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}{c.monto_tipo ? ` · $${c.monto_tipo}` : ''}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="monto">Monto (USD)</Label>
          <Input id="monto" name="monto" type="number" inputMode="decimal" step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" required defaultValue={fechaDefault} />
        </div>
        <div>
          <Label htmlFor="nota">Nota (opcional)</Label>
          <Input id="nota" name="nota" placeholder="..." />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="es_extra" checked={esExtra} onChange={(e) => setEsExtra(e.target.checked)} className="w-5 h-5 border-3 border-ink" />
          <span className="text-sm font-bold">Extra (no cuenta al sueldo de $570)</span>
        </label>
        <div className="flex gap-2">
          <Button type="submit">💾 Guardar</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
