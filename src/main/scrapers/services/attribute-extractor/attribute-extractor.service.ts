import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { RuleBasedExtractorService, IRuleExtractionResult } from './rule-based-extractor.service';
import { extractKeywords, FALLBACK_SYSTEM_PROMPT } from './llm-extractor.service';
import { KeywordsCache } from './keywords-cache';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';

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
    @inject(EnrichmentMetricsService) private readonly _metrics: EnrichmentMetricsService,
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
      this._metrics.recordRuleHighConfidence();
      this._log.debug(
        `Rule-based extraction confidence=${ruleResult.confidence.toFixed(2)} (matched ${ruleResult.matchedCount}) — skipping cache & LLM`,
      );
      return ruleResult.attributes;
    }

    return this._resolveViaCacheOrLLM(description);
  }

  // ---- private -------------------------------------------------------------

  /**
   * Resolves the LLM system prompt with a three-tier fallback chain:
   *
   * 1. **DB** (`ScraperConfig` with `storeKey = "llm:keyword-extraction-prompt"`)
   *    — manageable at runtime via the ScraperConfig API, no restart needed.
   * 2. **Env var** (`LLM_KEYWORD_EXTRACTION_PROMPT`) — configurable at deploy
   *    time, useful for ephemeral environments or CI.
   * 3. **Hardcoded** (`FALLBACK_SYSTEM_PROMPT`) — safety net, always available.
   *
   * @returns {Promise<string>} The resolved system prompt.
   */
  private async _loadSystemPrompt(): Promise<string> {
    // 1. DB (gestionable en runtime sin reinicio)
    try {
      const cfg = await this._promptRegistry.get('llm:keyword-extraction-prompt');
      if (cfg?.expression) return cfg.expression;
    } catch (err) {
      this._log.warn('Failed to load LLM prompt from DB', (err as Error).message);
    }

    // 2. Env var (configurable a nivel de deploy)
    const envPrompt = process.env.LLM_KEYWORD_EXTRACTION_PROMPT?.trim();
    if (envPrompt) {
      this._log.info('Using LLM_KEYWORD_EXTRACTION_PROMPT from environment');
      return envPrompt;
    }

    // 3. Hardcoded fallback (red de seguridad)
    this._log.warn(
      '[ALERT] llm:keyword-extraction-prompt not in DB and LLM_KEYWORD_EXTRACTION_PROMPT not set. ' +
        'Using hardcoded fallback prompt. Seed the DB, set the env var, or PUT /api/revolicos/scraper-configs ' +
        'with storeKey="llm:keyword-extraction-prompt" to customize.',
    );
    return FALLBACK_SYSTEM_PROMPT;
  }

  private async _resolveViaCacheOrLLM(description: string): Promise<Record<string, unknown>> {
    // Step 2 — cache check
    const cached = await this._cache.get(description);
    if (cached) {
      this._metrics.recordCacheHit();
      this._log.debug(`Keywords cache hit (${cached.length} keywords)`);
      return { keywords: cached };
    }

    // Step 3 — LLM fallback (with DB-stored prompt, hardcoded fallback)
    this._metrics.recordCacheMiss();
    this._log.info(`Rule confidence low & cache miss — calling LLM`);
    const systemPrompt = await this._loadSystemPrompt();
    const result = await extractKeywords(description, this._log, systemPrompt);

    // Record LLM outcome
    if (result.usage) {
      this._metrics.recordLlmCall(result.usage);
    } else {
      // No usage = LLM threw (empty-description and missing-env guards
      // are handled before we reach this method).
      this._metrics.recordLlmFailure();
    }

    // Store in cache (best-effort, fire-and-forget)
    if (result.keywords.length > 0) {
      this._cache.set(description, result.keywords).catch(() => {});
    }

    return { keywords: result.keywords };
  }
}
