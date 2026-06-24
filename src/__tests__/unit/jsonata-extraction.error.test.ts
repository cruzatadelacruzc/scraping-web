import { buildJsonataError, JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';

describe('Error - JsonataExtractionError', () => {
  describe('buildJsonataError', () => {
    it('builds a TIMEOUT error with ms and JSONata native message', () => {
      const err = buildJsonataError('TIMEOUT', 'revolico:listing', { ms: 5000, jsonataMsg: 'native err' });
      expect(err).toBeInstanceOf(JsonataExtractionError);
      expect(err.code).toBe('TIMEOUT');
      expect(err.message).toContain('TIMEOUT after 5000ms');
      expect(err.message).toContain('storeKey=revolico:listing');
      expect(err.message).toContain('JSONata: native err');
    });

    it('builds an EXPRESSION_ERROR with path', () => {
      const err = buildJsonataError('EXPRESSION_ERROR', 'revolico:detail', { path: '$.products', jsonataMsg: 'undefined' });
      expect(err.code).toBe('EXPRESSION_ERROR');
      expect(err.message).toContain('Path: $.products');
      expect(err.message).toContain('JSONata: undefined');
    });

    it('builds a NOT_SERIALIZABLE error', () => {
      const err = buildJsonataError('NOT_SERIALIZABLE', 'revolico:listing');
      expect(err.code).toBe('NOT_SERIALIZABLE');
      expect(err.message).toContain('not JSON-serializable');
    });

    it('builds a CONFIG_MISSING error', () => {
      const err = buildJsonataError('CONFIG_MISSING', 'revolico:listing');
      expect(err.code).toBe('CONFIG_MISSING');
      expect(err.message).toContain('not found');
      expect(err.message).toContain('revolico:listing');
    });

    it('builds a CONFIG_DISABLED error', () => {
      const err = buildJsonataError('CONFIG_DISABLED', 'revolico:detail');
      expect(err.code).toBe('CONFIG_DISABLED');
      expect(err.message).toContain('disabled');
    });

    it('preserves expression and inputJson fields for diagnostics', () => {
      const tree = { tag: 'div' };
      const err = buildJsonataError('EXPRESSION_ERROR', 'revolico:listing', {
        expression: '$ ~> |$|{}|',
        inputJson: tree,
      });
      expect(err.expression).toBe('$ ~> |$|{}|');
      expect(err.inputJson).toBe(tree);
    });
  });

  describe('JsonataExtractionError instance', () => {
    it('has correct name and prototype chain', () => {
      const err = new JsonataExtractionError({ code: 'TIMEOUT', message: 'x' });
      expect(err.name).toBe('JsonataExtractionError');
      expect(err).toBeInstanceOf(Error);
    });

    it('can be discriminated via instanceof in catch blocks', () => {
      const err = buildJsonataError('EXPRESSION_ERROR', 'revolico:listing');
      expect(() => {
        throw err;
      }).toThrow(JsonataExtractionError);
      expect(err.code).toBe('EXPRESSION_ERROR');
    });
  });
});
