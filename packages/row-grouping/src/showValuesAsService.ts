import {
  BeanStub,
  _getClientSideRowModel,
  _warnOnce,
  type AgColumn,
  type AgShowValuesAsResolved,
  type Column,
  type ColumnState,
  type ColumnStateParams,
  type ColumnEventType,
  type GridApi,
  type IRowNode,
  type IShowValuesAsService,
  type MenuItemDef,
  type NamedBean,
  type RowNode,
  type ShowValuesAs,
  type ShowValuesAsApplicability,
  type ShowValuesAsBuiltInType,
  type ShowValuesAsDef,
  type ShowValuesAsDefResolved,
  type ShowValuesAsFormatterParams,
  type ShowValuesAsModeDef,
  type ShowValuesAsModesDef,
  type ShowValuesAsResult,
  type ShowValuesAsStateValue,
  type ShowValuesAsType,
} from 'ag-grid-community';
import type { ChangedPath } from 'ag-grid-community';
import type { MenuItemContribution, MenuActionParams } from '@libregrid/menu';

/**
 * Resolves a raw cell value to a scalar number for percentage math:
 * - plain numbers (NaN → null)
 * - `{ toNumber() }` wrappers (Community's BigNumber cells)
 * - `{ value, count }` aggregation wrappers (the `avg` result shape) — the
 *   interface docs say transform params carry "agg wrappers (e.g. `avg`)
 *   unwrapped" in `rawValue`
 */
function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj && 'count' in obj) return toNumber(obj.value);
    if ('toNumber' in obj) {
      const v = (obj.toNumber as () => unknown)();
      return typeof v === 'number' && !Number.isNaN(v) ? v : null;
    }
  }
  return null;
}

function ratioOrNull(raw: number | null, total: number | null): number | null {
  return raw != null && total ? (raw / total) * 100 : null;
}

/**
 * The built-in percent formatter: `#N/A` when the mode is not applicable in
 * the current view, a blank for a null transformed value, else the value at
 * the effective precision with a `%` suffix.
 */
function percentFormatter(params: ShowValuesAsFormatterParams): string {
  if (params.notApplicable) return '#N/A';
  if (params.value == null) return '';
  const precision = params.precision ?? 2;
  return `${Number(params.value).toFixed(precision)}%`;
}

type ResolvedMode = ShowValuesAsDefResolved['modes'][string];

/**
 * The five built-in "Show Values As" modes as full `ShowValuesAsModeDef`
 * definitions (Phase 14, A10). Every mode carries `defaultAggFunc: 'sum'` —
 * selecting a mode on a not-yet-aggregated column promotes it to a value
 * column (see `promoteDefaultAggFunc`), matching the documented mode
 * definition contract.
 *
 * `percentOfParentColumnTotal` is pivot-only: without a pivot column axis
 * there is no parent to divide by, so its `applicability` hides it from the
 * menu (except when it is the active selection) and marks it inapplicable
 * when pivot mode is active — our totals math does not compute pivot-axis
 * parent totals (the transform then returns null, never a wrong number).
 */
