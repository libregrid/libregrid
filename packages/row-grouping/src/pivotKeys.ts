/**
 * Pivot-key bucket helper shared by `AggregationStage` and
 * `AggregatedChildrenService`.
 *
 * Both need to decide whether a row sits in the same pivot bucket a pivot result
 * column represents, and they must agree exactly — otherwise a group's displayed
 * aggregate and the children a group edit distributes to would disagree. Keeping
 * the normalisation in one place is what makes that agreement checkable.
 *
 * @internal — package-internal helper, not part of the public API.
 */

/**
 * Normalises a pivot key value for comparison.
 *
 * `0` and `'0'` must compare equal, while `null` and `undefined` must stay
 * distinct from each other and from the *strings* `'null'`/`'undefined'` — hence
 * the `\u0000` sentinels, which a real stringified value cannot produce.
 */
export function pivotKey(value: unknown): string {
  if (value === null) return '\u0000null';
  if (value === undefined) return '\u0000undefined';
  return String(value);
}
