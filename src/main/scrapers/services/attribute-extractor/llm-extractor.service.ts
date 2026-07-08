import { z } from 'zod';
import { generateText, Output } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ILogger } from '@shared/logger.interface';

// ---- Zod output schema -----------------------------------------------------
const KeywordsOutputSchema = z.object({
  keywords: z.array(z.string()).max(5).describe('Up to 5 relevant keywords extracted from the product description'),
});

/**
 * Token usage reported by the LLM provider via the AI SDK `generateText`.
 * Includes prompt-cache hit/miss tokens for monitoring provider-side caching.
 */
export interface ILlmUsage {
  promptCacheHitTokens: number;
  promptCacheMissTokens: number;
  completionTokens: number;
}

/** Return type of {@link extractKeywords} — keywords plus optional usage stats. */
export interface IExtractKeywordsResult {
  keywords: string[];
  usage?: ILlmUsage;
}

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
  'You are a classified-ad keyword extraction assistant for Cuban marketplaces (e.g. Revolico). ' +
  'Extract up to 5 keywords that represent the product being advertised.\n\n' +
  'STRICT RULES:\n' +
  '- Only include information EXPLICITLY present in the description.\n' +
  '- Do not invent brands, prices, locations, or features not written in the text.\n' +
  '- Prefer short 1–3 word phrases (e.g. "casa independiente", "iphone 14").\n' +
  '- Include: product type, brand/model, location, condition, ' +
  'distinctive features (bedrooms, bathrooms, garage, storage, color, etc.).\n' +
  '- Omit sales filler words: "se vende", "vendo", "venta de", "precio", "oferta".\n' +
  '- Order keywords by relevance (most distinctive first).\n' +
  '- Respond in the SAME LANGUAGE as the input description.\n\n' +
  'EXAMPLE 1:\n' +
  'Description: "Apartamento en Miramar 3 cuartos 2 baños excelente estado"\n' +
  'Keywords: ["apartamento", "miramar", "3 cuartos", "2 baños", "excelente estado"]\n\n' +
  'EXAMPLE 2:\n' +
  'Description: "iPhone 14 Pro Max 256GB negro como nuevo con garantía"\n' +
  'Keywords: ["iphone 14 pro max", "256gb", "negro", "como nuevo", "con garantía"]\n\n' +
  'EXAMPLE 3:\n' +
  'Description: "Casa independiente biplanta en Playa con garaje 4 cuartos"\n' +
  'Keywords: ["casa independiente", "playa", "biplanta", "garaje", "4 cuartos"]\n\n' +
  'EXAMPLE 4:\n' +
  'Description: "Vendo Laptop Dell Inspiron 15 3000 Series 8GB RAM"\n' +
  'Keywords: ["laptop", "dell inspiron", "15 pulgadas", "8gb ram", "laptop dell"]\n\n' +
  'EXAMPLE 5:\n' +
  'Description: "Se vende auto Hyundai Accent 2018 azul impecable"\n' +
  'Keywords: ["hyundai accent", "2018", "azul", "impecable", "auto"]\n\n' +
  'Output ONLY the JSON object { "keywords": [...] }. Nothing else.';

// ---- public API ------------------------------------------------------------

/**
 * Extracts up to 5 keywords from a product description using an LLM.
 *
 * Fully provider-agnostic — reads `LLM_BASE_URL`, `LLM_MODEL`, and
 * `LLM_API_KEY` from the environment. Works with any OpenAI-compatible
 * API (DeepSeek, OpenAI, Anthropic, custom proxies, etc.) via
 * `@ai-sdk/openai-compatible` and {@link generateText} with
 * {@link Output.object}.
 *
 * Returns `{ keywords: [] }` on any failure (missing env, network error,
 * timeout, bad response) — never throws.
 *
 * @param {string} description  - The raw listing description.
 * @param {Pick<ILogger, 'warn'>} [log] - Optional logger for diagnostics.
 * @param {string} [systemPrompt] - System prompt override (falls back to
 *   hardcoded prompt and finally to DB-stored llm:keyword-extraction-prompt).
 * @returns {Promise<ExtractKeywordsResult>} Up to 5 keywords plus optional LLM provider usage stats.
 */
export async function extractKeywords(
  description: string,
  log?: Pick<ILogger, 'warn'>,
  systemPrompt?: string,
): Promise<IExtractKeywordsResult> {
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
    // 3. Instantiate the provider adapter — baseURL comes from env, not hardcoded.
    //    supportsStructuredOutputs: true tells the SDK to use tool calling for
    //    JSON schema enforcement instead of `response_format`. DeepSeek does not
    //    support `response_format` natively, which otherwise emits a warning
    //    on every call ("The feature 'responseFormat' is not supported").
    const provider = createOpenAICompatible({
      name: 'llm-extractor',
      apiKey: env.apiKey,
      baseURL: env.baseURL,
      supportsStructuredOutputs: true,
    });

    const model = provider(env.model);

    // 4. Structured generation via generateText + Output.object (generateObject is deprecated).
    //    DeepSeek requires "json" in the prompt for structured JSON output.
    const prompt = description.toLowerCase().includes('json') ? description : `Output JSON.\n\n${description}`;

    const result = await generateText({
      model,
      output: Output.object({ schema: KeywordsOutputSchema }),
      system: systemPrompt || FALLBACK_SYSTEM_PROMPT,
      prompt,
      temperature: Number(process.env.LLM_TEMPERATURE) || 0,
    });

    return {
      keywords: result.output.keywords,
      usage: result.usage
        ? {
            promptCacheHitTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
            promptCacheMissTokens: result.usage?.inputTokenDetails?.noCacheTokens ?? 0,
            completionTokens: result.usage?.outputTokens ?? 0,
          }
        : undefined,
    };
  } catch (err) {
    log?.warn(`LLM extraction failed (baseURL=${env.baseURL} model=${env.model}): ${(err as Error).message}`);
    return { keywords: [] };
  }
}
