'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { crearPrestamo } from '@/lib/alex';
import { todayISO } from '@/lib/format';

export function AddPrestamoForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <Button variant="ghost" onClick={() => setOpen(true)}>+ Nuevo préstamo</Button>;
  }

  return (
    <Card tone="bubble" className="p-4">
      <h3 className="font-black text-sm uppercase mb-3">Nuevo préstamo a Alex</h3>
      <form action={crearPrestamo} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pmonto">Monto (USD)</Label>
            <Input id="pmonto" name="monto" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" required placeholder="200" />
          </div>
          <div>
            <Label htmlFor="pcuotas">Cuotas</Label>
            <Input id="pcuotas" name="cuotas" type="number" min={1} max={12} required defaultValue={4} />
          </div>
        </div>
        <div>
          <Label htmlFor="pfecha">Fecha del préstamo</Label>
          <Input id="pfecha" name="fecha" type="date" required defaultValue={todayISO()} />
        </div>
        <div>
          <Label htmlFor="pdesc">Descripción</Label>
          <Input id="pdesc" name="descripcion" placeholder="..." />
        </div>
        <p className="text-xs">Se generan {1} cuotas planeadas, se descuenta cada vez que confirmas.</p>
        <div className="flex gap-2">
          <Button type="submit">💾 Crear préstamo</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
