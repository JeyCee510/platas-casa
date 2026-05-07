'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/agregar', label: '+ Gasto' },
  { href: '/lista', label: 'Lista' },
  { href: '/reporte', label: 'Reporte' },
];

export function Nav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b-3 border-ink bg-mint">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="font-black text-xl tracking-tight">PLATAS·CASA</Link>
        <nav className="flex gap-2 flex-wrap">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1 border-3 border-ink rounded-md font-bold text-sm shadow-brutSm bg-white ${active ? 'translate-x-[2px] translate-y-[2px] shadow-none bg-lemon' : 'hover:bg-bg'}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {email && <span className="hidden sm:inline text-sm font-medium">{email}</span>}
          <button
            onClick={logout}
            className="px-3 py-1 border-3 border-ink rounded-md font-bold text-sm bg-peach shadow-brutSm hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
