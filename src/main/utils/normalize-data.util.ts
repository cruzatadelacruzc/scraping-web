/**
 * Parses the cost string to extract the numeric value and the currency.
 *
 * @param {string} cost - The cost string to be parsed, which may include numbers, commas, periods, and currency symbols/letters.
 *
 * @returns {{ value: number, currency: string }} An object containing:
 * - value: The parsed numeric value of the cost.
 * - currency: The extracted currency symbol or letters (default is 'USD' if none found).
 */

export const parseCost = (cost: string): { value: number; currency: string } => {
  const currencyMatch = cost.match(/[a-zA-Z]+/); // Extract text as USD
  const valueMatch = cost.match(/[\d,.]+/); //Extract number, including decimals

  const currency = currencyMatch ? currencyMatch[0] : 'CUP';
  const value = valueMatch ? parseFloat(valueMatch[0].replace(',', '')) : 0;

  return { value, currency };
};

/**
 * Constructs a full URL from a base URL and a path segment.
 *
 * @param {string} baseUrl - The base URL to which the path will be appended.
 * @param {string} path - The path segment to append to the base URL.
 * @returns {string | null} The constructed full URL or null if the URL is invalid.
 */
export function buildFullUrl(baseUrl: string, path: string): string | null {
  try {
    const url = new URL(path, baseUrl);
    return url.href;
  } catch (error) {
    console.error('🔥 Invalid URL:', error);
    return null;
  }
}

/**
 * Extracts and parses the numeric value from a string representing views.
 * Handles numbers with commas and decimals.
 *
 * @param {string} views - The string containing the view count, potentially with commas or additional text.
 * @returns {number} The parsed numeric value of the views, or 0 if no valid number is found.
 */
export const parseViews = (views: string): number => {
  const valueMatch = views.match(/[\d,.]+/); //Extract number, including decimals
  const value = valueMatch ? parseFloat(valueMatch[0].replace(',', '')) : 0;

  return value;
};

/**
 * Parses a location string into state and municipality (if available).
 * It accepts any non-alphanumeric character as a separator (e.g., '/', '-', '+', '.').
 *
 * @param location - The location string, which could be in the format "municipality/ province" or just "state".
 * @returns An object with the state and optionally the municipality.
 */
export const parseLocation = (location: string): { state: string; municipality?: string } => {
  // Usar una expresión regular que identifique cualquier carácter no alfanumérico, excluyendo el espacio
  const parts = location
    .split(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\d]+/)
    .map(part => part.trim())
    .filter(Boolean);

  // Si solo hay una parte, es solo el estado
  if (parts.length === 1) {
    return { state: parts[0] };
  }

  // Si hay dos partes, la primera es el municipio y la segunda es el estado
  return {
    municipality: parts[0],
    state: parts[1],
  };
};
