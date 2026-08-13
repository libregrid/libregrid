import {
  BeanStub,
  _getClientSideRowModel,
  _warnOnce,
  type AgColumn,
  type AgShowValuesAsResolved,
  type ColumnState,
  type ColumnStateParams,
  type ColumnEventType,
  type IRowNode,
  type IShowValuesAsService,
  type MenuItemDef,
  type NamedBean,
  type RowNode,
  type ShowValuesAs,
  type ShowValuesAsBuiltInType,
  type ShowValuesAsFormatterParams,
  type ShowValuesAsModeDef,
  type ShowValuesAsResult,
  type ShowValuesAsStateValue,
  type ShowValuesAsType,
} from 'ag-grid-community';
import type { ChangedPath } from 'ag-grid-community';

interface ModeCompute {
  (svc: ShowValuesAsService, column: AgColumn, node: IRowNode, raw: number): number | null;
}

const MODES: Record<ShowValuesAsBuiltInType, { displayName: string; description: string; compute: ModeCompute }> = {
  percentOfGrandTotal: {
    displayName: '% of Grand Total',
    description: "This cell's value as a percentage of the column's grand total",
    compute: (svc, column, _node, raw) => svc.ratio(raw, svc.grandTotal(column)),
  },
  percentOfColumnTotal: {
    // Equal to percentOfGrandTotal outside pivot mode (no PivotModule in
    // LibreGrid yet) — this is the documented default relationship, not a gap.
    displayName: '% of Column Total',
    description: "This cell's value as a percentage of its column's total",
    compute: (svc, column, _node, raw) => svc.ratio(raw, svc.grandTotal(column)),
  },
  percentOfRowTotal: {
    displayName: '% of Row Total',
    description: "This cell's value as a percentage of the sum of value columns on its row",
    compute: (svc, _column, node, raw) => svc.ratio(raw, svc.rowTotal(node)),
  },
  percentOfParentRowTotal: {
    displayName: '% of Parent Row Total',
    description: "This cell's value as a percentage of its nearest group ancestor's total",
    compute: (svc, column, node, raw) => svc.ratio(raw, svc.parentTotal(column, node)),
  },
  percentOfParentColumnTotal: {
    // "null when not pivoting" per IShowValuesAsService's own doc comment on
    // parentColumnTotal() — genuinely has nothing to compute without a pivot
    // column axis. Not a bug: this mode is always inapplicable here.
    displayName: '% of Parent Column Total',
    description: 'Pivot-only — requires the Pivot module',
    compute: () => null,
  },
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const v = (value as { toNumber?: () => unknown }).toNumber?.();
    return typeof v === 'number' ? v : null;
  }
  return null;
}