const BUILT_IN_MODES: Record<ShowValuesAsBuiltInType, ShowValuesAsModeDef> = {
  percentOfGrandTotal: {
    displayName: '% of Grand Total',
    description: "This cell's value as a percentage of the column's grand total",
    defaultAggFunc: 'sum',
    transform: (p) => ratioOrNull(toNumber(p.rawValue), p.grandTotal()),
    formatter: percentFormatter,
  },
  percentOfColumnTotal: {
    // Equal to percentOfGrandTotal outside pivot mode (no pivot-axis totals
    // in LibreGrid yet) — the documented default relationship, not a gap.
    displayName: '% of Column Total',
    description: "This cell's value as a percentage of its column's total",
    defaultAggFunc: 'sum',
    transform: (p) => ratioOrNull(toNumber(p.rawValue), p.columnTotal()),
    formatter: percentFormatter,
  },
  percentOfRowTotal: {
    displayName: '% of Row Total',
    description: "This cell's value as a percentage of the sum of value columns on its row",
    defaultAggFunc: 'sum',
    transform: (p) => ratioOrNull(toNumber(p.rawValue), p.rowTotal()),
    formatter: percentFormatter,
  },
  percentOfParentRowTotal: {
    displayName: '% of Parent Row Total',
    description: "This cell's value as a percentage of its nearest group ancestor's total",
    defaultAggFunc: 'sum',
    transform: (p) => ratioOrNull(toNumber(p.rawValue), p.parentTotal()),
    formatter: percentFormatter,
  },
  percentOfParentColumnTotal: {
    displayName: '% of Parent Column Total',
    description: "This cell's value as a percentage of its pivot column parent's total",
    defaultAggFunc: 'sum',
    applicability: (p) => (p.pivotActive ? 'inapplicable' : 'hide'),
    transform: (p) => ratioOrNull(toNumber(p.rawValue), p.parentColumnTotal()),
    formatter: percentFormatter,
  },
};

function toResolvedMode(type: string, def: ShowValuesAsModeDef): ResolvedMode {
  return {
    type,
    def,
    formatter: def.formatter ?? null,
    transformedDataType: def.transformedDataType ?? 'number',
  };
}

const BUILT_IN_RESOLVED: Record<string, ResolvedMode> = Object.fromEntries(
  (Object.keys(BUILT_IN_MODES) as ShowValuesAsBuiltInType[]).map((type) => [
    type,
    toResolvedMode(type, BUILT_IN_MODES[type]),
  ]),
);

/** Deep-merge one `modes` map entry over the base (the only nested field is `params`). */
function mergeModeDef(base: ShowValuesAsModeDef, partial: Partial<ShowValuesAsModeDef>): ShowValuesAsModeDef {
  const merged: ShowValuesAsModeDef = { ...base, ...partial };
  if (base.params !== undefined || partial.params !== undefined) {
    merged.params = { ...(base.params as object | undefined), ...(partial.params as object | undefined) };
  }
  return merged;
}

/**
 * Bean `showValuesAsSvc` — the "Show Values As" percent-of-total family plus
 * the user mode registry (`showValuesAsDef.modes`, Phase 14 A10).
 *
 * Confirmed against the compiled bundle: Community's own `ValueService` calls
 * only `isApplying`/`transform`/`formatValue` (the display/transform path)
 * and the column-header "Σ" indicator calls only `isApplying`/
 * `getActiveModeTooltip` — reading `column.showValuesAs`/
 * `column.showValuesAsDef` directly as plain writable `AgColumn` fields, not
 * through this bean. Every other method on `IShowValuesAsService` has zero
 * Community call sites — exactly the `autoColSvc`/`expansionSvc` pattern from
 * PR 2.3: we self-drive our own lifecycle (here, via `newColumnsLoaded`)
 * rather than being called into.
 *
 * **Column menu** (Phase 14 A10): `postConstruct` registers the
 * `showValuesAs` item in `@libregrid/menu`'s registry at runtime (the
 * module-scope `registerMenuItems` pattern can't be used because the factory
 * needs this bean for the `enableShowValuesAs` gate and the resolved modes).
 * The submenu's actions select modes through the public
 * `api.applyColumnState({ state: [{ colId, showValuesAs }] })` path, which
 * Community dispatches to `showValuesAsSvc.syncColState`.
 *
 * **Remaining extension point**: `ShowValuesAsModeDef.menu` (a mode's own
 * custom submenu builder, e.g. the "% Of <column>" base picker) is not
 * implemented — modes are applied by selecting them, which commits the
 * def's default `params`; there is no per-mode input UI.
 *
 * @feature Row Grouping -> Show Values As
 * @gridOption showValuesAs / initialShowValuesAs / showValuesAsDef / enableShowValuesAs
 */
