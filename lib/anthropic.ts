// Helper compartido para llamar a Claude Haiku con respuesta JSON estructurada.
// Usado por /api/parse-receipt (vision) y /api/parse-voice (texto).

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';

export const ALEX_BLOCKED = false; // placeholder por si más adelante hay que bloquear features

export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY en el servidor');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Llama a Haiku con un system prompt y user content (texto y/o imágenes).
 * Extrae el primer bloque JSON `{...}` de la respuesta y lo parsea.
 * Lanza error si no encuentra JSON o falla el parseo.
 */
export async function callHaikuJSON(opts: {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
}): Promise<any> {
  const client = getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 400,
    system: opts.system,
    messages: opts.messages,
  });
  const textBlock = resp.content.find((b) => b.type === 'text') as any;
  const raw = textBlock?.text ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Respuesta inválida de IA');
  return JSON.parse(match[0]);
}

export const CATEGORY_SLUGS = [
  // grupos
  'grp-casa', 'grp-alimentacion', 'grp-restaurantes', 'grp-domestico', 'grp-salud',
  'grp-transporte', 'grp-personal', 'grp-ninos', 'grp-suscripciones', 'grp-ocio', 'grp-pagos',
  // subcategorías comunes (las que IA debería conocer)
  'alquiler', 'luz', 'agua', 'netlife', 'arreglos',
  'supermaxi', 'fruteria', 'panaderia', 'tienda', 'vecino-lucho', 'meatme', 'tipti',
  'restaurante', 'cafe', 'bar', 'comida-rapida',
  'alex', 'iess-alex',
  'seguro-salud-jc', 'seguro-salud-ac', 'iess-jc', 'farmacia', 'medico',
  'gasolina', 'mecanica', 'seguro-auto', 'legales-auto', 'taxi-uber',
  'ropa', 'cuidado-personal', 'legales-personal',
  'panales', 'colegio', 'libros-ninos', 'actividades-ninos',
  'netflix', 'spotify', 'prime', 'apple',
  'salidas', 'regalos', 'hobbies', 'viajes',
];
