import { parseViews } from '@utils/normalize-data.util';

describe('Util - parseViews', () => {
  it('should return the correct number of views when input is a simple number', () => {
    const result = parseViews('1604');
    expect(result).toBe(1604);
  });

  it('should return the correct number of views when input includes commas', () => {
    const result = parseViews('12,345');
    expect(result).toBe(12345);
  });

  it('should return the correct number of views when input includes decimals', () => {
    const result = parseViews('12,345.67');
    expect(result).toBe(12345.67);
  });

  it('should return 0 when input contains no numbers', () => {
    const result = parseViews('No views');
    expect(result).toBe(0);
  });

  it('should return 0 when input is empty', () => {
    const result = parseViews('');
    expect(result).toBe(0);
  });

  it('should handle input with mixed text and numbers', () => {
    const result = parseViews('1604 visitas');
    expect(result).toBe(1604);
  });
});
