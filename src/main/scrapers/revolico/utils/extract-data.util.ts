/**
 * Extracts a number from a URL, given its type. The type can be either 'productId' or 'phoneNumber'.
 * The function splits the URL using the dash '-' as a separator, filters out the segments that are not numbers,
 * and returns the last number segment if the type is 'productId', or the second to last number segment if the type is 'phoneNumber'.
 * If the URL does not contain enough numbers, the function returns null.
 *
 * @param {string} url - The URL to extract the number from.
 * @param {'productId'|'phoneNumber'} type - The type of number to extract.
 * @returns {string|null} The extracted number or null if the URL does not contain enough numbers.
 */
export const extractDataFromUrl = (url: string, type: 'productId' | 'phoneNumber'): string | null => {
  // Remove the part of the query string if there is one
  const cleanUrl = url.split('?')[0];

  // Split URL using dash '-'
  const segments = cleanUrl.split('-');

  // Filter only numbers, removing non-numeric characters
  const numbers = segments.map(segment => segment.replace(/\D/g, '')).filter(segment => segment);

  // Check if there are enough numbers to extract
  if (numbers.length < 2) {
    return null;
  }

  switch (type) {
    case 'productId':
      // The last number is always considered the product ID
      return numbers[numbers.length - 1];

    case 'phoneNumber':
      /**
       *  The phone number is the second to last, but should have at least 6 digits to avoid confusion
       *  Example: 21385989, 385989(without province code)
       */
      const phoneNumberCandidate = numbers[numbers.length - 2];
      return phoneNumberCandidate.length >= 6 ? phoneNumberCandidate : null;

    default:
      return null;
  }
};