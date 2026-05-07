'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { toggleConcepto } from '@/lib/alex';

type Concept = { id: number; nombre: string; activo: boolean; orden: number };

export function ConceptosToggle({ todos }: { todos: Concept[] }) {
  const [open, setOpen] = useState(false);
  const inactivos = todos.filter((c) => !c.activo).sort((a, b) => a.orden - b.orden);
  const activos = todos.filter((c) => c.activo).sort((a, b) => a.orden - b.orden);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs underline font-bold text-ink/70">
        ⚙️ Gestionar conceptos ({activos.length} activos · {inactivos.length} ocultos)
      </button>
    );
  }

  return (
    <Card tone="white" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-xs uppercase">Conceptos</h3>
        <button onClick={() => setOpen(false)} className="text-xs underline font-bold">Cerrar</button>
      </div>
      <p className="text-[10px] text-ink/70 mb-2">Activa o desactiva conceptos para que aparezcan o no en el form de pago.</p>

      <div className="grid grid-cols-2 gap-1 text-xs">
        {[...activos, ...inactivos].map((c) => (
          <form key={c.id} action={toggleConcepto}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className={`w-full border-3 border-ink rounded-md px-2 py-1.5 text-left font-bold ${c.activo ? 'bg-mint' : 'bg-white opacity-60'}`}
            >
              {c.activo ? '✓ ' : '○ '}{c.nombre}
            </button>
          </form>
        ))}
      </div>
    </Card>
  );
}
