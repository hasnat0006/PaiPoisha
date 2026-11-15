/** Saving a user-ordered list (wallets, categories). */

/** New sort_order for rows whose position no longer matches it (so only those get written). */
export function sortOrderChanges(list: { id: string; sort_order: number }[]): { id: string; sort_order: number }[] {
  return list.flatMap((r, i) => (r.sort_order === i ? [] : [{ id: r.id, sort_order: i }]));
}