/**
 * Bean `showValuesAsSvc` — the "Show Values As" percent-of-total family
 * (`percentOfGrandTotal`, `percentOfColumnTotal`, `percentOfRowTotal`,
 * `percentOfParentRowTotal`, `percentOfParentColumnTotal`).
 *
 * Confirmed against the compiled bundle: Community's own `ValueService` calls
 * only `isApplying`/`transform`/`formatValue` (the display/transform path)
 * and the column-header "Σ" indicator calls only `isApplying`/
 * `getActiveModeTooltip` — reading `column.showValuesAs`/
 * `column.showValuesAsDef` directly as plain writable `AgColumn` fields, not
 * through this bean. Every other method on `IShowValuesAsService`
 * (`resolveColumn`, `colDefSelection`, `toColState`, `syncColState`,
 * `isMenuEligible`, `getMenuItems`, `setColumnShowValuesAs`,
 * `refreshRenderedCells*`) has zero Community call sites — exactly the
 * `autoColSvc`/`expansionSvc` pattern from PR 2.3: we self-drive our own
 * lifecycle (here, via `newColumnsLoaded`) rather than being called into.
 *
 * Scope, documented rather than silently assumed: `showValuesAsDef.modes`
 * (user-registered custom modes / built-in overrides) is not implemented —
 * only the five built-ins resolve. `ShowValuesAsModeDef.menu` (a mode's own
 * custom submenu builder, e.g. for a "% Of <column>" picker dialog) is not
 * implemented — `getMenuItems` offers only a flat mode list. Neither has a
 * Community call site either, so nothing regresses; both are extension
 * points for a future PR. `getMenuItems`'s output is not wired into
 * `@libregrid/menu`'s `ColumnMenuFactory` — that would mean editing
 * `@libregrid/menu`, which PR 2.5's menu-contribution items are explicitly
 * scoped to avoid; `setColumnShowValuesAs` and `colDef.showValuesAs` are the
 * two ways to actually select a mode this PR ships.
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
  }

  public resolveColumn(column: AgColumn, applyInitial: boolean): void {
    const colDef = column.getColDef();
    const rawDef = colDef.showValuesAsDef;
    if (rawDef === null) {
      column.showValuesAsDef = null;
      column.showValuesAs = null;
      return;
    }
    column.showValuesAsDef = {
      modes: {},
      precision: rawDef?.precision ?? 2,
      suppressHeaderIndicator: rawDef?.suppressHeaderIndicator,
    };

    const selector = (applyInitial && colDef.showValuesAs == null ? colDef.initialShowValuesAs : colDef.showValuesAs) ?? null;
    this.applySelection(column, selector);
  }

  public colDefSelection(colDef: { showValuesAs?: ShowValuesAsStateValue }): ShowValuesAsStateValue {
    return colDef.showValuesAs ?? null;
  }

  public toColState(column: AgColumn): ShowValuesAsStateValue {
    const resolved = column.showValuesAs;
    if (!resolved) return null;
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

  public isApplying(column: AgColumn): boolean {
    const resolved = column.showValuesAs;
    if (!resolved) return false;
    // Only mode with nothing to compute without a pivot column axis.
    return resolved.type !== 'percentOfParentColumnTotal';
  }

  public refreshRenderedCells(): void {
    this.beans.gridApi?.refreshCells({ force: true });
  }

  public refreshRenderedCellsExcept(_nodes: Set<RowNode> | null, _path: ChangedPath | null): void {
    this.refreshRenderedCells();
  }

  public transform(column: AgColumn, rowNode: IRowNode, rawValue: unknown): ShowValuesAsResult | null {
    const resolved = column.showValuesAs;
    if (!resolved) return rawValue as ShowValuesAsResult;
    const raw = toNumber(rawValue);
    if (raw == null) return null;
    const mode = MODES[resolved.type as ShowValuesAsBuiltInType];
    if (!mode) return rawValue as ShowValuesAsResult;
    return mode.compute(this, column, rowNode, raw);
  }

  public formatValue(
    column: AgColumn,
    _rowNode: IRowNode | null,
    transformedValue: unknown,
    _rawValue: unknown,
    notApplicable: boolean,
  ): string | null {
    if (notApplicable) return '#N/A';
    if (transformedValue == null) return null;
    const precision = (column.showValuesAs?.precision ?? column.showValuesAsDef?.precision ?? 2) as number;
    return `${Number(transformedValue).toFixed(precision)}%`;
  }

  public getActiveModeLabel(column: AgColumn): string | null {
    const resolved = column.showValuesAs;
    if (!resolved || !this.isApplying(column)) return null;
    return MODES[resolved.type as ShowValuesAsBuiltInType]?.displayName ?? resolved.type;
  }

  public getActiveModeTooltip(column: AgColumn): string | null {
    const resolved = column.showValuesAs;
    if (!resolved) return null;
    const mode = MODES[resolved.type as ShowValuesAsBuiltInType];
    if (!mode) return null;
    return `${mode.displayName}: ${mode.description}`;
  }

  public isMenuEligible(column: AgColumn): boolean {
    return column.getColDef().enableShowValuesAs === true;
  }

  public getMenuItems(column: AgColumn, _localeTextFunc: unknown): MenuItemDef[] {
    const current = column.showValuesAs?.type;
    const items: MenuItemDef[] = [
      {
        name: 'None',
        checked: current == null,
        action: () => this.setColumnShowValuesAs(column, null),
      },
    ];
    for (const [type, mode] of Object.entries(MODES) as [ShowValuesAsBuiltInType, (typeof MODES)[ShowValuesAsBuiltInType]][]) {
      items.push({
        name: mode.displayName,
        checked: current === type,
        action: () => this.setColumnShowValuesAs(column, type),
      });
    }
    return items;
  }

  public setColumnShowValuesAs(column: AgColumn, selection: ShowValuesAsType | ShowValuesAs | null): void {
    this.applySelection(column, selection);
    column.dispatchStateUpdatedEvent('showValuesAs');
    this.refreshRenderedCells();
  }

  /** @internal used by MODES.compute closures */
  public ratio(raw: number, total: number | null): number | null {
    return total ? (raw / total) * 100 : null;
  }

  /** @internal */
  public grandTotal(column: AgColumn): number | null {
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

  private applySelection(column: AgColumn, selection: ShowValuesAsStateValue): void {
    if (selection == null) {
      column.showValuesAs = null;
      return;
    }
    const { type, params, precision } =
      typeof selection === 'string' ? { type: selection, params: undefined, precision: undefined } : selection;
    const mode = MODES[type as ShowValuesAsBuiltInType];
    if (!mode) {
      _warnOnce(`LibreGrid: unknown showValuesAs mode '${type}'`);
      column.showValuesAs = null;
      return;
    }
    const def: ShowValuesAsModeDef = {
      displayName: mode.displayName,
      description: mode.description,
      formatter: (params: ShowValuesAsFormatterParams) =>
        this.formatValue(column, null, params.value, params.rawValue, params.notApplicable) ?? '',
    };
    const resolved: AgShowValuesAsResolved = {
      type,
      def,
      formatter: null,
      transformedDataType: 'number',
      params,
      precision: precision ?? column.showValuesAsDef?.precision ?? 2,
      _applyingSig: 0,
      _applyingValue: false,
    };
    column.showValuesAs = resolved;
  }
}
