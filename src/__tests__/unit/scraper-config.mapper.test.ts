import { toScraperConfigResponseDTO } from '@scrapers/revolico/mappers/scraper-config.mapper';
import type { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';

const makeModel = (overrides: Partial<ScraperConfigModel> = {}): ScraperConfigModel => ({
  id: 'cfg-1',
  storeKey: 'revolico:listing',
  expression: '$ ~> | $ | { "products": $ } |',
  version: 1,
  enabled: true,
  createdAt: new Date('2026-06-23T10:00:00.000Z'),
  updatedAt: new Date('2026-06-23T10:00:00.000Z'),
  ...overrides,
});

describe('toScraperConfigResponseDTO', () => {
  it('maps every field including dates as ISO strings', () => {
    const dto = toScraperConfigResponseDTO(makeModel());
    expect(dto).toEqual({
      id: 'cfg-1',
      storeKey: 'revolico:listing',
      expression: '$ ~> | $ | { "products": $ } |',
      version: 1,
      enabled: true,
      createdAt: '2026-06-23T10:00:00.000Z',
      updatedAt: '2026-06-23T10:00:00.000Z',
    });
  });

  it('preserves the disabled flag', () => {
    const dto = toScraperConfigResponseDTO(makeModel({ enabled: false }));
    expect(dto.enabled).toBe(false);
  });
});
