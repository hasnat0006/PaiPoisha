/** Moving an item up or down in a user-ordered list (wallets, categories). */

/** The list with item `index` moved by `dir` (−1 up, +1 down). Out of range: unchanged. */
export function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir;
  if (index < 0 || to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

/** New sort_order for rows whose position no longer matches it (so only those get written). */
export function sortOrderChanges(list: { id: string; sort_order: number }[]): { id: string; sort_order: number }[] {
  return list.flatMap((r, i) => (r.sort_order === i ? [] : [{ id: r.id, sort_order: i }]));
}
