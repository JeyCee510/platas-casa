'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  async function onDelete() {
    if (!confirm('¿Borrar este gasto?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) alert(error.message);
    else router.refresh();
  }
  return (
    <button
      onClick={onDelete}
      title="Borrar"
      className="border-3 border-ink rounded-md w-9 h-9 bg-peach shadow-brutSm font-black hover:translate-x-[1px] hover:translate-y-[1px]"
    >×</button>
  );
}