export class ShowValuesAsService extends BeanStub implements IShowValuesAsService, NamedBean {
  beanName = 'showValuesAsSvc' as const;

  public postConstruct(): void {
    this.addManagedEventListeners({
      newColumnsLoaded: () => {
        for (const col of this.beans.colModel.getCols() ?? []) this.resolveColumn(col, true);
      },
    });
    this.registerMenuItem();
  }

  /**
   * Registers the `showValuesAs` column-menu item. The factory needs this
   * bean (eligibility gate + resolved modes), so registration happens at
   * runtime, not module scope. When `@libregrid/menu` is not registered the
   * mapper bean is absent and registration is skipped silently — the
   * programmatic paths (`colDef.showValuesAs`, `setColumnShowValuesAs`) still
   * work.
   */
  private registerMenuItem(): void {
    const mapper = this.beans.menuItemMapper as
      | { registry?: { register(contribution: MenuItemContribution): void } }
      | undefined;
    mapper?.registry?.register({
      name: 'showValuesAs',
      order: 25,
      factory: (params: MenuActionParams): MenuItemDef | null => {
        // Show Values As is a per-column operation: group-header menus carry
        // an AgProvidedColumnGroup in `column`, so hide the item there.
        const column =
          params.column != null && typeof (params.column as Column).getColDef === 'function'
            ? (params.column as Column)
            : null;
        return this.getShowValuesAsMenuItem(column, params.api);
      },
    });
  }

  // ---------------------------------------------------------------------
  // Resolution
  // ---------------------------------------------------------------------

  /**
   * `colDef.showValuesAsDef` deep-merges from `defaultColDef` (per the
   * `ShowValuesAsDef` contract): a per-column `null` still wins (explicit
   * disable), and per-column `modes` entries override grid-wide ones by name.
   */
  private mergedRawDef(colDef: Record<string, unknown>): ShowValuesAsDef | null | undefined {
    const columnDef = colDef.showValuesAsDef as ShowValuesAsDef | null | undefined;
    const defaultColDef = this.beans.gos.get('defaultColDef') as
      | { showValuesAsDef?: ShowValuesAsDef | null }
      | null
      | undefined;
    const defaultDef = defaultColDef?.showValuesAsDef;
    if (columnDef === null) return null;
    if (columnDef === undefined) return defaultDef;
    if (defaultDef === undefined || defaultDef === null) return columnDef;
    return {
      ...defaultDef,
      ...columnDef,
      modes: { ...defaultDef.modes, ...columnDef.modes },
    };
  }

  public resolveColumn(column: AgColumn, applyInitial: boolean): void {
    const colDef = column.getColDef() as Record<string, unknown>;
    const rawDef = this.mergedRawDef(colDef);
    if (rawDef === null) {
      column.showValuesAsDef = null;
      column.showValuesAs = null;
      return;
    }
    column.showValuesAsDef = {
      modes: this.buildResolvedModes(rawDef?.modes),
      precision: rawDef?.precision ?? 2,
      suppressHeaderIndicator: rawDef?.suppressHeaderIndicator,
    };

    const defaultColDef = (this.beans.gos.get('defaultColDef') ?? {}) as Record<string, unknown>;
    const selector =
      (applyInitial && colDef.showValuesAs == null
        ? colDef.initialShowValuesAs ?? defaultColDef.initialShowValuesAs
        : colDef.showValuesAs ?? defaultColDef.showValuesAs) ?? null;
    this.applySelection(column, selector as ShowValuesAsStateValue);
  }

