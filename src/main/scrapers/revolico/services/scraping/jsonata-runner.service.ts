import { injectable, inject } from 'inversify';
import jsonata from 'jsonata';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { JsonataExtractionError, buildJsonataError, type JsonataErrorCode } from '@scrapers/revolico/errors/jsonata-extraction.error';

export interface IJsonataRunOptions {
  /** Maximum evaluation time in ms. Defaults to 5000. */
  timeoutMs?: number;
}

export type JsonataValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Generic JSONata runner. Wraps the IBM `jsonata` library with two guarantees:
 *
 *  1. A timeout via `Promise.race` so a malformed or infinite expression cannot
 *     block a BullMQ worker. The default is 5s — configurable per call.
 *  2. Typed errors via {@link JsonataExtractionError}, so the worker can
 *     distinguish TIMEOUT from EXPRESSION_ERROR from NOT_SERIALIZABLE in the
 *     catch block (visible in Bull-Board as the job's `failedReason`).
 *
 * Two entry points:
 *
 *  - {@link run}  — evaluates an expression against an input tree.
 *  - {@link validate} — parses an expression only. Used by `ScraperConfigRepository.upsert`
 *    as defense-in-depth before persisting expressions written by the team.
 *
 * @class JsonataRunnerService
 */
@injectable()
export class JsonataRunnerService {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = JsonataRunnerService.name;
  }

  /**
   * Evaluate a JSONata expression against the provided input.
   *
   * @param {string} expression - JSONata source.
   * @param {unknown} input - Input JSON tree (typically the DOM tree produced
   *   by `page.evaluate()` in Puppeteer).
   * @param {IJsonataRunOptions} [opts] - Optional tuning knobs.
   * @param {number} [opts.timeoutMs=5000] - Maximum evaluation time in ms.
   * @returns {Promise<T>} The JSONata result, cast to the caller's type.
   * @throws {JsonataExtractionError} with code `EXPRESSION_ERROR` on parse/eval failure,
   *   `TIMEOUT` on deadline expiry, or `NOT_SERIALIZABLE` if the result contains a
   *   circular reference that `JSON.stringify` cannot serialize.
   */
  public async run<T>(expression: string, input: unknown, opts: IJsonataRunOptions = {}): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? 5000;

    let expr: jsonata.Expression;
    try {
      expr = jsonata(expression);
    } catch (e) {
      throw this._toError('EXPRESSION_ERROR', expression, input, e);
    }

    let evaluationSettled = false;
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        if (!evaluationSettled) reject(new Error('__jsonata_timeout__'));
      }, timeoutMs);
    });

    let result: unknown;
    try {
      result = await Promise.race<unknown>([expr.evaluate(input), timeoutPromise]);
      evaluationSettled = true;
    } catch (e) {
      evaluationSettled = true;
      if (timer) clearTimeout(timer);
      if (e instanceof Error && e.message === '__jsonata_timeout__') {
        throw this._toError('TIMEOUT', expression, input, e, { ms: timeoutMs });
      }
      throw this._toError('EXPRESSION_ERROR', expression, input, e);
    }

    if (timer) clearTimeout(timer);

    try {
      JSON.stringify(result);
    } catch (e) {
      throw this._toError('NOT_SERIALIZABLE', expression, input, e);
    }

    return result as T;
  }

  /**
   * Parse-only check. Returns `{ ok: true }` if `jsonata(expression)` succeeds,
   * otherwise `{ ok: false, error }`. Used by `ScraperConfigRepository.upsert`
   * to refuse storing broken expressions.
   *
   * @param {string} expression - JSONata source.
   * @returns {JsonataValidationResult} Discriminated result.
   */
  public validate(expression: string): JsonataValidationResult {
    try {
      jsonata(expression);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private _toError(
    code: Exclude<JsonataErrorCode, 'CONFIG_MISSING' | 'CONFIG_DISABLED'>,
    expression: string,
    inputJson: unknown,
    cause: unknown,
    extras: { ms?: number } = {},
  ): JsonataExtractionError {
    const jsonataMsg = cause instanceof Error ? cause.message : undefined;
    const opts: { ms?: number; jsonataMsg?: string; expression?: string; inputJson?: unknown } = {
      expression,
      inputJson,
    };
    if (jsonataMsg !== undefined) opts.jsonataMsg = jsonataMsg;
    if (extras.ms !== undefined) opts.ms = extras.ms;
    return buildJsonataError(code, '__runner__', opts);
  }
}
