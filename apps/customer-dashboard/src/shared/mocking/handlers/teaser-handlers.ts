import { http } from 'msw';
import { ok } from './_shared';

interface TeaserItem {
  productId: string;
  name: string;
  store: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  dropPct: number;
  spark: number[];
}

interface TeaserSlide {
  type: 'price-drops' | 'best-sellers' | 'watched';
  title: string;
  updatedAt: string;
  items: TeaserItem[];
}

const now = () => new Date().toISOString();

const slides: TeaserSlide[] = [
  {
    type: 'price-drops',
    title: 'Top 5 bajadas de precio',
    updatedAt: now(),
    items: [
      {
        productId: 'p1',
        name: 'Sony WH-1000XM5 Auriculares Inalámbricos',
        store: 'Amazon ES',
        category: 'Electrónica',
        oldPrice: 399.0,
        newPrice: 231.42,
        dropPct: 42,
        spark: [399, 372, 360, 341, 300, 258, 231],
      },
      {
        productId: 'p2',
        name: 'Samsung SSD 990 PRO 2TB PCIe 4.0',
        store: 'Amazon ES',
        category: 'Electrónica',
        oldPrice: 245.99,
        newPrice: 167.27,
        dropPct: 32,
        spark: [246, 240, 231, 228, 210, 189, 167],
      },
      {
        productId: 'p3',
        name: 'Logitech MX Master 3S Ratón Inalámbrico',
        store: 'Amazon ES',
        category: 'Electrónica',
        oldPrice: 135.0,
        newPrice: 97.2,
        dropPct: 28,
        spark: [135, 132, 128, 124, 118, 108, 97],
      },
      {
        productId: 'p4',
        name: 'Apple iPad Air (2022) 64GB Wi-Fi',
        store: 'Amazon ES',
        category: 'Electrónica',
        oldPrice: 769.0,
        newPrice: 622.89,
        dropPct: 19,
        spark: [769, 760, 742, 720, 690, 655, 623],
      },
      {
        productId: 'p5',
        name: 'ASUS ROG Strix G15 G513RM Portátil Gaming',
        store: 'Amazon ES',
        category: 'Electrónica',
        oldPrice: 1499.0,
        newPrice: 1274.15,
        dropPct: 15,
        spark: [1499, 1480, 1450, 1410, 1360, 1310, 1274],
      },
    ],
  },
  {
    type: 'best-sellers',
    title: 'Más vendidos',
    updatedAt: now(),
    items: [
      {
        productId: 'b1',
        name: 'Xiaomi Redmi Note 13 Pro',
        store: 'Amazon ES',
        category: 'Móviles',
        oldPrice: 329.0,
        newPrice: 279.0,
        dropPct: 15,
        spark: [329, 325, 315, 305, 298, 288, 279],
      },
      {
        productId: 'b2',
        name: 'Kindle Paperwhite 16GB',
        store: 'Amazon ES',
        category: 'Lectores',
        oldPrice: 169.99,
        newPrice: 149.99,
        dropPct: 12,
        spark: [170, 168, 165, 162, 158, 153, 150],
      },
      {
        productId: 'b3',
        name: 'Anker PowerCore 20000',
        store: 'Amazon ES',
        category: 'Accesorios',
        oldPrice: 59.99,
        newPrice: 44.99,
        dropPct: 25,
        spark: [60, 58, 55, 52, 50, 47, 45],
      },
      {
        productId: 'b4',
        name: 'JBL Flip 6 Altavoz Bluetooth',
        store: 'Amazon ES',
        category: 'Audio',
        oldPrice: 129.0,
        newPrice: 99.0,
        dropPct: 23,
        spark: [129, 126, 120, 115, 110, 104, 99],
      },
      {
        productId: 'b5',
        name: 'TP-Link Deco X50 (2-pack)',
        store: 'Amazon ES',
        category: 'Redes',
        oldPrice: 149.99,
        newPrice: 119.99,
        dropPct: 20,
        spark: [150, 147, 142, 137, 131, 125, 120],
      },
    ],
  },
  {
    type: 'watched',
    title: 'En observación',
    updatedAt: now(),
    items: [
      {
        productId: 'w1',
        name: 'LG OLED evo C3 55"',
        store: 'Amazon ES',
        category: 'TV',
        oldPrice: 1499.0,
        newPrice: 1199.0,
        dropPct: 20,
        spark: [1499, 1480, 1450, 1400, 1330, 1260, 1199],
      },
      {
        productId: 'w2',
        name: 'Dyson V15 Detect Absolute',
        store: 'Amazon ES',
        category: 'Hogar',
        oldPrice: 799.0,
        newPrice: 649.0,
        dropPct: 19,
        spark: [799, 790, 770, 740, 710, 680, 649],
      },
      {
        productId: 'w3',
        name: 'GoPro HERO12 Black',
        store: 'Amazon ES',
        category: 'Cámaras',
        oldPrice: 449.99,
        newPrice: 349.99,
        dropPct: 22,
        spark: [450, 440, 425, 410, 390, 370, 350],
      },
      {
        productId: 'w4',
        name: 'Garmin Fenix 7X Pro Solar',
        store: 'Amazon ES',
        category: 'Wearables',
        oldPrice: 999.0,
        newPrice: 799.0,
        dropPct: 20,
        spark: [999, 985, 960, 920, 880, 840, 799],
      },
      {
        productId: 'w5',
        name: 'Nintendo Switch OLED',
        store: 'Amazon ES',
        category: 'Consolas',
        oldPrice: 349.99,
        newPrice: 309.99,
        dropPct: 11,
        spark: [350, 347, 342, 335, 328, 318, 310],
      },
    ],
  },
];

/** Public, no-auth teaser feed for the landing "doodle". */
export const teaserHandlers = [http.get('/api/public/highlights', () => ok({ slides }))];
