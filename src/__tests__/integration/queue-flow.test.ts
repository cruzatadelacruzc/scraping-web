/**
 * End-to-end test for the Revolico queue cascade:
 *
 *   PRODUCTS_SCRAPING ──▶ PRODUCT_STORAGE ──▶ PRODUCT_SCRAPING
 *
 * The cascade is driven by `setupQueueListeners()` — completed events on the
 * upstream queue enqueue batches on the downstream queue. We assert that:
 *   1. One enqueue on PRODUCTS_SCRAPING yields exactly one listing-completed
 *      event (no matter the page count).
 *   2. The product-storage fan-out splits by PRODUCT_STORAGE_BATCHSIZE.
 *   3. The product-scraping fan-out splits by PRODUCT_URLS_BATCHSIZE.
 *   4. The order is preserved (listing → storage → detail).
 *
 * External dependencies (Puppeteer, MongoDB writes, alarm engine) are stubbed
 * by spying on the worker `processor` methods. The intent is to verify the
 * queue wiring, not the workers — those have their own unit/integration tests.
 *
 * The spies MUST be installed before `App.setup()` runs: `initializeQueues()`
 * binds the worker methods into the adapter's handler array via
 * `processor.bind(this)`. If we spied after binding, the bound function
 * would still call the original implementation.
 *
 * Requires Postgres for the alarm engine's no-op query and the App's
 * tenant-DB connect. Mongo runs in-process via MongoMemoryServer; BullMQ runs
 * via MockQueueAdapter (`QUEUE_BACKEND=mock` in `src/__tests__/setup-env.ts`).
 */
import { App } from '../../main/app';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import { QueueContext } from '@shared/queue/queue-context';
import { MockQueueAdapter } from '@shared/queue/adapters/mock';
import { QUEUE_NAME } from '@scrapers/revolico/queues';
import { GenericListingScraperService } from '@scrapers/revolico/services/scraping/generic-listing-scraper.service';
import { GenericDetailScraperService } from '@scrapers/revolico/services/scraping/generic-detail-scraper.service';
import { ProductService } from '@scrapers/revolico/services/product.service';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

const STORAGE_BATCH = Number(process.env.PRODUCT_STORAGE_BATCHSIZE) || 50;
const DETAIL_BATCH = Number(process.env.PRODUCT_URLS_BATCHSIZE) || 30;

