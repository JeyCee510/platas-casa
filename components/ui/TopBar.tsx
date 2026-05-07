'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { userShortName } from '@/lib/userName';
import { isAdmin } from '@/lib/role';

export function TopBar({ user }: { user?: { email?: string | null; user_metadata?: any; app_metadata?: any } | null }) {
  const router = useRouter();
  const name = userShortName(user);
  const admin = isAdmin(user);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b-3 border-ink bg-mint">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 flex items-end justify-between gap-2">
        <Link
          href="/"
          className="inline-block bg-white border-3 border-ink rounded-md px-3 py-1.5 shadow-brut hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutSm transition-transform"
        >
          <span className="font-black text-2xl sm:text-3xl tracking-tight leading-none block">
            PLATAS·CASA
          </span>
        </Link>
        <div className="flex items-center gap-2 pb-1">
          {name && <span className="text-sm font-black">{name}</span>}
          {admin && (
            <Link
              href="/config"
              className="px-2 py-1 border-3 border-ink rounded-md font-bold text-xs bg-lemon shadow-brutSm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Configuración"
            >
              ⚙️
            </Link>
          )}
          <button
            onClick={logout}
            className="px-2.5 py-1 border-3 border-ink rounded-md font-bold text-xs bg-peach shadow-brutSm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
