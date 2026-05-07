'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { ROLE_LABEL, type Role } from '@/lib/role';

const OPTIONS: Role[] = ['admin', 'full', 'limited', 'readonly'];

export function UserRoleEditor({ email, currentRole }: { email: string; currentRole: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (selected === currentRole) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('set_user_role', { target_email: email, new_role: selected });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((r) => {
          const active = selected === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={`border-3 border-ink rounded-md px-2 py-1.5 text-[11px] font-bold ${active ? 'bg-lemon shadow-brutSm' : 'bg-white'}`}
            >
              {ROLE_LABEL[r]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
      {selected !== currentRole && (
        <Button onClick={save} disabled={saving} variant="primary">
          {saving ? 'Guardando…' : `💾 Cambiar a ${ROLE_LABEL[selected as Role]}`}
        </Button>
      )}
    </div>
  );
}
