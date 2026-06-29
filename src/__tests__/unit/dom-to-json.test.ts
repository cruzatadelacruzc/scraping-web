import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';
import { DOM_TO_JSON_SOURCE } from '@scrapers/revolico/services/scraping/utils/dom-to-json.util';

const FACTORY_PATH = join(__dirname, '../../main/scrapers/revolico/services/scraping/utils/dom-to-json.util.ts');

const loadDomToJson = (dom: JSDOM): ((el: Element | null) => unknown) => {
  // Sanity check that the file we are about to evaluate actually contains the helper.
  const fileSrc = readFileSync(FACTORY_PATH, 'utf-8');
  expect(fileSrc).toContain('function domToJson(el)');
  // DOM_TO_JSON_SOURCE is a block of statements that ends with `return domToJson;`.
  // Wrap it in parens to make it an expression that returns the function.
  return dom.window.eval(`(function(){ ${DOM_TO_JSON_SOURCE} })()`) as (el: Element | null) => unknown;
};

const domFrom = (html: string): JSDOM => new JSDOM(html);

describe('domToJson (browser-side helper, evaluated in JSDOM)', () => {
  describe('element serialization', () => {
    it('serializes a div with an anchor child', () => {
      const dom = domFrom('<div class="x"><a href="/p">hi</a></div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as {
        tag: string;
        attrs: Record<string, string>;
        children: Array<{ tag: string; attrs: Record<string, string>; text?: string }>;
      };
      expect(result.tag).toBe('div');
      expect(result.attrs.class).toBe('x');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].tag).toBe('a');
      expect(result.children[0].attrs.href).toBe('/p');
      expect(result.children[0].text).toBe('hi');
    });

    it('returns null when called with null', () => {
      const dom = domFrom('<div></div>');
      const domToJson = loadDomToJson(dom);
      expect(domToJson(null)).toBeNull();
    });

    it('returns null when called with a script element (skipped subtree)', () => {
      const dom = domFrom('<div><script>alert(1)</script><span>ok</span></div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as { children: unknown[] };
      expect(result.children).toHaveLength(1);
      expect((result.children[0] as { tag: string }).tag).toBe('span');
    });

    it('skips style, noscript, and template subtrees too', () => {
      const dom = domFrom('<div><style>.x{}</style><noscript>n</noscript><template>t</template><p>keep</p></div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as { children: Array<{ tag: string }> };
      expect(result.children.map(c => c.tag)).toEqual(['p']);
    });

    it('omits the text field when the element has only whitespace text nodes', () => {
      const dom = domFrom('<div>   \n  </div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as { text?: string };
      expect(result.text).toBeUndefined();
    });

    it('joins multiple non-whitespace text nodes with a space', () => {
      const dom = domFrom('<div>hello<span> </span>world</div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as { text?: string };
      expect(result.text).toBe('hello world');
    });

    it('preserves deep nesting (5 levels)', () => {
      const dom = domFrom('<div><section><article><p><span>deep</span></p></article></section></div>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('div')) as {
        tag: string;
        children: Array<{
          tag: string;
          children: Array<{ tag: string; children: Array<{ tag: string; children: Array<{ tag: string; text?: string }> }> }>;
        }>;
      };
      expect(result.tag).toBe('div');
      expect(result.children[0].tag).toBe('section');
      expect(result.children[0].children[0].tag).toBe('article');
      expect(result.children[0].children[0].children[0].tag).toBe('p');
      expect(result.children[0].children[0].children[0].children[0].tag).toBe('span');
      expect(result.children[0].children[0].children[0].children[0].text).toBe('deep');
    });

    it('captures all attribute names', () => {
      const dom = domFrom('<a href="/x" target="_blank" rel="noopener" data-cy="foo">go</a>');
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('a')) as { attrs: Record<string, string> };
      expect(result.attrs).toEqual({
        href: '/x',
        target: '_blank',
        rel: 'noopener',
        'data-cy': 'foo',
      });
    });

    it('produces a JSON-serializable output for a realistic Revolico-like listing fragment', () => {
      const html = `
        <ul>
          <li>
            <a href="/ad/123">Tripp Lite power strip</a>
            <p>Like new</p>
            <span>1500 USD</span>
            <picture><img src="https://img.example.com/123.jpg" /></picture>
            <div class="dHRSzq">outstanding</div>
          </li>
        </ul>
      `;
      const dom = domFrom(html);
      const domToJson = loadDomToJson(dom);
      const result = domToJson(dom.window.document.querySelector('li'));
      const roundTrip = JSON.parse(JSON.stringify(result));
      expect(roundTrip).toEqual(result);
    });
  });
});
