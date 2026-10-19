/**
 * Number of leading row-group columns locked by `groupLockGroupColumns`:
 * `1` locks the first, `-1` locks all, `0` (default) none. Locked columns
 * can't be removed or reordered from the row-group UI, and nothing can be
 * moved into their positions; the API is not restricted.
 */
export function getLockedGroupCount(option: unknown, total: number): number {
  if (typeof option !== 'number' || Number.isNaN(option) || option === 0) return 0;
  return option < 0 ? total : Math.min(option, total);
}
