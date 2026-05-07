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
    return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const body = await req.json().catch(() => null) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: 'Texto demasiado largo (máx 500)' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Eres un asistente que extrae información de un gasto descrito por voz en español.
El usuario dice algo corto como "gasté veinte dólares en supermercado" o "almuerzo cincuenta y cinco con noventa en La Mar".
Devuelves SOLO JSON válido, sin texto extra, con esta forma exacta:
{
  "amount": number | null,         // monto en USD (convierte palabras a número: "veinte" → 20, "cincuenta y cinco con noventa" → 55.90)
  "date": "YYYY-MM-DD" | null,     // fecha. Si no se menciona usa hoy: ${today}. "ayer" = ${new Date(Date.now()-86400000).toISOString().slice(0,10)}
  "description": string | null,    // resumen corto del gasto (máx 50 chars)
  "category_slug": string | null,  // uno de: ${CATEGORIES.join(', ')}
  "confidence": "alta" | "media" | "baja",
  "needs_review": boolean,         // true si confidence != alta o si el monto/categoría no se pueden inferir con seguridad
  "question": string | null        // si algo crítico falta o es ambiguo, pregunta corta para el usuario en español. Si todo claro, null
}
Reglas:
- Si no puedes inferir el monto, amount=null y needs_review=true.
- Categoriza con sentido común: super=supermercado, gas/luz/agua/internet=servicios, gasolina/uber/taxi=transporte, farmacia/medicina/clínica=salud, colegio/libros=educacion, ferretería/muebles=casa, restaurante/almuerzo/café=restaurante, cine/juegos=ocio, cualquier otro=otros.
- Si la descripción es muy ambigua, needs_review=true.
- NUNCA inventes montos. Si dudas, deja null.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Texto del usuario: "${text}"` }],
    });

    const textBlock = resp.content.find((b) => b.type === 'text') as any;
    const raw = textBlock?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Respuesta inválida de IA', raw }, { status: 502 });
    const parsed = JSON.parse(match[0]);

    if (parsed.category_slug && !CATEGORIES.includes(parsed.category_slug)) {
      parsed.category_slug = 'otros';
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error procesando' }, { status: 500 });
  }
}
