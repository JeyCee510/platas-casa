import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  url.pathname = '/login';
  return NextResponse.redirect(url, { status: 303 });
}
