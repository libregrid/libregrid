import type { GridApi } from 'ag-grid-community';
import {
  dataTypeFor,
  filterKindFor,
  operatorsFor,
  type AiDataType,
  type AiFilterKind,
  type AiFilterOperator,
} from './capabilities';

/** What the toolkit knows about one actionable column. */
export interface AiColumnSnapshot {
  colId: string;
  headerName: string;
  dataType: AiDataType;
  sortable: boolean;
  hideable: boolean;
  /** Null when the column carries no filter the toolkit can compile for. */
  filter: { kind: AiFilterKind; operators: readonly AiFilterOperator[] } | null;
  /** Optional developer-supplied hints, passed per call (not stored on ColDef). */
  description?: string;
  synonyms?: readonly string[];
}

/** The live grid as the toolkit sees it. */
export interface AiGridSnapshot {
  columns: AiColumnSnapshot[];
  currentFilterModel: Record<string, unknown>;
  /** Columns currently hidden — "hide one more" has to start from these. */
  hiddenColIds: string[];
  /**
   * Identity of the column configuration this snapshot describes. A model
   * response built against one revision must never be applied to another.
   */
  revision: string;
}

/** Per-column hints a caller may supply; keyed by colId. */
export interface AiColumnHints {
  description?: string;
  synonyms?: readonly string[];
  /** Set false to hide a column from the model entirely (e.g. sensitive data). */
  include?: boolean;
}

/**
 * Read the live grid through its public API only — no beans. Everything the
 * model is later told about the grid originates here, so this is also the
 * single place where a column can be withheld from the model.
 */
export function snapshotGrid(api: GridApi, hints: Record<string, AiColumnHints> = {}): AiGridSnapshot {
  const columns: AiColumnSnapshot[] = [];
  const hiddenColIds: string[] = [];

  for (const column of api.getColumns() ?? []) {
    const colId = column.getColId();
    const hint = hints[colId];
    if (hint?.include === false) continue;

    const colDef = column.getColDef() as { headerName?: string; field?: string; filter?: unknown; lockVisible?: boolean; cellDataType?: unknown };
    const dataType = dataTypeFor(colDef.cellDataType);
    // `isFilterAllowed()` is Community's own answer and accounts for
    // `defaultColDef`; the kind still has to be compilable for us to offer it.
    const kind = column.isFilterAllowed() ? filterKindFor(colDef.filter, dataType) : null;

    const snapshot: AiColumnSnapshot = {
      colId,
      headerName: colDef.headerName ?? colDef.field ?? colId,
      dataType,
      sortable: column.isSortable(),
      // Community does not enforce `lockVisible` against API calls — it only
      // blocks the UI — so honouring it is our job, not the grid's.
      hideable: colDef.lockVisible !== true,
      filter: kind ? { kind, operators: operatorsFor(kind) } : null,
    };
    if (!column.isVisible()) hiddenColIds.push(colId);
    if (hint?.description !== undefined) snapshot.description = hint.description;
    if (hint?.synonyms !== undefined) snapshot.synonyms = hint.synonyms;

    columns.push(snapshot);
  }

  return {
    columns,
    currentFilterModel: (api.getFilterModel() ?? {}) as Record<string, unknown>,
    hiddenColIds,
    revision: revisionOf(columns),
  };
}

/**
 * A cheap identity for the column configuration. Any change that could
 * invalidate a model response — a column appearing, disappearing, being
 * reordered, or changing type or capability — changes this string.
 */
export function revisionOf(columns: readonly AiColumnSnapshot[]): string {
  return columns
    .map((c) => `${c.colId}:${c.dataType}:${c.sortable ? 's' : ''}${c.hideable ? 'h' : ''}:${c.filter?.kind ?? '-'}`)
    .join('|');
}
