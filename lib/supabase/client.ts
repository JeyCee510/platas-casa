'use client';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    schema ? { db: { schema: schema as any } } : undefined
  );
}
