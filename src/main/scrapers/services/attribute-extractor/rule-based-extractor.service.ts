import { injectable } from 'inversify';

/**
 * Result of a rule-based attribute extraction attempt.
 */
export interface IRuleExtractionResult {
  /** Extracted attributes (only populated keys are present). */
  attributes: Record<string, unknown>;
  /** 0-1 score; matchedCount / maxPatterns. */
  confidence: number;
  /** How many of the pattern categories matched. */
  matchedCount: number;
}

// ---- electronics / vehicles -----------------------------------------------
const BRANDS = [
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
] as const;

const CONDITIONS = [
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
  'dañado',
  'defecto',
  'nuevo',
  'sellado',
  'rebaja',
  'oferta',
  'ideal',
  'lujo',
  'roto',
] as const;

const COLORS = [
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
  'marrón',
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
] as const;

// ---- real estate ----------------------------------------------------------
const PROPERTY_TYPES = [
  'propiedad horizontal',
  'apartamento',
  'casa independiente',
  'biplanta',
  'triplanta',
  'casona',
  'finca',
  'hostal',
  'apartamento',
  'apto',
  'casa',
  'cuarto',
  'propiedad',
] as const;

// Havana neighbourhoods + nearby cities seen in the data
const LOCATIONS = [
  'nuevo vedado',
  'centro habana',
  'la habana vieja',
  'habana vieja',
  'arroyo naranjo',
  'san miguel del padrón',
  'santos suarez',
  'santos suárez',
  'santa marta',
  'buena vista',
  'casino deportivo',
  'san juan bautista',
  'san rafael',
  'el náutico',
  'los pinos',
  'el bosque',
  'el cerro',
  'la lisa',
  'la víbora',
  'la vibora',
  'santa fe',
  'santa catalina',
  'juan delgado',
  'san lázaro',
  'infanta',
  'san lazaro',
  'santa amelia',
  '10 de octubre',
  'san leopoldo',
  'galiano',
  'neptuno',
  'miramar',
  'vedado',
  'marianao',
  'lawton',
  'playa',
  'varadero',
  'sevillano',
  'mantilla',
  'mónaco',
  'mayia',
  'capitolio',
  'prado',
  'la habana',
  'habana',
  'santiago de cuba',
  'santiago',
  'camagüey',
  'holguín',
  'santa clara',
  'cienfuegos',
  'pinar del río',
  'matanzas',
] as const;

const WARRANTY_KEYWORDS = ['garantía', 'garantia', 'factura', 'con garantía', 'tiene garantía', 'con factura'] as const;

// How many pattern categories we try (used for confidence denominator).
const MAX_PATTERNS = 13;

/**
 * Deterministic regex-based attribute extractor for Spanish-language
 * classified-ad descriptions (Revolico format). Covers both electronics and
 * real-estate listings.
 *
 * @class RuleBasedExtractorService
 */