describe('Revolico queue flow (E2E)', () => {
  let appInstance: App;
  let mockAdapter: MockQueueAdapter;
  let queueContext: QueueContext;
  let genericListing: GenericListingScraperService;
  let genericDetail: GenericDetailScraperService;
  let productService: ProductService;

  beforeAll(async () => {
    // Resolve instances and install spies BEFORE `App.setup()` runs
    // `initializeQueues()` so the bound worker references the spied methods.
    genericListing = container.get<GenericListingScraperService>(TYPES.GenericListingScraper);
    productService = container.get<ProductService>(TYPES.ProductService);
    genericDetail = container.get<GenericDetailScraperService>(TYPES.GenericDetailScraper);

    // Default stubs. Each test overrides the canned listing; storage and
    // detail stubs are correct for every test in this suite.
    jest.spyOn(genericListing, 'processor').mockResolvedValue([]);
    jest.spyOn(productService, 'processor').mockImplementation(async ctx => {
      const data = ctx.data as IRevolicoProduct[];
      return data.map(p => ({ url: p.url }));
    });
    jest.spyOn(genericDetail, 'processor').mockResolvedValue('OK');

    appInstance = new App();
    await appInstance.setup();

    mockAdapter = container.get<MockQueueAdapter>(TYPES.MockAdapter);
    queueContext = container.get(QueueContext);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await appInstance.close();
  });

  beforeEach(() => {
    mockAdapter.reset();
    // `jest.clearAllMocks()` from `setupTests.ts` clears call history but
    // NOT implementations, so a `mockResolvedValue(...)` from a previous test
    // would persist. Reset the canned listing to empty; each test that needs
    // a different value sets it explicitly.
    (genericListing.processor as jest.Mock).mockResolvedValue([]);
  });

  function makeCannedProducts(n: number): IRevolicoProduct[] {
    return Array.from({ length: n }, (_, i) => ({
      ID: `prod-${i + 1}`,
      category: 'compra-venta',
      url: `https://www.revolico.com/product-${i + 1}`,
      cost: '100 USD',
      currency: 'USD',
      price: 100,
      description: `Product ${i + 1}`,
      imageURL: `https://www.revolico.com/img-${i + 1}.jpg`,
      isOutstanding: false,
    }));
  }

  /** Polls until the adapter has at least `expected` jobs, then returns the
   * full job list. The MockQueueAdapter processes synchronously, but the
   * cascade chains three async workers + listeners, so we drain microtasks. */
  async function waitForJobs(expected: number): Promise<ReadonlyArray<Readonly<any>>> {
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const jobs = mockAdapter.getJobs();
      if (jobs.length >= expected) return jobs;
      await new Promise(resolve => setImmediate(resolve));
    }
    return mockAdapter.getJobs();
  }

  function partitionByQueue(allJobs: ReadonlyArray<Readonly<any>>): {
    listing: ReadonlyArray<Readonly<any>>;
    storage: ReadonlyArray<Readonly<any>>;
    detail: ReadonlyArray<Readonly<any>>;
  } {
    return {
      listing: allJobs.filter(j => j.queueName === QUEUE_NAME.products_scraping),
      storage: allJobs.filter(j => j.queueName === QUEUE_NAME.product_storage),
      detail: allJobs.filter(j => j.queueName === QUEUE_NAME.product_scraping),
    };
  }

  it('cascades 60 products: 1 listing → 2 storage batches → 3 detail batches', async () => {
    const canned = makeCannedProducts(60);
    (genericListing.processor as jest.Mock).mockResolvedValue(canned);

    // Each storage-completed event fires its own fan-out, so total detail
    // batches = Σ ⌈storageBatchSize / DETAIL_BATCH⌉ over each storage batch.
    //   storage #1: 50 → ⌈50/30⌉ = 2 detail jobs
    //   storage #2: 10 → ⌈10/30⌉ = 1 detail job
    const expectedStorageBatches = Math.ceil(60 / STORAGE_BATCH);
    const expectedDetailBatches = Math.ceil(STORAGE_BATCH / DETAIL_BATCH) + Math.ceil((60 - STORAGE_BATCH) / DETAIL_BATCH);
    const expectedJobs = 1 + expectedStorageBatches + expectedDetailBatches;

    await queueContext.enqueue(QUEUE_NAME.products_scraping, {
      category: 'compra-venta',
      pageNumber: 1,
      totalPages: 1,
    });

    const allJobs = await waitForJobs(expectedJobs);
    expect(allJobs).toHaveLength(expectedJobs);

    const { listing, storage, detail } = partitionByQueue(allJobs);
    expect(listing).toHaveLength(1);
    expect(storage).toHaveLength(expectedStorageBatches);
    expect(detail).toHaveLength(expectedDetailBatches);

    // Storage batches: STORAGE_BATCH then remainder
    expect(storage[0].data as IRevolicoProduct[]).toHaveLength(STORAGE_BATCH);
    expect(storage[1].data as IRevolicoProduct[]).toHaveLength(60 - STORAGE_BATCH);

    // Detail batches from storage #1 (50 URLs): 30 then 20 (last batch can
    // be smaller than DETAIL_BATCH — that's how `slice(i, i+batchSize)` works)
    expect(detail[0].data as { url: string }[]).toHaveLength(DETAIL_BATCH);
    expect(detail[1].data as { url: string }[]).toHaveLength(STORAGE_BATCH - DETAIL_BATCH);
    // Detail batch from storage #2: remaining 10 URLs fit in one batch
    expect(detail[2].data as { url: string }[]).toHaveLength(60 - STORAGE_BATCH);

    // Each processor ran exactly the expected number of times
    expect(genericListing.processor).toHaveBeenCalledTimes(1);
    expect(productService.processor).toHaveBeenCalledTimes(expectedStorageBatches);
    expect(genericDetail.processor).toHaveBeenCalledTimes(expectedDetailBatches);
  });

  it('does not split a single batch when product count fits in one', async () => {
    const canned = makeCannedProducts(STORAGE_BATCH);
    (genericListing.processor as jest.Mock).mockResolvedValue(canned);

    // 1 listing + 1 storage + ⌈STORAGE_BATCH/DETAIL_BATCH⌉ detail
    const expectedDetailBatches = Math.ceil(STORAGE_BATCH / DETAIL_BATCH);
    const expectedJobs = 1 + 1 + expectedDetailBatches;

    await queueContext.enqueue(QUEUE_NAME.products_scraping, {
      category: 'compra-venta',
      pageNumber: 1,
      totalPages: 1,
    });

    const allJobs = await waitForJobs(expectedJobs);
    const { listing, storage, detail } = partitionByQueue(allJobs);

    expect(listing).toHaveLength(1);
    expect(storage).toHaveLength(1);
    expect(storage[0].data as IRevolicoProduct[]).toHaveLength(STORAGE_BATCH);
    expect(detail).toHaveLength(expectedDetailBatches);
  });

  it('enqueues storage before detail, preserving cascade order', async () => {
    const canned = makeCannedProducts(DETAIL_BATCH); // 1 storage batch, 1 detail batch
    (genericListing.processor as jest.Mock).mockResolvedValue(canned);

    const enqueueOrder: string[] = [];
    const originalEnqueue = queueContext.enqueue.bind(queueContext);
    jest.spyOn(queueContext, 'enqueue').mockImplementation(async (queueName, data, opts) => {
      enqueueOrder.push(queueName);
      return originalEnqueue(queueName, data, opts);
    });

    await queueContext.enqueue(QUEUE_NAME.products_scraping, {
      category: 'compra-venta',
      pageNumber: 1,
      totalPages: 1,
    });

    await waitForJobs(3);

    expect(enqueueOrder).toEqual([
      QUEUE_NAME.products_scraping, // test enqueue
      QUEUE_NAME.product_storage, // listing-completed listener fires
      QUEUE_NAME.product_scraping, // storage-completed listener fires
    ]);
  });

  it('produces no storage or detail jobs when listing returns an empty result', async () => {
    // Default mock returns [] — no override needed.

    await queueContext.enqueue(QUEUE_NAME.products_scraping, {
      category: 'compra-venta',
      pageNumber: 1,
      totalPages: 1,
    });

    const allJobs = await waitForJobs(1);
    // Drain a few extra microtasks to give downstream listeners a chance to
    // misbehave. With an empty result they should never fire.
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    expect(allJobs).toHaveLength(1);
    const { listing, storage, detail } = partitionByQueue(allJobs);
    expect(listing).toHaveLength(1);
    expect(storage).toHaveLength(0);
    expect(detail).toHaveLength(0);
    expect(productService.processor).not.toHaveBeenCalled();
    expect(genericDetail.processor).not.toHaveBeenCalled();
  });
});
