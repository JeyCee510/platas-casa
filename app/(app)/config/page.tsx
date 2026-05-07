import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdmin, ROLE_LABEL, ROLE_DESC } from '@/lib/role';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserRoleEditor } from './UserRoleEditor';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) redirect('/');

  // Listar usuarios via RPC
  const { data: users } = await supabase.rpc('list_users_with_roles');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-ink/70">Configuración</p>
        <h1 className="text-2xl font-black">Permisos y usuarios</h1>
        <p className="text-xs">Solo tú (admin) puedes cambiar permisos del hogar.</p>
      </div>

      <Card tone="lemon" className="p-4">
        <h2 className="font-black text-sm uppercase mb-2">📚 Niveles de acceso</h2>
        <ul className="space-y-2 text-xs">
          {(['admin','full','limited','readonly'] as const).map((r) => (
            <li key={r} className="border-3 border-ink rounded-md bg-white p-2">
              <p className="font-black">{ROLE_LABEL[r]}</p>
              <p className="text-[11px] mt-0.5">{ROLE_DESC[r]}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="white" className="overflow-hidden">
        <div className="bg-bg border-b-3 border-ink px-3 py-1.5">
          <p className="text-xs font-black uppercase">Usuarios del hogar</p>
        </div>
        {!users || users.length === 0 ? (
          <p className="p-4 text-xs text-center font-bold">Sin usuarios.</p>
        ) : (
          <ul className="divide-y-3 divide-ink">
            {(users as any[]).map((u) => (
              <li key={u.email} className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">{u.name}</p>
                    <p className="text-[10px] text-ink/70">{u.email}</p>
                  </div>
                  <Badge tone={u.role === 'admin' ? 'mint' : u.role === 'full' ? 'sky' : u.role === 'limited' ? 'lemon' : 'peach'}>
                    {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role}
                  </Badge>
                </div>
                {u.email !== user?.email && (
                  <UserRoleEditor email={u.email} currentRole={u.role} />
                )}
                {u.email === user?.email && (
                  <p className="text-[10px] italic text-ink/70">No puedes cambiar tu propio rol.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs"><Link href="/" className="underline font-bold">← Volver al inicio</Link></p>
    </div>
  );
}
