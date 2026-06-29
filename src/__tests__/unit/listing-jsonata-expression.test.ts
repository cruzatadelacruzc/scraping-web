import { JSDOM } from 'jsdom';
import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import { DOM_TO_JSON_SOURCE } from '@scrapers/revolico/services/scraping/utils/dom-to-json.util';
import type { ILogger } from '@shared/logger.interface';
import type { IListingResult, IListingRow } from '@scrapers/revolico/services/scraping/generic-listing-scraper.service';

/**
 * Source of the listing JSONata expression under test. Mirrors
 * `REVOLICO_LISTING_EXPRESSION` in `prisma/seed.ts` and the value that
 * `ScraperConfigService.create()` persists for storeKey=`revolico:listing`.
 *
 * If you change this string, change it in BOTH places. The seed file is the
 * bootstrap path (DB row created on first run); the API is the live path
 * (updated when the team iterates on try.jsonata.org).
 *
 * Puppeteer loads the FULL Revolico HTML at runtime and feeds the resulting
 * DOM tree to this expression — see `RevolicoFetchDataService.fetchRenderedJson`.
 * The HTML fragment below is a snapshot of the real structure (captured via
 * `firecrawl scrape` against a live category page on 2026-06-28) so this
 * test exercises the expression against actual markup without needing a
 * fixture file or network access in CI.
 *
 * The expression walks the `GridList__CardsContainer` subtree (the input)
 * via prefix matching (CSS Module suffixes change on every build), navimatches
 * to `CardsList` for `products[]` and `PromotedsContainer` for `promoted[]`.
 */
const REVOLICO_LISTING_EXPRESSION = `{
  "products": $map(
    $.**[ $.tag = "ul" and $count($.attrs.*[ $contains($, "GridList__CardsList") ]) > 0 ]
            .children[ $.tag = "li" and $count($.children[ $.tag = "a" ]) > 0 ]
            .children[ $.tag = "a" ],
    function($a) {
      {
        "url":           $a.attrs.href,
        "description":   $a.children[ $.tag = "div" ][1].children[ $.tag = "p" ][0].text,
        "cost":          $exists($a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text)
                          ? $a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text
                          : "",
        "imageURL":      $a.children[ $.tag = "div" ][0].children[ $.tag = "picture" ][0].children[ $.tag = "source" ][0].attrs.srcset,
        "isOutstanding": $count($a.**[ $.tag = "div" and $.attrs.title = "Anuncio destacado" ]) > 0
      }
    }
  ),
  "promoted": $map(
    $.**[ $.tag = "div" and $count($.attrs.*[ $contains($, "GridList__PromotedsContainer") ]) > 0 ]
            .**[ $.tag = "a" and $contains($.attrs.href, "/item/") ],
    function($a) {
      {
        "url":           $a.attrs.href,
        "description":   $a.children[ $.tag = "div" ][1].children[ $.tag = "p" ][0].text,
        "cost":          $exists($a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text)
                          ? $a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text
                          : "",
        "imageURL":      $a.children[ $.tag = "div" ][0].children[ $.tag = "picture" ][0].children[ $.tag = "source" ][0].attrs.srcset,
        "isOutstanding": $count($a.**[ $.tag = "div" and $.attrs.title = "Anuncio destacado" ]) > 0
      }
    }
  )
}`;

/**
 * Synthetic Revolico listing markup that mirrors the real structure from
 * `https://www.revolico.com/search?category=inmobiliaria&subcategory=inmobiliaria-casas`
 * (captured via `firecrawl scrape` on 2026-06-29, see `.firecrawl/`).
 *
 * Layout:
 *   <div class="GridList__CardsContainer">
 *     <div class="GridList__PromotedsContainer">
 *       <div role="group" aria-roledescription="slide">
 *         <a href="/item/...?p">  × 2 promoted products
 *       </div>
 *     </div>
 *     <div>  <!-- unnamed wrapper between CardsContainer and CardsList (real DOM has it) -->
 *       <ul class="GridList__CardsList">
 *         <li>Breadcrumb (no data-cy=adGrid, no <a>)</li>
 *         <li data-cy="adGrid">Ad placeholder (no <a>)</li>
 *         <li data-cy="adGrid"><a>NO price, NO outstanding</a></li>
 *         <li data-cy="adGrid"><a>WITH price, NO outstanding</a></li>
 *         <li data-cy="adGrid"><a>WITH price, WITH outstanding marker</a></li>
 *       </ul>
 *     </div>
 *   </div>
 *
 * Expression expectations:
 *   - `products.length === 3` (the 3 lis with <a>; breadcrumb + ad placeholder excluded)
 *   - `promoted.length === 2`
 *
 * The CSS module suffixes (`hakAjM`, `wBnmk`, etc.) are intentionally
 * arbitrary — the `[class*="..."]` selector matches by prefix, so the test
 * would pass even if Revolico ships a build that regenerates the suffix.
 */
