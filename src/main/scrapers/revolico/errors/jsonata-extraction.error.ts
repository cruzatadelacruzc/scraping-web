/**
 * Error codes for JSONata extraction failures. Used to build the BullMQ
 * `failedReason` string visible in Bull-Board, and to discriminate error
 * shapes in tests (`err instanceof JsonataExtractionError`).
 */
export type JsonataErrorCode = 'TIMEOUT' | 'EXPRESSION_ERROR' | 'NOT_SERIALIZABLE' | 'CONFIG_MISSING' | 'CONFIG_DISABLED';

/**
 * Thrown when a JSONata expression fails to evaluate against the JSON tree
 * produced by `page.evaluate()` in Puppeteer, or when the surrounding config
 * is missing/disabled. The `message` is human-readable and goes straight to
 * BullMQ's `failedReason`. The `expression` and `inputJson` fields are
 * preserved on the instance for tests and for `ctx.log()` diagnostics.
 *
 * @class JsonataExtractionError
 * @extends {Error}
 */
export class JsonataExtractionError extends Error {
  public readonly code: JsonataErrorCode;
  public readonly expression?: string;
  public readonly inputJson?: unknown;

  public constructor(init: { code: JsonataErrorCode; message: string; expression?: string; inputJson?: unknown }) {
    super(init.message);
    this.name = 'JsonataExtractionError';
    this.code = init.code;
    this.expression = init.expression;
    this.inputJson = init.inputJson;
    Object.setPrototypeOf(this, JsonataExtractionError.prototype);
  }
}

/**
 * Build a `JsonataExtractionError` from a code + storeKey + optional JSONata
 * native message. Centralizes the message templates so the worker and the
 * runner agree on what shows up in `failedReason`.
 *
 * @param {JsonataErrorCode} code - The error category.
 * @param {string} storeKey - The ScraperConfig storeKey (e.g. "revolico:listing").
 * @param {object} [opts] - Optional context for richer messages.
 * @param {number} [opts.ms] - Timeout duration in ms (TIMEOUT).
 * @param {string} [opts.path] - JSONata path that failed (EXPRESSION_ERROR).
 * @param {string} [opts.jsonataMsg] - Native JSONata library message.
 * @param {string} [opts.expression] - The JSONata source that failed.
 * @param {unknown} [opts.inputJson] - The input JSON tree at evaluation time.
 * @returns {JsonataExtractionError}
 */
export function buildJsonataError(
  code: JsonataErrorCode,
  storeKey: string,
  opts: { ms?: number; path?: string; jsonataMsg?: string; expression?: string; inputJson?: unknown } = {},
): JsonataExtractionError {
  let message: string;
  switch (code) {
    case 'TIMEOUT':
      message = `Jsonata TIMEOUT after ${opts.ms ?? 5000}ms at storeKey=${storeKey} | JSONata: ${opts.jsonataMsg ?? 'n/a'}`;
      break;
    case 'EXPRESSION_ERROR':
      message = `Jsonata EXPRESSION_ERROR at storeKey=${storeKey} | Path: ${opts.path ?? 'n/a'} | JSONata: ${opts.jsonataMsg ?? 'n/a'}`;
      break;
    case 'NOT_SERIALIZABLE':
      message = `Jsonata result not JSON-serializable at storeKey=${storeKey}`;
      break;
    case 'CONFIG_MISSING':
      message = `ScraperConfig not found for storeKey=${storeKey}`;
      break;
    case 'CONFIG_DISABLED':
      message = `ScraperConfig disabled for storeKey=${storeKey}`;
      break;
    default: {
      const _exhaustive: never = code;
      throw new Error(`Unhandled JsonataErrorCode: ${String(_exhaustive)}`);
    }
  }
  return new JsonataExtractionError({ code, message, expression: opts.expression, inputJson: opts.inputJson });
}
