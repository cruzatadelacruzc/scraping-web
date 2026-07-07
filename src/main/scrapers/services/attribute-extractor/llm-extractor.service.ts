import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ILogger } from '@shared/logger.interface';

// ---- Zod output schema -----------------------------------------------------
const KeywordsOutputSchema = z.object({
  keywords: z.array(z.string()).max(5).describe('Hasta 5 keywords relevantes del producto para búsqueda y filtrado'),
});

type KeywordsOutput = z.infer<typeof KeywordsOutputSchema>;

// ---- env validation --------------------------------------------------------
function validateEnv(log?: Pick<ILogger, 'warn'>): { apiKey: string; model: string; baseURL: string } | null {
  const baseURL = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();

  if (!baseURL || !model || !apiKey) {
    const missing = [!baseURL && 'LLM_BASE_URL', !model && 'LLM_MODEL', !apiKey && 'LLM_API_KEY'].filter(Boolean).join(', ');
    log?.warn(`LLM extraction skipped — missing env vars: ${missing}`);
    return null;
  }

  return { apiKey, model, baseURL };
}

// ---- fallback system prompt (Few-Shot, ~600 tokens) ------------------------
// Used when the DB-stored prompt (llm:keyword-extraction-prompt) is unavailable.
export const FALLBACK_SYSTEM_PROMPT =
  'Eres un asistente de clasificación de anuncios clasificados cubanos (Revolico). ' +
  'Tu tarea es extraer hasta 5 keywords que representen el producto anunciado.\n\n' +
  'REGLAS ESTRICTAS:\n' +
  '- Solo incluye información que aparezca EXPLÍCITAMENTE en la descripción.\n' +
  '- No inventes marcas, precios, ubicaciones ni características que no estén escritas.\n' +
  '- Prefiere frases cortas de 1 a 3 palabras (ej: "casa independiente", "iphone 14").\n' +
  '- Incluye: tipo de producto, marca/modelo si aplica, ubicación, condición, ' +
  'características distintivas (cuartos, baños, garaje, almacenamiento, color, etc.).\n' +
  '- Omite palabras vacías de venta: "se vende", "vendo", "venta de", "precio", "oferta".\n' +
  '- Ordena las keywords por relevancia (lo más distintivo primero).\n\n' +
  'EJEMPLO 1:\n' +
  'Descripción: "Apartamento en Miramar 3 cuartos 2 baños excelente estado"\n' +
  'Keywords: ["apartamento", "miramar", "3 cuartos", "2 baños", "excelente estado"]\n\n' +
  'EJEMPLO 2:\n' +
  'Descripción: "iPhone 14 Pro Max 256GB negro como nuevo con garantía"\n' +
  'Keywords: ["iphone 14 pro max", "256gb", "negro", "como nuevo", "con garantía"]\n\n' +
  'EJEMPLO 3:\n' +
  'Descripción: "Casa independiente biplanta en Playa con garaje 4 cuartos"\n' +
  'Keywords: ["casa independiente", "playa", "biplanta", "garaje", "4 cuartos"]\n\n' +
  'EJEMPLO 4:\n' +
  'Descripción: "Vendo Laptop Dell Inspiron 15 3000 Series 8GB RAM"\n' +
  'Keywords: ["laptop", "dell inspiron", "15 pulgadas", "8gb ram", "laptop dell"]\n\n' +
  'EJEMPLO 5:\n' +
  'Descripción: "Se vende auto Hyundai Accent 2018 azul impecable"\n' +
  'Keywords: ["hyundai accent", "2018", "azul", "impecable", "auto"]\n\n' +
  'Responde ÚNICAMENTE con el objeto JSON { "keywords": [...] }. Nada más.';

// ---- public API ------------------------------------------------------------

/**
 * Extracts up to 5 keywords from a product description using an LLM.
 *
 * Fully provider-agnostic — reads `LLM_BASE_URL`, `LLM_MODEL`, and
 * `LLM_API_KEY` from the environment. Works with any OpenAI-compatible
 * API (DeepSeek, OpenAI, Anthropic, custom proxies, etc.) via
 * `@ai-sdk/openai-compatible`.
 *
 * Returns `{ keywords: [] }` on any failure (missing env, network error,
 * timeout, bad response) — never throws.
 *
 * @param {string} description  - The raw listing description.
 * @param {Pick<ILogger, 'warn'>} [log] - Optional logger for diagnostics.
 * @param {string} [systemPrompt] - System prompt override (falls back to
 *   hardcoded prompt and finally to DB-stored llm:keyword-extraction-prompt).
 * @returns {Promise<KeywordsOutput>} Up to 5 keywords.
 */
export async function extractKeywords(description: string, log?: Pick<ILogger, 'warn'>, systemPrompt?: string): Promise<KeywordsOutput> {
  // 1. Guard: empty input
  if (!description?.trim()) {
    return { keywords: [] };
  }

  // 2. Guard: missing env
  const env = validateEnv(log);
  if (!env) {
    return { keywords: [] };
  }

  try {
    // 3. Instantiate the provider adapter — baseURL comes from env, not hardcoded
    const provider = createOpenAICompatible({
      name: 'llm-extractor',
      apiKey: env.apiKey,
      baseURL: env.baseURL,
    });

    const model = provider(env.model);

    // 4. Structured generation (Zod validates the output automatically).
    //    DeepSeek requires "json" in the prompt for response_format: json_object.
    const prompt = description.toLowerCase().includes('json') ? description : `Responde en JSON.\n\n${description}`;

    const result = await generateObject({
      model,
      schema: KeywordsOutputSchema,
      system: systemPrompt || FALLBACK_SYSTEM_PROMPT,
      prompt,
      temperature: Number(process.env.LLM_TEMPERATURE) || 0,
    });

    return result.object;
  } catch (err) {
    log?.warn(`LLM extraction failed (baseURL=${env.baseURL} model=${env.model}): ${(err as Error).message}`);
    return { keywords: [] };
  }
}
