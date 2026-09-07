import type { ProductCatalogItem } from '@/features/alarms/types';

const CATS: [string, string[]][] = [
  ['compra-venta', ['celulares', 'electrodomesticos', 'computadoras']],
  ['autos', ['carros', 'motos']],
  ['inmuebles', ['apartamentos', 'casas']],
  ['empleo', ['ofertas']],
];

/** 32 deterministic products spread across categories and price ranges. */
export const productsFixture: ProductCatalogItem[] = Array.from({ length: 32 }, (_, i) => {
  const [category, subs] = CATS[i % CATS.length];
  return {
    id: `prod_${i + 1}`,
    url: `https://www.revolico.com/item/mock-${i + 1}`,
    description: `Producto de prueba ${i + 1} (${category})`,
    price: 25 + i * 40,
    currency: i % 3 === 0 ? 'CUP' : 'USD',
    imageURL: undefined,
    isOutstanding: i % 5 === 0,
    views: 10 * (i + 1),
    location: { state: i % 2 ? 'La Habana' : 'Matanzas', municipality: undefined },
    seller: { name: `Vendedor ${i % 7}` },
    category,
    subcategory: subs[i % subs.length],
    updatedAt: new Date(2026, 5, 1 + (i % 28)).toISOString(),
  };
});
