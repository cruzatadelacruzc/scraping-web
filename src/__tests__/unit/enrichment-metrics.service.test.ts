import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';

describe('EnrichmentMetricsService', () => {
  let service: EnrichmentMetricsService;

  beforeEach(() => {
    service = new EnrichmentMetricsService();
  });

  describe('counters', () => {
    it('initializes all counters to zero', () => {
      const s = service.getSnapshot();
      expect(s.totalEnrichments).toBe(0);
      expect(s.enrichmentHashSkips).toBe(0);
      expect(s.ruleHighConfidence).toBe(0);
      expect(s.cacheHits).toBe(0);
      expect(s.cacheMisses).toBe(0);
      expect(s.llmCalls).toBe(0);
      expect(s.llmFailures).toBe(0);
      expect(s.llmPromptCacheHitTokens).toBe(0);
      expect(s.llmPromptCacheMissTokens).toBe(0);
      expect(s.llmCompletionTokens).toBe(0);
    });

    it('recordEnrichment increments total', () => {
      service.recordEnrichment();
      service.recordEnrichment();
      expect(service.getSnapshot().totalEnrichments).toBe(2);
    });

    it('recordEnrichmentHashSkip increments skip counter', () => {
      service.recordEnrichmentHashSkip();
      service.recordEnrichmentHashSkip();
      service.recordEnrichmentHashSkip();
      expect(service.getSnapshot().enrichmentHashSkips).toBe(3);
    });

    it('recordRuleHighConfidence increments rule counter', () => {
      service.recordRuleHighConfidence();
      expect(service.getSnapshot().ruleHighConfidence).toBe(1);
    });

    it('recordCacheHit increments cache hits', () => {
      service.recordCacheHit();
      service.recordCacheHit();
      expect(service.getSnapshot().cacheHits).toBe(2);
    });

    it('recordCacheMiss increments cache misses', () => {
      service.recordCacheMiss();
      expect(service.getSnapshot().cacheMisses).toBe(1);
    });

    it('recordLlmCall increments llm call count and accumulates tokens', () => {
      service.recordLlmCall({ promptCacheHitTokens: 100, promptCacheMissTokens: 200, completionTokens: 50 });
      service.recordLlmCall({ promptCacheHitTokens: 50, promptCacheMissTokens: 0, completionTokens: 30 });

      const s = service.getSnapshot();
      expect(s.llmCalls).toBe(2);
      expect(s.llmPromptCacheHitTokens).toBe(150);
      expect(s.llmPromptCacheMissTokens).toBe(200);
      expect(s.llmCompletionTokens).toBe(80);
    });

    it('recordLlmFailure increments failure counter (not llmCalls)', () => {
      service.recordLlmFailure();
      service.recordLlmFailure();
      const s = service.getSnapshot();
      expect(s.llmFailures).toBe(2);
      // failures are counted separately from successful calls
      expect(s.llmCalls).toBe(0);
    });
  });

  describe('computed rates', () => {
    it('returns zero rates when no data (no division by zero)', () => {
      const s = service.getSnapshot();
      expect(s.enrichmentHashSkipRate).toBe(0);
      expect(s.ruleHighConfidenceRate).toBe(0);
      expect(s.cacheHitRate).toBe(0);
      expect(s.llmFailureRate).toBe(0);
      expect(s.llmCacheHitRate).toBe(0);
      expect(s.estimatedSavingsUSD).toBe(0);
    });

    it('computes enrichmentHashSkipRate correctly', () => {
      service.recordEnrichment();
      service.recordEnrichment();
      service.recordEnrichmentHashSkip(); // 1 out of 2
      service.recordEnrichment();

      expect(service.getSnapshot().enrichmentHashSkipRate).toBeCloseTo(1 / 3, 5);
    });

    it('computes ruleHighConfidenceRate over non-skipped', () => {
      service.recordEnrichment(); // total=1
      service.recordEnrichment(); // total=2
      service.recordEnrichmentHashSkip(); // skip=1, non-skipped=1
      service.recordEnrichment(); // total=3, non-skipped=2
      service.recordRuleHighConfidence(); // 1 rules hit over 2 non-skipped
      service.recordRuleHighConfidence(); // 2 rules hit over 2 non-skipped

      expect(service.getSnapshot().ruleHighConfidenceRate).toBeCloseTo(2 / 2, 5);
    });

    it('computes cacheHitRate correctly', () => {
      service.recordCacheHit();
      service.recordCacheHit();
      service.recordCacheMiss(); // 2 hits, 1 miss → 2/3

      expect(service.getSnapshot().cacheHitRate).toBeCloseTo(2 / 3, 5);
    });

    it('computes llmFailureRate correctly', () => {
      service.recordLlmCall({ promptCacheHitTokens: 10, promptCacheMissTokens: 20, completionTokens: 5 });
      service.recordLlmFailure();
      service.recordLlmCall({ promptCacheHitTokens: 0, promptCacheMissTokens: 30, completionTokens: 10 });
      service.recordLlmFailure();
      // 2 failures / 2 calls = 1.0
      expect(service.getSnapshot().llmFailureRate).toBe(2 / 2);
    });

    it('computes llmCacheHitRate from token totals', () => {
      service.recordLlmCall({ promptCacheHitTokens: 800, promptCacheMissTokens: 200, completionTokens: 100 });
      // 800 / (800 + 200) = 0.8
      expect(service.getSnapshot().llmCacheHitRate).toBeCloseTo(0.8, 5);
    });
  });

  describe('savings estimation', () => {
    const OLD_COST = process.env.LLM_COST_PER_MILLION_TOKENS;

    afterEach(() => {
      if (OLD_COST !== undefined) {
        process.env.LLM_COST_PER_MILLION_TOKENS = OLD_COST;
      } else {
        delete process.env.LLM_COST_PER_MILLION_TOKENS;
      }
    });

    it('returns 0 savings when env var is not set', () => {
      delete process.env.LLM_COST_PER_MILLION_TOKENS;
      // Need new instance to re-read env
      const s2 = new EnrichmentMetricsService();
      s2.recordLlmCall({ promptCacheHitTokens: 1_000_000, promptCacheMissTokens: 0, completionTokens: 0 });
      expect(s2.getSnapshot().estimatedSavingsUSD).toBe(0);
      expect(s2.getSnapshot().costPerMillionTokens).toBe(0);
    });

    it('returns 0 savings for invalid env var values', () => {
      process.env.LLM_COST_PER_MILLION_TOKENS = 'not-a-number';
      const s2 = new EnrichmentMetricsService();
      s2.recordLlmCall({ promptCacheHitTokens: 1_000_000, promptCacheMissTokens: 0, completionTokens: 0 });
      expect(s2.getSnapshot().estimatedSavingsUSD).toBe(0);
    });

    it('returns 0 savings for negative env var values', () => {
      process.env.LLM_COST_PER_MILLION_TOKENS = '-0.5';
      const s2 = new EnrichmentMetricsService();
      s2.recordLlmCall({ promptCacheHitTokens: 1_000_000, promptCacheMissTokens: 0, completionTokens: 0 });
      expect(s2.getSnapshot().estimatedSavingsUSD).toBe(0);
    });

    it('calculates savings from env var (DeepSeek $0.14/M)', () => {
      process.env.LLM_COST_PER_MILLION_TOKENS = '0.14';
      const s2 = new EnrichmentMetricsService();
      s2.recordLlmCall({ promptCacheHitTokens: 1_000_000, promptCacheMissTokens: 0, completionTokens: 0 });
      expect(s2.getSnapshot().estimatedSavingsUSD).toBeCloseTo(0.14, 5);
    });

    it('calculates partial savings for fractional tokens', () => {
      process.env.LLM_COST_PER_MILLION_TOKENS = '0.14';
      const s2 = new EnrichmentMetricsService();
      s2.recordLlmCall({ promptCacheHitTokens: 500_000, promptCacheMissTokens: 0, completionTokens: 0 });
      expect(s2.getSnapshot().estimatedSavingsUSD).toBeCloseTo(0.07, 5);
    });
  });

  describe('reset', () => {
    it('clears all counters to zero', () => {
      service.recordEnrichment();
      service.recordEnrichmentHashSkip();
      service.recordRuleHighConfidence();
      service.recordCacheHit();
      service.recordCacheMiss();
      service.recordLlmCall({ promptCacheHitTokens: 100, promptCacheMissTokens: 200, completionTokens: 50 });
      service.recordLlmFailure();

      service.reset();

      const s = service.getSnapshot();
      expect(s.totalEnrichments).toBe(0);
      expect(s.enrichmentHashSkips).toBe(0);
      expect(s.ruleHighConfidence).toBe(0);
      expect(s.cacheHits).toBe(0);
      expect(s.cacheMisses).toBe(0);
      expect(s.llmCalls).toBe(0);
      expect(s.llmFailures).toBe(0);
      expect(s.llmPromptCacheHitTokens).toBe(0);
      expect(s.llmPromptCacheMissTokens).toBe(0);
      expect(s.llmCompletionTokens).toBe(0);
    });
  });

  describe('snapshot immutability', () => {
    it('getSnapshot returns a frozen view (counters not affected by subsequent recordings)', () => {
      service.recordEnrichment();
      const s = service.getSnapshot();
      expect(s.totalEnrichments).toBe(1);

      // Record more — snapshot should NOT change (it was a point-in-time copy)
      service.recordEnrichment();
      expect(s.totalEnrichments).toBe(1); // still 1 from the snapshot
    });
  });
});
