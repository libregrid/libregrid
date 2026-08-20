import type { AgColumn, ColDef, ColKey, Column } from 'ag-grid-community';

/**
 * `ColKey` is `string | ColDef | Column`, and the `column` a note param
 * carries can also be a live column object. Community's own `isColumn` is an
 * `instanceof AgColumn` check: correct, but it rejects both plain `ColDef`
 * references and non-`AgColumn` stand-ins (as used in unit tests). A live
 * column is identified by its `getColId()` method, which neither a `ColDef`
 * (a config object) nor a `ColumnGroup` (it exposes `getId`, not `getColId`)
 * has.
 */
export function isLiveColumn(value: unknown): value is Column {
  return typeof value === 'object' && value !== null && typeof (value as Column).getColId === 'function';
}

/** Narrow a `ColKey` to a live column (string and ColDef references return false). */
export function isColumnInstance(key: ColKey): key is AgColumn {
  return isLiveColumn(key);
}

/** Extract a stable column id from any `ColKey` shape. */
export function colIdOf(key: ColKey): string {
  if (typeof key === 'string') {
    return key;
  }
  if (isLiveColumn(key)) {
    return key.getColId();
  }
  const def = key as ColDef;
  return def.colId ?? (typeof def.field === 'string' ? def.field : '');
}
