import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import type { ILogger } from '@shared/logger.interface';

jest.mock('jsonata', () => {
  const actual = jest.requireActual('jsonata');
  const factory = jest.fn(actual);
  return { __esModule: true, default: factory };
});

import jsonata from 'jsonata';

const loggerStub: ILogger = {
  context: 'JsonataRunnerService',
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockedJsonata = jsonata as unknown as jest.Mock;

describe('JsonataRunnerService', () => {
  let runner: JsonataRunnerService;

  beforeEach(() => {
    runner = new JsonataRunnerService(loggerStub);
    mockedJsonata.mockReset();
    mockedJsonata.mockImplementation(((expr: string) => jest.requireActual('jsonata')(expr)) as never);
  });

  describe('run', () => {
    it('evaluates a valid expression and returns the transformed value', async () => {
      const result = await runner.run<{ greeting: string }>('{ "greeting": name }', { name: 'world' });
      expect(result).toEqual({ greeting: 'world' });
    });

    it('returns the input itself when the expression is the identity `$`', async () => {
      const input = { foo: 1 };
      const result = await runner.run<unknown>('$', input);
      expect(result).toEqual(input);
    });

    it('throws JsonataExtractionError(EXPRESSION_ERROR) when the expression is malformed', async () => {
      mockedJsonata.mockImplementationOnce(() => {
        throw new Error('Syntax error');
      });
      let caught: unknown;
      try {
        await runner.run(')(', { foo: 1 });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(JsonataExtractionError);
      const err = caught as JsonataExtractionError;
      expect(err.code).toBe('EXPRESSION_ERROR');
      expect(err.message).toContain('EXPRESSION_ERROR');
      expect(err.message).toContain('JSONata:');
    });

    it('preserves the expression and inputJson on EXPRESSION_ERROR', async () => {
      mockedJsonata.mockImplementationOnce(() => {
        throw new Error('Syntax error');
      });
      const input = { products: [1, 2, 3] };
      let caught: unknown;
      try {
        await runner.run(')(', input);
      } catch (e) {
        caught = e;
      }
      const err = caught as JsonataExtractionError;
      expect(err.expression).toBe(')(');
      expect(err.inputJson).toBe(input);
    });

    it('throws JsonataExtractionError(NOT_SERIALIZABLE) when result contains a circular reference', async () => {
      const input: Record<string, unknown> = { a: 1 };
      input.self = input;
      let caught: unknown;
      try {
        await runner.run('$', input);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(JsonataExtractionError);
      expect((caught as JsonataExtractionError).code).toBe('NOT_SERIALIZABLE');
    });

    it('throws JsonataExtractionError(TIMEOUT) when evaluation exceeds timeoutMs', async () => {
      mockedJsonata.mockReturnValueOnce({
        evaluate: () => new Promise(() => {}),
        assign: jest.fn(),
        registerFunction: jest.fn(),
        ast: jest.fn(),
      });

      let caught: unknown;
      try {
        await runner.run('any-expression', { x: 1 }, { timeoutMs: 50 });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(JsonataExtractionError);
      const err = caught as JsonataExtractionError;
      expect(err.code).toBe('TIMEOUT');
      expect(err.message).toContain('TIMEOUT after 50ms');
    });
  });

  describe('validate', () => {
    it('returns { ok: true } for a syntactically valid expression', () => {
      const result = runner.validate('{ "ok": true }');
      expect(result.ok).toBe(true);
    });

    it('returns { ok: false, error } for an invalid expression', () => {
      mockedJsonata.mockImplementationOnce(() => {
        throw new Error('Parse failed');
      });
      const result = runner.validate(')(');
      expect(result.ok).toBe(false);
      const error = !result.ok ? result.error : '';
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    });
  });
});
