import { createClient } from '@/lib/supabase/server';
import { VoiceRecorder } from './VoiceRecorder';

export const dynamic = 'force-dynamic';

export default async function VozPage() {
  const supabase = createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('id');
  return <VoiceRecorder categories={categories ?? []} />;
}