  /**
   * Resolves the available mode map: the five built-ins, with
   * `showValuesAsDef.modes` entries applied on top — `true` re-enables (a
   * no-op on a built-in), `false`/`null` disables (removes; on a built-in
   * that hides it from the menu and rejects it as a selection), a function
   * receives the base def and returns the partial override, and a plain
   * partial deep-merges over the base (a new mode without a `transform` is a
   * pass-through that shows the raw value).
   */
  public buildResolvedModes(userModes: ShowValuesAsModesDef | undefined): ShowValuesAsDefResolved['modes'] {
    // Clone the built-in entries so merging a user partial never mutates the
    // shared `BUILT_IN_RESOLVED` singleton.
    const out: ShowValuesAsDefResolved['modes'] = {};
    for (const [type, mode] of Object.entries(BUILT_IN_RESOLVED)) {
      out[type] = { ...mode, def: { ...mode.def } };
    }
    if (!userModes) return out;
    for (const [name, entry] of Object.entries(userModes)) {
      if (entry === false || entry === null) {
        delete out[name];
        continue;
      }
      if (entry === true) continue;
      const partial = typeof entry === 'function' ? entry(out[name]?.def) : entry;
      if (out[name]) {
        const base = out[name];
        base.def = mergeModeDef(base.def, partial);
        base.formatter = base.def.formatter ?? null;
        base.transformedDataType = base.def.transformedDataType ?? 'number';
      } else {
        out[name] = toResolvedMode(name, partial);
      }
    }
    return out;
  }

  /** The column's resolved mode map — its own when resolved, else the built-ins. */
  private resolvedModeMap(column: AgColumn): ShowValuesAsDefResolved['modes'] {
    const modes = column.showValuesAsDef?.modes;
    return modes && Object.keys(modes).length > 0 ? modes : BUILT_IN_RESOLVED;
  }

  private resolvedMode(column: AgColumn, type: string): ResolvedMode | undefined {
    return this.resolvedModeMap(column)[type];
  }

