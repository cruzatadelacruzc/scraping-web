import { RuleBasedExtractorService } from '@scrapers/services/attribute-extractor/rule-based-extractor.service';

// Word-list arrays matching the FALLBACK_RULES used by the real registry.
// The extractor now reads these from RuleRegistryService.get(key) instead
// of module-level const arrays.
const mockWordLists: Record<string, string[]> = {
  brands: [
    'apple',
    'samsung',
    'huawei',
    'xiaomi',
    'motorola',
    'lg',
    'sony',
    'nokia',
    'lenovo',
    'dell',
    'hp',
    'asus',
    'acer',
    'toshiba',
    'canon',
    'nikon',
    'bosch',
    'whirlpool',
    'midea',
    'haier',
    'panasonic',
    'philips',
    'daewoo',
    'electrolux',
    'toyota',
    'hyundai',
    'kia',
    'peugeot',
    'audi',
    'bmw',
    'mercedes',
    'volkswagen',
    'nissan',
    'mitsubishi',
    'suzuki',
    'yamaha',
    'honda',
  ],
  conditions: [
    'perfecto estado',
    'buen estado',
    'mal estado',
    'todo de lujo',
    'muy buena',
    'gran rebaja',
    'super oferta',
    'como nuevo',
    'poco uso',
    'sin uso',
    'excelente',
    'exclusiva',
    'exclusivo',
    'oportunidad',
    'impecable',
    'hermosa',
    'hermoso',
    'precioso',
    'reacondicionado',
    'restaurado',
    'reparado',
    'regular',
    'danado',
    'defecto',
    'nuevo',
    'sellado',
    'rebaja',
    'oferta',
    'ideal',
    'lujo',
    'roto',
  ],
  colors: [
    'space gray',
    'starlight',
    'champagne',
    'turquesa',
    'plateado',
    'midnight',
    'grafito',
    'celeste',
    'violeta',
    'crema',
    'morado',
    'naranja',
    'amarillo',
    'marron',
    'beige',
    'coral',
    'dorado',
    'blanco',
    'negro',
    'verde',
    'rojo',
    'azul',
    'gris',
    'rosa',
    'pink',
    'gold',
    'blue',
    'red',
    'silver',
    'green',
    'black',
    'white',
    'purple',
    'yellow',
  ],
  propertyTypes: [
    'propiedad horizontal',
    'apartamento',
    'casa independiente',
    'biplanta',
    'triplanta',
    'casona',
    'finca',
    'hostal',
    'apto',
    'casa',
    'cuarto',
    'propiedad',
  ],
  locations: [
    'nuevo vedado',
    'centro habana',
    'la habana vieja',
    'habana vieja',
    'arroyo naranjo',
    'san miguel del padron',
    'santos suarez',
    'santa marta',
    'buena vista',
    'casino deportivo',
    'miramar',
    'vedado',
    'marianao',
    'lawton',
    'playa',
    'varadero',
    'santiago de cuba',
    'camaguey',
    'holguin',
    'santa clara',
    'cienfuegos',
    'pinar del rio',
    'matanzas',
    'la habana',
    'habana',
  ],
  warrantyKeywords: ['garantia', 'factura', 'con garantia', 'tiene garantia', 'con factura'],
};

function makeMockRegistry(): { get: jest.Mock } {
  return {
    get: jest.fn((key: string) => mockWordLists[key] ?? []),
  };
}

