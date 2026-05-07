'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { userShortName } from '@/lib/userName';

export function TopBar({ user }: { user?: { email?: string | null; user_metadata?: any } | null }) {
  const router = useRouter();
  const name = userShortName(user);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b-3 border-ink bg-mint">
      <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <Link href="/" className="font-black text-base sm:text-xl tracking-tight">
          PLATAS·CASA
        </Link>
        <div className="flex items-center gap-2">
          {name && <span className="text-sm font-bold">{name}</span>}
          <button
            onClick={logout}
            className="px-2.5 py-1 border-3 border-ink rounded-md font-bold text-xs bg-peach shadow-brutSm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