  /** The mode's effective params: the def's `params` overlaid by the selection's. */
  private effectiveParams(
    resolved: AgShowValuesAsResolved,
    def: ShowValuesAsModeDef,
  ): Record<string, unknown> | undefined {
    const selectorParams = (resolved.params ?? {}) as Record<string, unknown>;
    const defParams = (def.params ?? {}) as Record<string, unknown>;
    const merged = { ...defParams, ...selectorParams };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private applySelection(column: AgColumn, selection: ShowValuesAsStateValue): void {
    if (selection == null) {
      column.showValuesAs = null;
      return;
    }
    const { type, params, precision } =
      typeof selection === 'string' ? { type: selection, params: undefined, precision: undefined } : selection;
    const mode = this.resolvedModeMap(column)[type];
    if (!mode) {
      _warnOnce(`LibreGrid: unknown showValuesAs mode '${type}'`);
      column.showValuesAs = null;
      return;
    }
    const resolved: AgShowValuesAsResolved = {
      type,
      def: mode.def,
      formatter: mode.formatter,
      transformedDataType: mode.transformedDataType,
      params: this.effectiveParams({ params } as AgShowValuesAsResolved, mode.def),
      precision: precision ?? column.showValuesAsDef?.precision ?? 2,
      _applyingSig: 0,
      _applyingValue: false,
    };
    column.showValuesAs = resolved;
    this.promoteDefaultAggFunc(column, mode.def);
  }

  /**
   * `defaultAggFunc` promotion: selecting a mode that declares a default
   * aggregation on a not-yet-aggregated column promotes the column to a
   * value column with that func (documented mode contract); a column with
   * its own agg func keeps it.
   */
  private promoteDefaultAggFunc(column: AgColumn, def: ShowValuesAsModeDef): void {
    const func = def.defaultAggFunc;
    if (!func) return;
    if (column.getAggFunc != null && column.getAggFunc() != null) return;
    (this.beans.gridApi as GridApi | undefined)?.setColumnAggFunc?.(column.getColId(), func);
  }

  // ---------------------------------------------------------------------
  // Column state
  // ---------------------------------------------------------------------

  public colDefSelection(colDef: { showValuesAs?: ShowValuesAsStateValue }): ShowValuesAsStateValue {
    return colDef.showValuesAs ?? null;
  }

  public toColState(column: AgColumn): ShowValuesAsStateValue {
    const resolved = column.showValuesAs;
    if (!resolved) return null;
    // String form for plain selections; the object form (with `params`) is
    // reserved for modes that take input — `precision` rides along there, as
    // it can only be set through the object form.
    if (resolved.params == null) return resolved.type;
    return { type: resolved.type, params: resolved.params, precision: resolved.precision };
  }

  public syncColState(
    column: AgColumn,
    stateItem: ColumnState | null,
    defaultState: ColumnStateParams | undefined,
    _source: ColumnEventType,
  ): void {
    const selection = stateItem?.showValuesAs ?? defaultState?.showValuesAs ?? null;
    this.applySelection(column, selection);
  }

  // ---------------------------------------------------------------------
  // Display path (called by Community's ValueService / header indicator)
  // ---------------------------------------------------------------------

  private applicability(column: AgColumn, def: ShowValuesAsModeDef): ShowValuesAsApplicability {
    const applicability = def.applicability;
    if (typeof applicability === 'function') {
      return applicability({
        api: this.beans.gridApi as GridApi,
        context: this.beans.gos.get('context'),
        column,
        rowGroupActive: (this.beans.rowGroupColsSvc?.columns ?? []).length > 0,
        treeData: this.beans.gos.get('treeData'),
        pivotActive: (this.beans.gridApi as GridApi | undefined)?.isPivotMode?.() ?? false,
      });
    }
    return applicability ?? true;
  }

  public isApplying(column: AgColumn): boolean {
    const resolved = column.showValuesAs;
    if (!resolved) return false;
    const mode = this.resolvedMode(column, resolved.type);
    if (!mode) return false;
    const applicability = this.applicability(column, mode.def);
    if (applicability !== true && applicability !== 'enabled') return false;
    const ready = mode.def.ready;
    if (ready && !ready(this.effectiveParams(resolved, mode.def) ?? {})) return false;
    return true;
  }

  public refreshRenderedCells(): void {
    this.beans.gridApi?.refreshCells({ force: true });
  }

  public refreshRenderedCellsExcept(_nodes: Set<RowNode> | null, _path: ChangedPath | null): void {
    this.refreshRenderedCells();
  }

  public transform(column: AgColumn, rowNode: IRowNode, rawValue: unknown): ShowValuesAsResult | null {
    const resolved = column.showValuesAs;
    if (!resolved || !this.isApplying(column)) return rawValue as ShowValuesAsResult;
    const mode = this.resolvedMode(column, resolved.type);
    if (!mode?.def.transform) return rawValue as ShowValuesAsResult;
    const aggValue = rawValue;
    return mode.def.transform({
      api: this.beans.gridApi as GridApi,
      context: this.beans.gos.get('context'),
      node: rowNode,
      column,
      rawValue: toNumber(aggValue),
      aggValue,
      params: this.effectiveParams(resolved, mode.def),
      grandTotal: () => this.grandTotal(column),
      columnTotal: () => this.grandTotal(column),
      parentTotal: () => this.parentTotal(column, rowNode),
      parentColumnTotal: () => null,
      rowTotal: () => this.rowTotal(rowNode),
    });
  }

  public formatValue(
    column: AgColumn,
    rowNode: IRowNode | null,
    transformedValue: unknown,
    rawValue: unknown,
    notApplicable: boolean,
  ): string | null {
    const resolved = column.showValuesAs;
    if (!resolved) return null;
    const mode = this.resolvedMode(column, resolved.type);
    const formatter = mode?.def.formatter;
    if (!formatter) return null;
    const precision = resolved.precision ?? column.showValuesAsDef?.precision ?? 2;
    return formatter({
      api: this.beans.gridApi as GridApi,
      context: this.beans.gos.get('context'),
      node: rowNode,
      data: (rowNode as RowNode | null)?.data,
      column,
      colDef: column.getColDef(),
      value: transformedValue as never,
      showValuesAsType: resolved.type,
      rawValue: toNumber(rawValue),
      aggValue: rawValue,
      precision,
      notApplicable,
    } as ShowValuesAsFormatterParams);
  }

  public getActiveModeLabel(column: AgColumn): string | null {
    const resolved = column.showValuesAs;
    if (!resolved || !this.isApplying(column)) return null;
    const mode = this.resolvedMode(column, resolved.type);
    return this.displayString(mode?.def.displayName, resolved.type);
  }

  public getActiveModeTooltip(column: AgColumn): string | null {
    const resolved = column.showValuesAs;
    if (!resolved) return null;
    const mode = this.resolvedMode(column, resolved.type);
    if (!mode) return null;
    return `${this.displayString(mode.def.displayName, resolved.type)}: ${this.displayString(mode.def.description, '')}`;
  }

  private displayString(value: string | (() => string) | undefined, fallback: string): string {
    if (typeof value === 'function') return value();
    return value ?? fallback;
  }

  // ---------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------

  /**
   * Eligibility gate for the column menu: an explicit per-column
   * `enableShowValuesAs` always wins; when it is only set on
   * `defaultColDef`, the feature applies to numeric-type or aggregated
   * columns only (the documented `defaultColDef` semantics).
   */
  public isMenuEligible(column: AgColumn): boolean {
    // `getColDef()` returns the colDef merged with `defaultColDef`, so a flag
    // set there already appears on every column's def.
    const colDef = column.getColDef() as Record<string, unknown>;
    if (colDef.enableShowValuesAs !== true) return false;
    const defaultColDef = (this.beans.gos.get('defaultColDef') ?? {}) as Record<string, unknown>;
    if (defaultColDef.enableShowValuesAs !== true) return true; // explicit per-column opt-in
    // Flag supplied by `defaultColDef`: apply to numeric-type or aggregated
    // columns only. (A per-column `true` combined with a default `true` is
    // indistinguishable from the merged def and is gated too — the stricter
    // reading; the rare combination is documented that way.)
    return colDef.cellDataType === 'number' || colDef.cellDataType === 'bigNumber' || column.getAggFunc() != null;
  }

  /**
   * The mode entries offered for a column: `None` plus every available mode
   * with the active one checked. Modes whose applicability is `hide` are
   * omitted unless they are the active selection (kept, disabled, so the
   * selection stays visible and changeable); `disabled`/`inapplicable`
   * modes are offered disabled. `ready` does not gate the menu — an
   * unconfigured mode stays selectable (it shows `#N/A` until configured).
   */
  public getMenuItems(column: AgColumn, _localeTextFunc: unknown): MenuItemDef[] {
    const current = column.showValuesAs?.type;
    const items: MenuItemDef[] = [
      {
        name: 'None',
        checked: current == null,
        action: () => this.setColumnShowValuesAs(column, null),
      },
    ];
    for (const mode of Object.values(this.resolvedModeMap(column))) {
      const applicability = this.applicability(column, mode.def);
      const disabled =
        applicability === 'disabled' ||
        applicability === 'inapplicable' ||
        (applicability === false || applicability === 'hide') && current === mode.type;
      if ((applicability === false || applicability === 'hide') && current !== mode.type) continue;
      items.push({
        name: this.displayString(mode.def.displayName, mode.type),
        checked: current === mode.type,
        ...(disabled ? { disabled: true } : {}),
        action: () => this.setColumnShowValuesAs(column, mode.type),
      });
    }
    return items;
  }

  /**
   * The `showValuesAs` column-menu item: a "Show Values As" submenu whose
   * entries select modes through the public `api.applyColumnState` path
   * (Community dispatches `showValuesAs` state to `syncColState`). Returns
   * `null` to hide the item when the column is not eligible or no modes
   * beyond `None` are available.
   */
  /**
   * The `showValuesAs` column-menu item: a "Show Values As" submenu whose
   * entries select modes through the public `api.applyColumnState` path
   * (Community dispatches `showValuesAs` state to `syncColState`). Returns
   * `null` to hide the item when the column is not eligible or no modes
   * are available.
   */
  public getShowValuesAsMenuItem(column: Column | null, api: GridApi): MenuItemDef | null {
    if (!column) return null;
    const agColumn = column as AgColumn;
    if (!this.isMenuEligible(agColumn)) return null;
    const current = agColumn.showValuesAs?.type;
    const modes = Object.values(this.resolvedModeMap(agColumn)).filter((mode) => {
      const applicability = this.applicability(agColumn, mode.def);
      return (applicability !== false && applicability !== 'hide') || current === mode.type;
    });
    if (modes.length === 0) return null;
    const colId = agColumn.getColId();
    return {
      name: 'Show Values As',
      subMenu: [
        {
          name: 'None',
          checked: current == null,
          action: () => api.applyColumnState({ state: [{ colId, showValuesAs: null }] }),
        },
        ...modes.map((mode) => {
          const applicability = this.applicability(agColumn, mode.def);
          const disabled = applicability === 'disabled' || applicability === 'inapplicable';
          return {
            name: this.displayString(mode.def.displayName, mode.type),
            checked: current === mode.type,
            ...(disabled ? { disabled: true } : {}),
            action: () => api.applyColumnState({ state: [{ colId, showValuesAs: mode.type }] }),
          };
        }),
      ],
    };
  }

  public setColumnShowValuesAs(column: AgColumn, selection: ShowValuesAsType | ShowValuesAs | null): void {
    this.applySelection(column, selection);
    column.dispatchStateUpdatedEvent('showValuesAs');
    this.refreshRenderedCells();
  }

  // ---------------------------------------------------------------------
  // Total math (used by the built-in transforms via the params accessors)
  // ---------------------------------------------------------------------

  /** @internal */
  public grandTotal(column: AgColumn): number | null {
    if (!this.beans.rowModel) return null;
    const root = _getClientSideRowModel(this.beans)?.rootNode;
    if (!root) return null;
    const colId = column.getColId();
    if (root.aggData && colId in root.aggData) return toNumber(root.aggData[colId]);
    return this.sumLeaves(column, root.allLeafChildren ?? []);
  }

  /** @internal */
  public rowTotal(node: IRowNode): number | null {
    const cols = this.beans.valueColsSvc?.columns ?? [];
    let total = 0;
    let found = false;
    for (const col of cols) {
      const n = toNumber(this.readRaw(col, node));
      if (n != null) {
        total += n;
        found = true;
      }
    }
    return found ? total : null;
  }

  /** @internal */
  public parentTotal(column: AgColumn, node: IRowNode): number | null {
    const parent = (node as RowNode).parent;
    if (parent?.group && parent.aggData) {
      return toNumber(parent.aggData[column.getColId()]);
    }
    return this.grandTotal(column);
  }

  private readRaw(column: AgColumn, node: IRowNode): unknown {
    if (node.group) return (node as RowNode).aggData?.[column.getColId()];
    return this.beans.valueSvc?.getValueFromData(column, node as RowNode);
  }

  /** @internal — pure percent-of-total math, exposed for tests. */
  public ratio(raw: number | null, total: number | null): number | null {
    return ratioOrNull(raw, total);
  }

  private sumLeaves(column: AgColumn, leaves: RowNode[]): number | null {
    let total = 0;
    let found = false;
    for (const leaf of leaves) {
      const n = toNumber(this.beans.valueSvc?.getValueFromData(column, leaf));
      if (n != null) {
        total += n;
        found = true;
      }
    }
    return found ? total : null;
  }
}
