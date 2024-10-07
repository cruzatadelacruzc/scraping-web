import { progressCalculate } from '@utils/queue.util';

describe('progressCalculate function', () => {
  it('should return 0 when total is zero', () => {
    expect(progressCalculate(0, 10)).toBe(0);
  });

  it('should return 0 when total is less than zero', () => {
    expect(progressCalculate(-10, 10)).toBe(0);
  });

  it('should return 0 when remaining is greater than total', () => {
    expect(progressCalculate(10, 20)).toBe(0);
  });

  it('should return 0 when remaining is equal to total', () => {
    expect(progressCalculate(10, 10)).toBe(0);
  });

  it('should return 100 when remaining is zero', () => {
    expect(progressCalculate(10, 0)).toBe(100);
  });

  it('should return a value between 0 and 100 when remaining is less than total', () => {
    expect(progressCalculate(10, 5)).toBeGreaterThan(0);
    expect(progressCalculate(10, 5)).toBeLessThan(100);
  });

  it('should return 100 when total is 1 and remaining is 0', () => {
    expect(progressCalculate(1, 0)).toBe(100);
  });

  it('should return 100 when total is 100 and remaining is 0', () => {
    expect(progressCalculate(100, 0)).toBe(100);
  });

  it('should log a warning when total is less than or equal to zero', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    progressCalculate(0, 10);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('Total must be greater than zero to calculate progress.');
    warnSpy.mockRestore();
  });

  it('should not return a decimal value', () => {
    const total = 30;
    const remaining = 11;
    const progress = progressCalculate(total, remaining);
    expect(progress % 1).toBe(0);
  });
});