const REVOLICO_LISTING_HTML = `<!doctype html>
<html><body>
<div class="GridList__CardsContainer-sc-74729273-1 hakAjM">
  <div class="GridList__PromotedsContainer-sc-74729273-2 dsmZjT">
    <div role="group" aria-roledescription="slide">
      <a href="https://www.revolico.com/item/se-vende-restaurante-en-madrid-55678980?p"><div class="bg-conejo h-[183px]"><picture><source srcset="https://pic.revolico.com/pics/p1_item_photo_desktop.jpg" media="(min-width: 768px)"></picture></div><div class="mt-2"><div class="flex items-center gap-2"><p class="text-pitussa font-bold">200,000 USD</p></div><p class="text-pitussa line-clamp-2">Se vende restaurante en Madrid</p></div></a>
    </div>
    <div role="group" aria-roledescription="slide">
      <a href="https://www.revolico.com/item/vendo-propiedad-horizontal-en-el-nautico-53202474?p"><div class="bg-conejo h-[183px]"><picture><source srcset="https://pic.revolico.com/pics/p2_item_photo_desktop.jpg" media="(min-width: 768px)"></picture></div><div class="mt-2"><div class="flex items-center gap-2"></div><p class="text-pitussa line-clamp-2">Vendo propiedad horizontal en El Nautico</p></div></a>
    </div>
  </div>
  <div>
    <ul class="GridList__CardsList-sc-74729273-3 wBnmk">
      <li>Breadcrumb item should NOT match</li>
      <li data-cy="adGrid" class="h-[270px] w-full rounded-lg"><div class="bg-conejo relative h-[183px] min-h-[183px] w-full overflow-hidden rounded-lg ring-1 ring-black/10"><ins class="adsbygoogle h-[183px] w-full"></ins></div></li>
      <li data-cy="adGrid"><a class="text-bufalo group block h-[270px] w-full rounded-lg border-0 p-0 leading-6 font-normal no-underline" href="https://www.revolico.com/item/se-vende-esta-propiedad-de-870m-56056244"><div class="bg-conejo relative h-[183px] w-full overflow-hidden rounded-lg ring-1 ring-black/10"><picture><source srcset="https://pic.revolico.com/pics/16d9_item_photo_desktop.jpg" media="(min-width: 768px)"><source srcset="https://pic.revolico.com/pics/16d9_item_photo_mobile_s.jpg"></picture></div><div class="mt-2"><div class="flex items-center gap-2"></div><p class="text-pitussa line-clamp-2 text-left break-words group-hover:underline">Se vende esta propiedad de 870m</p></div></a></li>
      <li data-cy="adGrid"><a class="text-bufalo group block h-[270px] w-full rounded-lg border-0 p-0 leading-6 font-normal no-underline" href="https://www.revolico.com/item/vendo-apto-en-santo-suarez-55628084"><div class="bg-conejo relative h-[183px] w-full overflow-hidden rounded-lg ring-1 ring-black/10"><picture><source srcset="https://pic.revolico.com/pics/a2f7_item_photo_desktop.jpg" media="(min-width: 768px)"></picture></div><div class="mt-2"><div class="flex items-center gap-2"><p class="text-pitussa font-bold group-hover:underline">15,000 USD</p></div><p class="text-pitussa line-clamp-2 text-left break-words group-hover:underline">Vendo apto en Santo Suarez me ajusto</p></div></a></li>
      <li data-cy="adGrid"><a class="text-bufalo group block h-[270px] w-full rounded-lg border-0 p-0 leading-6 font-normal no-underline" href="https://www.revolico.com/item/casa-en-venta-en-la-calle-real-34119469"><div class="bg-conejo relative h-[183px] w-full overflow-hidden rounded-lg ring-1 ring-black/10"><picture><source srcset="https://pic.revolico.com/pics/10bc_item_photo_desktop.jpg" media="(min-width: 768px)"></picture></div><div class="mt-2"><div class="flex items-center gap-2"><div title="Anuncio destacado"><svg></svg></div><p class="text-pitussa font-bold group-hover:underline">95,000 USD</p></div><p class="text-pitussa line-clamp-2 text-left break-words group-hover:underline">Casa en venta en la calle Real</p></div></a></li>
    </ul>
  </div>
  <div class="GridList__PaginationWrapper-sc-74729273-8 dKkSej">
    <button data-cy="paginatorPrevious">Prev</button>
    <button data-cy="paginatorNext">Next</button>
  </div>
</div>
</body></html>`;

