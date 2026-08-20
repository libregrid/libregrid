import type { FilterModel } from 'ag-grid-community';
// Type-only: `SsrmSelectionService` imports `SsrmSelectionOptions` below, so
// this stays `import type` to avoid a runtime cycle.
import type { SsrmSelectionService } from './ssrmSelectionService';

/**
 * One term of a server-side selection spec.
 *
 * - `all` — "Select All" captured under a filter model; the server evaluates
 *   the filter against the full dataset.
 * - `group` — a whole SSRM group (identified by its route: the chain of
 *   ancestor group keys, root to self) selected atomically (rule R5).
 *
 * Terms accumulate (R1); `exceptions` and `additions` (server-only sets,
 * never materialized on the client) refine them per row/group.
 */
export type SelectionTerm = { type: 'all'; filter: FilterModel } | { type: 'group'; route: string[] };

/**
 * A compact server-side selection spec: the terms plus the server's
 * aggregate selected count. The client never holds the full selection.
 */
export interface SelectionSpec {
  /** The selection terms, in capture order. */
  terms: SelectionTerm[];
  /** Server-side total number of selected rows (across the full dataset). */
  selectedCount: number;
}

/**
 * The ops protocol — the client's only writes to the spec. Every op is
 * small: at most one filter model, one group route, or one batch of
 * currently-loaded row ids (bounded by the datasource cache).
 *
 * - `selectAll` — append the `all` term for `filter`; the server clears the
 *   in-scope exceptions first (R4) and dedupes.
 * - `deselectAll` — clear every term, exception and addition.
 * - `select` / `deselect` — row-level additions / exceptions.
 * - `selectGroup` — append the `group` term for `route`; clears the route's
 *   exceptions (R4).
 * - `deselectGroup` — a route exception (R3).
 */
export type SelectionOp =
  | { op: 'selectAll'; filter: FilterModel }
  | { op: 'deselectAll' }
  | { op: 'select'; ids: string[] }
  | { op: 'deselect'; ids: string[] }
  | { op: 'selectGroup'; route: string[] }
  | { op: 'deselectGroup'; route: string[] };

/**
 * The app-implemented provider — the Redis/DB seam. All three calls are
 * keyed by `{gridId, tabId}` so open tabs own independent selections.
 *
 * Responsiveness is the provider's own job: the package only ever sends
 * cache-sized id batches (`resolveSelected`), and the backend is expected
 * to keep the spec hot.
 */
export interface ServerSideSelectionProvider {
  /** Fetch the current spec for the tab. */
  getSpec(params: { gridId: string; tabId: string }): Promise<SelectionSpec>;
  /** Apply a batch of ops to the spec (server-side, atomic per batch). */
  applyOps(params: { gridId: string; tabId: string; ops: SelectionOp[] }): Promise<void>;
  /**
   * Evaluate the spec for a batch of loaded rows. `rowIds` are leaf row ids
   * (`getRowId` values); `groupRoutes` are route keys (the `getSsrmRoute`
   * arrays serialized to `|`-joined strings). The result maps each sent key
   * to its selected state; missing keys default to `false`.
   */
  resolveSelected(params: {
    gridId: string;
    tabId: string;
    rowIds: string[];
    groupRoutes: string[];
  }): Promise<Record<string, boolean>>;
}

/** The `ssrmSelection` grid option. */
export interface SsrmSelectionOptions {
  /** The app's provider (the Redis/DB seam). */
  provider: ServerSideSelectionProvider;
  /** The app's tab identity → `{gridId}:{tabId}` selection isolation. */
  tabId: string;
  /** Defaults to the grid's own id. */
  gridId?: string;
  /** Debounce window for op batching; default 300 ms. */
  opDebounceMillis?: number;
  /** Called once the first hydration completes; the app mounts the footer here. */
  onReady?: (service: SsrmSelectionService) => void;
}

// The community re-exports its selection internals through the public entry
// (`main.d.ts` → `export * from './main-internal'`), so the params and the
// source taxonomy are imported directly rather than re-declared.
export type {
  ISelectionService,
  ISetNodesSelectedParams,
  SelectionEventSourceType,
} from 'ag-grid-community';