describe('RuleBasedExtractorService', () => {
  let service: RuleBasedExtractorService;
  let mockRegistry: { get: jest.Mock };

  beforeEach(() => {
    mockRegistry = makeMockRegistry();
    service = new RuleBasedExtractorService(mockRegistry as any);
  });

  describe('brand extraction', () => {
    it('detects Apple in description', () => {
      const result = service.extract('Vendo iPhone 14 Pro Max apple impecable');
      expect(result.attributes.brand).toBe('Apple');
      expect(result.matchedCount).toBeGreaterThanOrEqual(1);
    });

    it('detects Samsung', () => {
      const result = service.extract('Samsung Galaxy S23 ultra nuevo sellado');
      expect(result.attributes.brand).toBe('Samsung');
    });

    it('detects Honda', () => {
      const result = service.extract('Moto honda cg 150 en buen estado');
      expect(result.attributes.brand).toBe('Honda');
    });

    it('returns no brand for unknown brand', () => {
      const result = service.extract('Vendo producto genérico sin marca conocida');
      expect(result.attributes.brand).toBeUndefined();
    });
  });

  describe('condition extraction', () => {
    it('detects "nuevo"', () => {
      const result = service.extract('Producto nuevo en caja sellado');
      expect(result.attributes.condition).toBe('nuevo');
    });

    it('detects "como nuevo"', () => {
      const result = service.extract('Tablet como nuevo poco uso impecable');
      expect(result.attributes.condition).toBe('como nuevo');
    });

    it('detects "buen estado"', () => {
      const result = service.extract('Laptop dell en buen estado general');
      expect(result.attributes.condition).toBe('buen estado');
    });

    it('detects "reparado"', () => {
      const result = service.extract('iPhone reparado pantalla nueva');
      expect(result.attributes.condition).toBe('reparado');
    });
  });

  describe('color extraction', () => {
    it('detects "negro"', () => {
      const result = service.extract('iPhone 14 negro 256GB');
      expect(result.attributes.color).toBe('negro');
    });

    it('detects "rojo"', () => {
      const result = service.extract('Auto rojo en excelente estado');
      expect(result.attributes.color).toBe('rojo');
    });

    it('detects "space gray"', () => {
      const result = service.extract('MacBook space gray 512GB');
      expect(result.attributes.color).toBe('space gray');
    });
  });

  describe('storage extraction', () => {
    it('extracts 256GB', () => {
      const result = service.extract('iPhone 256GB negro');
      expect(result.attributes.storage).toBe('256GB');
    });

    it('extracts 1TB', () => {
      const result = service.extract('SSD externo 1 TB usb-c');
      expect((result.attributes as any).storage).toBe('1TB');
    });

    it('returns no storage when absent', () => {
      const result = service.extract('Vendo artículo sin storage mencionado');
      expect(result.attributes.storage).toBeUndefined();
    });
  });

  describe('ram extraction', () => {
    it('extracts "8GB RAM"', () => {
      const result = service.extract('Laptop 8GB RAM 256GB SSD');
      expect(result.attributes.ram).toBe('8GB');
    });

    it('extracts "RAM de 16GB"', () => {
      const result = service.extract('Computadora RAM de 16GB procesador i7');
      expect(result.attributes.ram).toBe('16GB');
    });
  });

  describe('delivery extraction', () => {
    it('detects "La Habana"', () => {
      const result = service.extract('Solo entregas en La Habana');
      expect(result.attributes.delivery).toBe('la habana');
    });

    it('detects "se envía"', () => {
      const result = service.extract('Se envía a toda Cuba previo pago');
      expect(result.attributes.delivery).toBe('se envía');
    });
  });

  describe('warranty extraction', () => {
    it('detects warranty mention', () => {
      const result = service.extract('Producto con garantía de 3 meses');
      expect(result.attributes.warranty).toBe(true);
    });

    it('detects factura', () => {
      const result = service.extract('Trae factura de compra original');
      expect(result.attributes.warranty).toBe(true);
    });

    it('returns no warranty when absent', () => {
      const result = service.extract('Vendo producto usado sin papeles');
      expect(result.attributes.warranty).toBeUndefined();
    });
  });

  describe('originalPrice extraction', () => {
    it('extracts USD price', () => {
      const result = service.extract('Valor real 500 USD lo vendo en 350');
      expect(result.attributes.originalPrice).toBe('500 USD');
    });

    it('extracts CUP price', () => {
      const result = service.extract('Precio original 5000 CUP, oferta 3000');
      expect(result.attributes.originalPrice).toBe('5000 CUP');
    });
  });

  describe('confidence calculation', () => {
    it('returns high confidence for description matching many patterns', () => {
      const result = service.extract(
        'iPhone 14 Pro Max apple 256GB negro como nuevo con garantía, solo entregas en La Habana, precio original 1200 USD',
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.matchedCount).toBeGreaterThanOrEqual(4);
    });

    it('returns low confidence for description with few matches', () => {
      const result = service.extract('Vendo este producto barato');
      expect(result.confidence).toBe(0);
      expect(result.matchedCount).toBe(0);
    });

    it('returns confidence=1.0 for all patterns matched', () => {
      const result = service.extract(
        'iPhone apple 14 Pro Max 256GB 8GB RAM negro como nuevo, con factura, ' +
          'en La Habana, precio original 1200 USD, casa 3 cuartos 2 baños garaje biplanta',
      );
      expect(result.confidence).toBe(1);
      expect(result.matchedCount).toBe(13);
    });
  });

  describe('real estate extraction', () => {
    it('detects propertyType "casa"', () => {
      const result = service.extract('Se vende casa en Miramar 3 cuartos');
      expect(result.attributes.propertyType).toBe('casa');
    });

    it('detects propertyType "apartamento"', () => {
      const result = service.extract('Apartamento en El Vedado excelente estado');
      expect(result.attributes.propertyType).toBe('apartamento');
    });

    it('detects rooms from "3 cuartos"', () => {
      const result = service.extract('Casa 3 cuartos 2 baños en Playa');
      expect(result.attributes.rooms).toBe(3);
    });

    it('detects bathrooms from "2 baños"', () => {
      const result = service.extract('Apto con 2 baños y garaje');
      expect(result.attributes.bathrooms).toBe(2);
    });

    it('detects garage', () => {
      const result = service.extract('Casa independiente con garaje en Miramar');
      expect(result.attributes.garage).toBe(true);
    });

    it('detects floors from "biplanta"', () => {
      const result = service.extract('Casa biplanta en Playa 4 cuartos');
      expect(result.attributes.floors).toBe(2);
    });

    it('detects floors from "3 plantas"', () => {
      const result = service.extract('Casa de 3 plantas con garaje');
      expect(result.attributes.floors).toBe(3);
    });

    it('detects location "Miramar"', () => {
      const result = service.extract('Se vende casa en Miramar');
      expect(result.attributes.delivery).toBe('miramar');
    });

    it('detects location "Vedado"', () => {
      const result = service.extract('Apartamento en el Vedado');
      expect(result.attributes.delivery).toBe('vedado');
    });

    it('detects "oferta" as condition', () => {
      const result = service.extract('Apartamento en mantilla súper oferta');
      expect(result.attributes.condition).toBe('super oferta');
    });

    it('detects "rebaja" as condition', () => {
      const result = service.extract('GRAN REBAJA casa en Playa');
      expect(result.attributes.condition).toBe('gran rebaja');
    });

    it('high confidence for detailed real estate ad', () => {
      const result = service.extract(
        'Casa independiente biplanta en Miramar 4 cuartos 2 baños con garaje, ' + 'excelente estado, precio 23.000 USD',
      );
      expect(result.matchedCount).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = service.extract('');
      expect(result.confidence).toBe(0);
      expect(result.matchedCount).toBe(0);
      expect(result.attributes).toEqual({});
    });

    it('handles very long description', () => {
      const longText = 'Lorem ipsum dolor sit amet. '.repeat(50);
      const result = service.extract(longText);
      expect(result.confidence).toBe(0);
    });

    it('is case-insensitive', () => {
      const result = service.extract('IPHONE APPLE NEGRO NUEVO GARANTÍA');
      expect(result.attributes.brand).toBe('Apple');
      expect(result.attributes.color).toBe('negro');
      expect(result.attributes.condition).toBe('nuevo');
      expect(result.attributes.warranty).toBe(true);
    });
  });

  describe('RuleRegistryService integration', () => {
    it('reads brands from registry', () => {
      mockRegistry.get.mockImplementation((key: string) => {
        if (key === 'brands') return ['testbrand'];
        return [];
      });
      const result = service.extract('Vendo producto testbrand en oferta');
      expect(result.attributes.brand).toBe('Testbrand');
      expect(mockRegistry.get).toHaveBeenCalledWith('brands');
    });

    it('reads conditions from registry', () => {
      mockRegistry.get.mockImplementation((key: string) => {
        if (key === 'conditions') return ['custom condition'];
        return [];
      });
      const result = service.extract('producto custom condition');
      expect(result.attributes.condition).toBe('custom condition');
    });
  });
});
