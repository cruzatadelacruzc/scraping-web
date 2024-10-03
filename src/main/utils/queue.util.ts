  /**
   * Calculates the progress percentage based on the total and remaining items.
   * Ensures no division by zero and returns 0 if total is zero.
   *
   * @param {number} total - The total number of items.
   * @param {number} remaining - The number of items remaining.
   * @returns {number} - The progress percentage (0-100). Returns 0 if total is 0.
   */
  export function progressCalculate(total: number, remaining: number): number {
    if (total <= 0) {
      console.warn('Total must be greater than zero to calculate progress.');
      return 0;
    }

    const progress = ((total - remaining + 1) / total) * 100;

    // Ensure the progress is within the range 0-100
    return Math.min(Math.max(progress, 0), 100);
  }