import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { RuleBasedExtractorService, IRuleExtractionResult } from './rule-based-extractor.service';
import { extractKeywords, FALLBACK_SYSTEM_PROMPT } from './llm-extractor.service';
import { KeywordsCache } from './keywords-cache';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';

/** Minimum rule-based confidence to skip the LLM fallback. */
const RULE_CONFIDENCE_THRESHOLD = 0.4;

/**
 * Hybrid attribute extractor: rules first → cache → LLM fallback.
 *
 * 1. If description is empty → return {}
 * 2. Run rule-based extractor.
 * 3. If confidence ≥ 0.4 → return rule result immediately (no API cost).
 * 4. Check KeywordsCache → hit → return cached keywords (no API cost).
 * 5. Otherwise → call LLM via {@link extractKeywords}, cache result.
 *
 * Never throws — always returns at minimum an empty object.
 *
 * @class AttributeExtractorService
 */
@injectable()
export class AttributeExtractorService {
  public constructor(
    @inject(RuleBasedExtractorService) private readonly _rules: RuleBasedExtractorService,
    @inject(KeywordsCache) private readonly _cache: KeywordsCache,
    @inject(TYPES.ScraperConfigRegistry) private readonly _promptRegistry: ScraperConfigRegistryService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = AttributeExtractorService.name;
  }

  /**
   * Extracts structured attributes from a product description.
   *
   * @param {string | undefined} description - The raw listing description.
   * @returns {Promise<Record<string, unknown>>} Extracted attributes (never null/throws).
   */
  public async extract(description: string | undefined): Promise<Record<string, unknown>> {
    if (!description?.trim()) {
      return {};
    }

    // Step 1 — rules-based extraction
    let ruleResult: IRuleExtractionResult;
    try {
      ruleResult = this._rules.extract(description);
    } catch (err) {
      this._log.warn('Rule-based extractor threw — falling back to cache / LLM', (err as Error).message);
      return this._resolveViaCacheOrLLM(description);
    }

    if (ruleResult.confidence >= RULE_CONFIDENCE_THRESHOLD) {
      this._log.debug(
        `Rule-based extraction confidence=${ruleResult.confidence.toFixed(2)} (matched ${ruleResult.matchedCount}) — skipping cache & LLM`,
      );
      return ruleResult.attributes;
    }

    return this._resolveViaCacheOrLLM(description);
  }

  // ---- private -------------------------------------------------------------

  /** Reads the LLM system prompt from ScraperConfig (DB), falling back to the hardcoded one. */
  private async _loadSystemPrompt(): Promise<string> {
    try {
      const cfg = await this._promptRegistry.get('llm:keyword-extraction-prompt');
      if (cfg?.expression) return cfg.expression;
    } catch (err) {
      this._log.warn('Failed to load LLM prompt from DB — using hardcoded fallback', (err as Error).message);
    }

    // ALERT: DB prompt is missing — admin should run `npm run seed` or set it via API.
    this._log.warn(
      '[ALERT] llm:keyword-extraction-prompt not found in ScraperConfig. ' +
        'Using hardcoded fallback prompt. Seed the DB or POST /api/revolicos/scraper-configs ' +
        'with storeKey="llm:keyword-extraction-prompt" to customize.',
    );
    return FALLBACK_SYSTEM_PROMPT;
  }

  private async _resolveViaCacheOrLLM(description: string): Promise<Record<string, unknown>> {
    // Step 2 — cache check
    const cached = await this._cache.get(description);
    if (cached) {
      this._log.debug(`Keywords cache hit (${cached.length} keywords)`);
      return { keywords: cached };
    }

    // Step 3 — LLM fallback (with DB-stored prompt, hardcoded fallback)
    this._log.info(`Rule confidence low & cache miss — calling LLM`);
    const systemPrompt = await this._loadSystemPrompt();
    const result = await extractKeywords(description, this._log, systemPrompt);

    // Store in cache (best-effort, fire-and-forget)
    if (result.keywords.length > 0) {
      this._cache.set(description, result.keywords).catch(() => {});
    }

    return result;
  }
}
