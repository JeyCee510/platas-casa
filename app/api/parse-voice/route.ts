import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callHaikuJSON, CATEGORY_SLUGS } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: 'Texto demasiado largo (máx 500)' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const systemPrompt = `Extrae info de un gasto descrito por voz en español.
Ej: "gasté veinte dólares en supermaxi" o "almuerzo cincuenta y cinco con noventa en La Mar".
Devuelve SOLO JSON:
{
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "description": string | null,
  "category_slug": string | null,
  "confidence": "alta" | "media" | "baja",
  "needs_review": boolean,
  "question": string | null
}
- amount: convierte palabras a número ("veinte" → 20).
- date: hoy = ${today}. ayer = ${ayer}.
- category_slug: uno de [${CATEGORY_SLUGS.join(', ')}].
- Si no puedes inferir monto, amount=null y needs_review=true.
- Si descripción ambigua, needs_review=true.
- NUNCA inventes datos.`;

  try {
    const parsed = await callHaikuJSON({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Texto del usuario: "${text}"` }],
      maxTokens: 350,
    });
    if (parsed.category_slug && !CATEGORY_SLUGS.includes(parsed.category_slug)) {
      parsed.category_slug = null;
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error procesando' }, { status: 500 });
  }
}
