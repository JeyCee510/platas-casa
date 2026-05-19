import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';
import { Card } from '@/components/ui/Card';
import { getRole, isBlocked } from '@/lib/role';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user);

  // Bloqueo total para role 'none' — usuario pausado.
  if (isBlocked(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card tone="white" className="max-w-md w-full p-8 text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-black">Acceso pausado</h1>
          <p className="text-sm">
            Tu cuenta está activa pero el acceso a Platas Casa está temporalmente deshabilitado.
            Pídele a Juan que te re-active.
          </p>
          <form action="/auth/signout" method="post">
            <button className="text-xs underline font-bold">Cerrar sesión</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <TopBar user={user ?? null} />
      <main className="max-w-2xl mx-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      <BottomNav role={role as any} />
    </div>
  );
}
