/**
 * Swipe left / right between the four tabs (user, 2026-11-09). Left = next tab (Home → Transactions → Budgets → More),
 * right = previous, like Instagram. Pure: the shell measures the gesture and animates, this decides where it goes.
 */
export const TAB_ORDER = ["/", "/transactions/", "/budgets/", "/more/"] as const;

export const SWIPE_MIN_PX = 60; // a flick must still travel this far
export const FLICK_MS = 300; // quicker than this counts as a flick, however short (above the minimum)

/** The tab `step` places away from `path` (1 = next, -1 = previous), or null at the ends and off the tabs. */
export function neighbourTab(path: string, step: 1 | -1): string | null {
  const here = TAB_ORDER.indexOf(path.replace(/\/?$/, "/") as (typeof TAB_ORDER)[number]);
  return here < 0 ? null : (TAB_ORDER[here + step] ?? null);
}

/** Where a finished drag goes: past a third of the screen, or a quick flick, and clearly sideways. Else null. */
export function swipeTarget(path: string, dx: number, dy: number, ms: number, width: number): string | null {
  const far = Math.abs(dx) >= width / 3;
  const flick = Math.abs(dx) >= SWIPE_MIN_PX && ms <= FLICK_MS;
  if (!(far || flick) || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return neighbourTab(path, dx < 0 ? 1 : -1);
}
