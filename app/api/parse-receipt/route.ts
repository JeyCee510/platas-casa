import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callHaikuJSON, CATEGORY_SLUGS } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Imagen demasiado grande (máx 8MB)' }, { status: 400 });

  const arrBuf = await file.arrayBuffer();
  const base64 = Buffer.from(arrBuf).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Extrae datos de boletas/recibos en español. Devuelve SOLO JSON:
{
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "description": string | null,
  "category_slug": string | null,
  "confidence": "alta" | "media" | "baja",
  "question": string | null
}
- amount: total en USD. Convierte si es otra moneda.
- date: si no se ve, usa ${today}.
- description: nombre comercio o resumen breve (máx 50 chars).
- category_slug: uno de [${CATEGORY_SLUGS.join(', ')}]. Categoriza por comercio/items.
- Si dudas en algo crítico, deja null y pon question (corta, en español).
- NUNCA inventes datos.`;

  try {
    const parsed = await callHaikuJSON({
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extrae los datos de esta boleta y devuelve SOLO el JSON descrito.' },
        ],
      }],
      maxTokens: 400,
    });
    if (parsed.category_slug && !CATEGORY_SLUGS.includes(parsed.category_slug)) {
      parsed.category_slug = null;
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error procesando' }, { status: 500 });
  }
}
