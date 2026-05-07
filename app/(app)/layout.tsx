import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';
import { getRole } from '@/lib/role';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getRole(user);

  return (
    <div className="min-h-screen pb-24">
      <TopBar user={user ?? null} />
      <main className="max-w-2xl mx-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