@injectable()
export class RuleBasedExtractorService {
  /**
   * Extracts structured attributes from a product description.
   *
   * @param {string} description - Raw description text from the listing.
   * @returns {IRuleExtractionResult} Extracted attributes with a 0-1 confidence score.
   */
  public extract(description: string): IRuleExtractionResult {
    const attributes: Record<string, unknown> = {};
    let matchedCount = 0;
    const text = this._stripAccents(description.toLowerCase().trim());

    // ---- brand (electronics / vehicles) ------------------------------------
    const brand = BRANDS.find(b => this._wordMatch(b, text));
    if (brand) {
      attributes.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      matchedCount++;
    }

    // ---- propertyType (real estate) ----------------------------------------
    const propType = PROPERTY_TYPES.find(p => this._wordMatch(p, text));
    if (propType) {
      attributes.propertyType = propType;
      matchedCount++;
    }

    // ---- condition ---------------------------------------------------------
    const condition = CONDITIONS.find(c => this._wordMatch(c, text));
    if (condition) {
      attributes.condition = condition;
      matchedCount++;
    }

    // ---- rooms (real estate) -----------------------------------------------
    const roomsMatch = text.match(/\b(\d+)\s*(cuartos|cuarto|ctos|hab|habitaciones|habitación|hab\.?)\b/i);
    if (roomsMatch) {
      attributes.rooms = parseInt(roomsMatch[1], 10);
      matchedCount++;
    }

    // ---- bathrooms (real estate) -------------------------------------------
    const bathMatch = text.match(/\b(\d+)\s*(banos|bano|baños|baño)\b/i);
    if (bathMatch) {
      attributes.bathrooms = parseInt(bathMatch[1], 10);
      matchedCount++;
    }

    // ---- garage (real estate) ----------------------------------------------
    const garageMatch = /\bgaraje\b|\bgarage\b/i.test(text);
    if (garageMatch) {
      attributes.garage = true;
      matchedCount++;
    }

    // ---- floors / levels (real estate) -------------------------------------
    const floorsMatch =
      text.match(/\b(\d+)\s*plantas\b/i) || text.match(/\b(biplanta|triplanta|dos niveles|tres niveles|dos plantas|tres plantas)\b/i);
    if (floorsMatch) {
      const floorMap: Record<string, number> = {
        biplanta: 2,
        'dos niveles': 2,
        'dos plantas': 2,
        triplanta: 3,
        'tres niveles': 3,
        'tres plantas': 3,
      };
      const val = floorMap[floorsMatch[1]?.toLowerCase()] || parseInt(floorsMatch[1], 10);
      attributes.floors = val;
      matchedCount++;
    }

    // ---- color (electronics / vehicles) ------------------------------------
    const color = COLORS.find(c => this._wordMatch(c, text));
    if (color) {
      attributes.color = color;
      matchedCount++;
    }

    // ---- storage (electronics) ---------------------------------------------
    const storageMatch = text.match(/\b(\d+)\s*(GB|TB|MB)\b/i);
    if (storageMatch) {
      attributes.storage = storageMatch[0].toUpperCase().replace(/\s/g, '');
      matchedCount++;
    }

    // ---- ram (electronics) -------------------------------------------------
    const ramMatch = text.match(/\b(\d+)\s*GB\s*(de\s*)?ram\b/i) || text.match(/\bram\s*(de\s*)?\s*(\d+)\s*GB?\b/i);
    if (ramMatch) {
      const ramValue = ramMatch[1] && /^\d+$/.test(ramMatch[1]) ? ramMatch[1] : ramMatch[2];
      attributes.ram = `${ramValue}GB`;
      matchedCount++;
    }

    // ---- delivery / location -----------------------------------------------
    const deliveryAction = [
      'se envía',
      'se envia',
      'entrega en',
      'entregas en',
      'solo entregas',
      'envío',
      'envio',
      'recogida en',
      'recoge en',
    ];
    const locationFound = LOCATIONS.find(loc => this._contains(loc, text)) || deliveryAction.find(k => this._contains(k, text));
    if (locationFound) {
      attributes.delivery = locationFound;
      matchedCount++;
    }

    // ---- warranty ----------------------------------------------------------
    const warrantyFound = WARRANTY_KEYWORDS.some(k => this._contains(k, text));
    if (warrantyFound) {
      attributes.warranty = true;
      matchedCount++;
    }

    // ---- price mentioned in description ------------------------------------
    const priceMatch = text.match(/\b(\d{2,})[.,]?\d*\s*(USD|CUP|EUR|usd|cup|eur|dólar|dolares|pesos|cuc|mlc|mil)\b/i);
    if (priceMatch) {
      attributes.originalPrice = `${priceMatch[1]} ${priceMatch[2].toUpperCase()}`;
      matchedCount++;
    }

    return {
      attributes,
      confidence: matchedCount / MAX_PATTERNS,
      matchedCount,
    };
  }

  /** Word-boundary match for a single-word term. */
  private _wordMatch(term: string, text: string): boolean {
    const normalized = this._stripAccents(term);
    return new RegExp(`\\b${this._escapeRegex(normalized)}\\b`, 'i').test(text);
  }

  /** Substring containment match for multi-word locations. */
  private _contains(term: string, text: string): boolean {
    return text.includes(this._stripAccents(term.toLowerCase()));
  }

  /** Remove Spanish accents so "súper" matches "super". */
  private _stripAccents(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** Escape special regex characters in a literal string. */
  private _escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
