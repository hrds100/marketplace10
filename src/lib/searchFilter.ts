// Generic search filter for admin tables

export function searchFilter<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return items;
  const lower = query.toLowerCase();
  return items.filter(item =>
    fields.some(field => {
      const val = item[field];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(lower);
    })
  );
}
