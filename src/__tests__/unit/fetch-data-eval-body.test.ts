import { JSDOM } from 'jsdom';
import { buildEvalBody } from '@scrapers/revolico/services/fetch-data.service';

/**
 * Regression test for the `buildEvalBody()` function used by
 * `RevolicoFetchDataService.fetchRenderedJson`.
 *
 * History:
 *   The original implementation concatenated `DOM_TO_JSON_SOURCE` directly
 *   with a trailing `return (IIFE)()`. Because `DOM_TO_JSON_SOURCE` itself
 *   ends with `return domToJson;`, the early return short-circuited the
 *   function and the IIFE never ran. Puppeteer's `page.evaluate` then
 *   returned the `domToJson` function reference, which JSON-serializes to
 *   `{}` — every listing scrape produced an empty tree and JSONata had
 *   nothing to evaluate against.
 *
 * This test builds the eval body the same way production does and runs it
 * against a JSDOM document. If the body regresses to the broken form, the
 * runner returns the `domToJson` function (serialized to `{}`) and the
 * assertions below fail loudly.
 */
describe('RevolicoFetchDataService.buildEvalBody', () => {
  const SAMPLE_HTML = `<!doctype html>
<html><body>
<div class="GridList__CardsContainer-sc-74729273-1 hakAjM">
  <div class="GridList__PromotedsContainer-sc-74729273-2 dsmZjT">
    <a href="/item/abc-123?p"><div class="mt-2"><p class="text-pitussa line-clamp-2">Promoted product</p></div></a>
  </div>
  <div>
    <ul class="GridList__CardsList-sc-74729273-3 wBnmk">
      <li data-cy="adGrid"><a href="/item/regular-1"><div class="bg-conejo"><picture><source srcset="https://pic.revolico.com/pics/regular-1_desktop.jpg"></picture></div><div class="mt-2"><div class="flex items-center gap-2"></div><p class="text-pitussa line-clamp-2">Regular 1</p></div></a></li>
      <li data-cy="adGrid"><a href="/item/regular-2"><div class="bg-conejo"><picture><source srcset="https://pic.revolico.com/pics/regular-2_desktop.jpg"></picture></div><div class="mt-2"><div class="flex items-center gap-2"><p class="text-pitussa font-bold">10,000 USD</p></div><p class="text-pitussa line-clamp-2">Regular 2</p></div></a></li>
    </ul>
  </div>
</div>
</body></html>`;

  /**
   * Mirrors `page.evaluate(runner, selector)`: runs the eval body inside a
   * Node `Function` with a `sel` parameter, against a JSDOM document exposed
   * via the function's closure scope.
   */
  const runAgainst = (html: string, selector: string): unknown => {
    const dom = new JSDOM(html);
    const evalBody = buildEvalBody();
    const runner = new Function('sel', `var document = arguments[1]; ${evalBody}`) as (sel: string, doc: Document) => unknown;
    return runner(selector, dom.window.document);
  };

  it('returns the matched element as a JSON tree (NOT the domToJson function)', () => {
    const result = runAgainst(SAMPLE_HTML, 'div[class*="GridList__CardsContainer"]');

    expect(result).not.toEqual({});
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
    expect(Array.isArray(result)).toBe(false);

    const node = result as { tag: string; attrs: Record<string, string>; children: unknown[] };
    expect(node.tag).toBe('div');
    expect(node.attrs.class).toContain('GridList__CardsContainer');
    expect(Array.isArray(node.children)).toBe(true);
  });

  it('serializes the matched subtree with the children tree intact', () => {
    const result = runAgainst(SAMPLE_HTML, 'div[class*="GridList__CardsContainer"]');
    const json = JSON.stringify(result);
    expect(json.length).toBeGreaterThan(200);
    expect(json).toContain('GridList__CardsContainer');
    expect(json).toContain('GridList__CardsList');
    expect(json).toContain('GridList__PromotedsContainer');
    expect(json).toContain('regular-1');
    expect(json).toContain('regular-2');
    expect(json).toContain('Regular 1');
    expect(json).toContain('Regular 2');
  });

  it('round-trips through JSON.stringify without losing the tree (Puppeteer uses the same serialization)', () => {
    const result = runAgainst(SAMPLE_HTML, 'div[class*="GridList__CardsContainer"]');
    const serialized = JSON.stringify(result);
    const parsed = JSON.parse(serialized) as { tag: string; children: unknown[] };
    expect(parsed.tag).toBe('div');
    expect(Array.isArray(parsed.children)).toBe(true);
    expect((parsed.children as unknown[]).length).toBeGreaterThan(0);
  });

  it('returns an empty array when the selector matches 0 elements (matches production EMPTY_TREE path)', () => {
    const result = runAgainst(SAMPLE_HTML, 'div[class*="__DoesNotExist__"]');
    expect(Array.isArray(result)).toBe(true);
    expect(result as unknown[]).toHaveLength(0);
  });

  it('returns an array when the selector matches multiple elements', () => {
    const result = runAgainst(SAMPLE_HTML, 'li[data-cy="adGrid"]');
    expect(Array.isArray(result)).toBe(true);
    expect(result as unknown[]).toHaveLength(2);
  });
});