const loggerStub: ILogger = {
  context: 'listing-jsonata-expression.test',
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

/**
 * Serializes the inline HTML fragment the same way Puppeteer would inside
 * `RevolicoFetchDataService.fetchRenderedJson`: select every element matching
 * `div[class*="GridList__CardsContainer"]` (typically 1 match on a real page)
 * via JSDOM and walk it through the browser-side `domToJson` helper.
 */
const buildTree = (): unknown[] => {
  const dom = new JSDOM(REVOLICO_LISTING_HTML);
  const domToJson = dom.window.eval(`(function(){ ${DOM_TO_JSON_SOURCE} })()`) as (el: Element | null) => unknown;
  const containers = dom.window.document.querySelectorAll('div[class*="GridList__CardsContainer"]');
  const out: unknown[] = [];
  for (const c of Array.from(containers)) {
    const node = domToJson(c);
    if (node !== null) out.push(node);
  }
  return out;
};

describe('revolico:listing JSONata expression', () => {
  let runner: JsonataRunnerService;
  let tree: unknown[];

  beforeAll(() => {
    runner = new JsonataRunnerService(loggerStub);
    tree = buildTree();
  });

  it('selects exactly one container subtree via the prefix CSS selector', () => {
    expect(tree).toHaveLength(1);
  });

  it('returns products: 3 rows (excludes breadcrumb, AdSense placeholder, and the 2 promoted)', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree, {
      storeKey: 'revolico:listing',
    });
    expect(result.products).toHaveLength(3);
  });

  it('returns promoted: 2 rows extracted from PromotedsContainer', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    expect(result.promoted).toHaveLength(2);
  });

  it('extracts the absolute URL from each CardsList product anchor', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    for (const row of result.products) {
      expect(row.url).toMatch(/^https:\/\/www\.revolico\.com\/item\/[^/]+-\d+$/);
    }
  });

  it('extracts the desktop-quality image (first <source>) for every product', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    for (const row of result.products) {
      expect(row.imageURL).toContain('_item_photo_desktop.jpg');
      expect(row.imageURL).toMatch(/^https:\/\/pic\.revolico\.com\/pics\//);
    }
  });

  it('extracts the description from the line-clamp-2 <p>', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    expect(result.products.map(p => p.description)).toEqual([
      'Se vende esta propiedad de 870m',
      'Vendo apto en Santo Suarez me ajusto',
      'Casa en venta en la calle Real',
    ]);
  });

  it('extracts the price from the font-bold <p>, falling back to "" when absent', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    expect(result.products.map(p => p.cost)).toEqual(['', '15,000 USD', '95,000 USD']);
  });

  it('flags isOutstanding=true when the card contains an "Anuncio destacado" marker', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    expect(result.products.map(p => p.isOutstanding)).toEqual([false, false, true]);
  });

  it('produces CardsList rows that satisfy IListingRow contract (every field present)', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    for (const row of result.products as IListingRow[]) {
      expect(typeof row.url).toBe('string');
      expect(typeof row.description).toBe('string');
      expect(typeof row.cost).toBe('string');
      expect(typeof row.imageURL).toBe('string');
      expect(typeof row.isOutstanding).toBe('boolean');
    }
  });

  it('promoted rows carry the ?p tracking query param', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    for (const row of result.promoted) {
      expect(row.url).toMatch(/\?p$/);
    }
  });

  it('promoted rows satisfy IListingRow contract (every field present)', async () => {
    const result = await runner.run<IListingResult>(REVOLICO_LISTING_EXPRESSION, tree);
    for (const row of result.promoted as IListingRow[]) {
      expect(typeof row.url).toBe('string');
      expect(typeof row.description).toBe('string');
      expect(typeof row.cost).toBe('string');
      expect(typeof row.imageURL).toBe('string');
      expect(typeof row.isOutstanding).toBe('boolean');
    }
  });
});
