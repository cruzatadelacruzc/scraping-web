/**
 * Quick LLM credential sanity check.
 *
 * Usage:
 *   npx ts-node -O '{"types":["node"]}' -r tsconfig-paths/register scripts/test-llm.ts
 */

import 'dotenv/config';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const TestSchema = z.object({
  model: z.string(),
  keywords: z.array(z.string()).max(5),
});

async function main(): Promise<void> {
  const baseURL = process.env.LLM_BASE_URL?.trim();
  const modelEnv = process.env.LLM_MODEL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();

  const missing: string[] = [];
  if (!baseURL) missing.push('LLM_BASE_URL');
  if (!modelEnv) missing.push('LLM_MODEL');
  if (!apiKey) missing.push('LLM_API_KEY');

  if (missing.length) {
    console.error(`❌ Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('── CONFIG ──');
  console.log(`  URL   : ${baseURL}`);
  console.log(`  Model : ${modelEnv}`);
  console.log(`  Key   : ${apiKey!.slice(0, 6)}...${apiKey!.slice(-4)}`);

  // Use the same prompt that the real keyword extractor uses
  const testDescription = 'Apartamento en Miramar 3 cuartos 2 baños excelente estado';

  try {
    const provider = createOpenAICompatible({
      name: 'llm-test',
      apiKey: apiKey!,
      baseURL: baseURL!,
    });

    const result = await generateObject({
      model: provider(modelEnv!),
      schema: TestSchema,
      prompt:
        `Responde en JSON. Extrae hasta 5 keywords de esta descripcion. Ademas, en el campo "model" dime exactamente ` +
        `que modelo eres (mira tu nombre interno real, no lo que te puse en el prompt).\n\n` +
        `Descripcion: "${testDescription}"`,
      temperature: Number(process.env.LLM_TEMPERATURE) || 0.3,
    });

    console.log('');
    console.log('── RESULT ──');
    console.log(`  Model    : ${result.object.model}`);
    console.log(`  Keywords : ${result.object.keywords.join(', ')}`);
    console.log('');
    console.log(`✅ Credentials valid — ${result.object.model} is working!`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
}

main();
