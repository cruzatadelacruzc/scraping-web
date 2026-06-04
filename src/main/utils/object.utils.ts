/**
 * Returns a copy of the original object without the specified properties.
 * @param obj - object to map
 * @param omitKeys - list of properties to exclude
 * @returns a new object with type Omit<T, K>
 */
export function omitKeys<T extends object, K extends keyof T>(obj: T, omitKeys: K[]): Omit<T, K> {
  const result = { ...obj } as any;
  for (const key of omitKeys) {
    delete result[key];
  }
  return result;
}
