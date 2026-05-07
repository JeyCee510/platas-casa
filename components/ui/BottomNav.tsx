'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabsAdmin = [
  { href: '/',          label: 'Inicio',  emoji: '🏠' },
  { href: '/lista',     label: 'Lista',   emoji: '📋' },
  { href: '/agregar',   label: 'Gasto',   emoji: '➕', primary: true },
  { href: '/cuentas',   label: 'Cuentas', emoji: '💳' },
  { href: '/reporte',   label: 'Reporte', emoji: '📊' },
];

const tabsLimited = [
  { href: '/',          label: 'Inicio',  emoji: '🏠' },
  { href: '/lista',     label: 'Mis',     emoji: '📋' },
  { href: '/agregar',   label: 'Gasto',   emoji: '➕', primary: true },
];

export function BottomNav({ role = 'admin' }: { role?: 'admin' | 'limited' }) {
  const pathname = usePathname();
  const tabs = role === 'limited' ? tabsLimited : tabsAdmin;
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t-3 border-ink bg-mint shadow-[0_-4px_0_0_#0A0A0A]"
      aria-label="Navegación principal"
    >
      <ul className={`grid ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-3'} max-w-2xl mx-auto`}>
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href));
          if (t.primary) {
            return (
              <li key={t.href} className="relative">
                <Link
                  href={t.href}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 bg-sky border-3 border-ink rounded-full w-16 h-16 shadow-brut flex flex-col items-center justify-center font-black text-2xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  aria-label="Agregar gasto"
                >
                  {t.emoji}
                </Link>
                <span className="block h-16" aria-hidden="true" />
              </li>
            );
          }
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center justify-center py-2 px-1 text-[11px] font-bold leading-none ${
                  active ? 'text-ink' : 'text-ink/60'
                }`}
              >
                <span className={`text-xl mb-0.5 ${active ? '' : 'opacity-70'}`}>{t.emoji}</span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
