import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen pb-24">
      <TopBar user={user ?? null} />
      <main className="max-w-2xl mx-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
