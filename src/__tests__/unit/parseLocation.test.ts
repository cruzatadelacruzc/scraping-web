import { parseLocation } from '@utils/normalize-data.util';

describe('Util - parseLocation', () => {
  it('should parse a location with municipality and state separated by "/"', () => {
    const location = '10 de Octubre/ La Habana';
    const result = parseLocation(location);
    expect(result).toEqual({
      state: 'La Habana',
      municipality: '10 de Octubre',
    });
  });

  it('should parse a location with municipality and state separated by "-"', () => {
    const location = 'Santa Clara- Villa Clara';
    const result = parseLocation(location);

    expect(result).toEqual({
      municipality: 'Santa Clara',
      state: 'Villa Clara',
    });
  });

  it('should parse a location with municipality and state separated by ","', () => {
    const location = 'Marianao, La Habana';
    const result = parseLocation(location);

    expect(result).toEqual({
      municipality: 'Marianao',
      state: 'La Habana',
    });
  });

  it('should parse a location with only state', () => {
    const location = 'Guantánamo';
    const result = parseLocation(location);

    expect(result).toEqual({
      state: 'Guantánamo',
    });
  });

  it('should handle locations with multiple non-alphanumeric separators', () => {
    const location = 'La yaya... Guantánamo';
    const result = parseLocation(location);

    expect(result).toEqual({
      municipality: 'La yaya',
      state: 'Guantánamo',
    });
  });

  it('should trim extra spaces around parts', () => {
    const location = '  Cienfuegos /  Cienfuegos  ';
    const result = parseLocation(location);

    expect(result).toEqual({
      municipality: 'Cienfuegos',
      state: 'Cienfuegos',
    });
  });

  it('should return only state when no municipality is provided', () => {
    const location = 'Santiago de Cuba';
    const result = parseLocation(location);

    expect(result).toEqual({
      state: 'Santiago de Cuba',
    });
  });

  it('should ignore empty parts and return only valid parts', () => {
    const location = '   -  -  La Habana';
    const result = parseLocation(location);

    expect(result).toEqual({
      state: 'La Habana',
    });
  });
});
