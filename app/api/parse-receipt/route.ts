import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CATEGORIES = [
  'supermercado', 'servicios', 'transporte', 'salud',
  'educacion', 'casa', 'restaurante', 'ocio', 'otros',
];

export async function POST(req: Request) {
  // Auth
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' }, { status: 500 });
  }

  // Leer archivo
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen demasiado grande (máx 8MB)' }, { status: 400 });
  }

  const arrBuf = await file.arrayBuffer();
  const base64 = Buffer.from(arrBuf).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Eres un asistente que extrae información de boletas/recibos.
Devuelves SOLO JSON válido, sin texto extra, con esta forma exacta:
{
  "amount": number | null,         // total en USD (convertir si es otra moneda usando contexto del recibo)
  "date": "YYYY-MM-DD" | null,     // fecha del gasto, si no se ve usa ${today}
  "description": string | null,    // nombre comercio o resumen breve (máx 50 chars)
  "category_slug": string | null,  // uno de: ${CATEGORIES.join(', ')}
  "confidence": "alta" | "media" | "baja",
  "question": string | null        // si algo crítico falta o es ambiguo, pregunta corta para el usuario, en español. Si todo claro, null
}
Reglas:
- Si no puedes leer el monto, deja amount=null y pon una question.
- Si la moneda no es USD, convierte aproximadamente y menciona en description.
- Categoriza usando el comercio/items: super=supermercado, gas/luz/agua/internet=servicios, gasolinera/uber/taxi=transporte, farmacia/clínica=salud, colegio/libros=educacion, ferretería/muebles=casa, restaurante/café=restaurante, cine/juegos=ocio, resto=otros.
- NUNCA inventes datos. Si dudas, deja null y pon question.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Extrae los datos de esta boleta y devuelve SOLO el JSON descrito.' },
          ],
        },
      ],
    });

    const textBlock = resp.content.find((b) => b.type === 'text') as any;
    const raw = textBlock?.text ?? '';
    // Robustez: extraer primer bloque JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Respuesta inválida de IA', raw }, { status: 502 });
    const parsed = JSON.parse(match[0]);

    // Validar category_slug
    if (parsed.category_slug && !CATEGORIES.includes(parsed.category_slug)) {
      parsed.category_slug = 'otros';
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error procesando' }, { status: 500 });
  }
}
