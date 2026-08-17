import type {
  IDoesFilterPassParams,
  IFilter,
  SelectableFilterDef,
  SelectableFilterParams,
  SetFilterModel,
} from 'ag-grid-community';
import { SetFilter } from '@libregrid/set-filter';
import { SimpleFilter, textModelMatches, type SimpleFilterModel } from './simpleFilter';

/** The selectable filter model: the active filter type index plus its model. */
export interface SelectableFilterModel {
  filterType: 'selectable';
  type: number;
  filter: unknown;
}

type SelectableInitParams = SelectableFilterParams & {
  filterChangedCallback?: () => void;
  getValue?: (node: unknown) => unknown;
  colDef?: unknown;
  column?: unknown;
  api?: unknown;
};

interface InnerFilter {
  getGui(): HTMLElement;
  getModel(): unknown;
  setModel(model: unknown): void;
  doesFilterPass(params: IDoesFilterPassParams): boolean;
  isFilterActive(): boolean;
  destroy(): void;
}

/** True when one selectable inner model matches a cell value. */
export function innerModelPasses(model: unknown, value: unknown): boolean {
  if (!model || typeof model !== 'object') return true;
  const candidate = model as { filterType?: string };
  if (candidate.filterType === 'set') return setModelPasses(model as SetFilterModel, value);
  if (
    candidate.filterType === 'number' ||
    candidate.filterType === 'date' ||
    candidate.filterType === 'bigint'
  ) {
    return numberModelPasses(
      model as { type?: string; filter?: unknown; filterTo?: unknown },
      value,
    );
  }
  return textModelMatches(model as SimpleFilterModel, value);
}

function setModelPasses(model: SetFilterModel, value: unknown): boolean {
  const key =
    value === null ? null : value === undefined ? '__libregrid_undefined__' : String(value);
  return model.values.includes(key);
}

function numberModelPasses(
  model: { type?: string; filter?: unknown; filterTo?: unknown },
  value: unknown,
): boolean {
  const type = model.type ?? 'equals';
  if (type === 'blank') return value === null || value === undefined || value === '';
  if (type === 'notBlank') return !(value === null || value === undefined || value === '');
  const left = Number(value);
  const right = Number(model.filter);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  if (type === 'inRange') {
    const to = Number(model.filterTo);
    if (Number.isNaN(to)) return false;
    return left >= right && left <= to;
  }
  switch (type) {
    case 'equals':
      return left === right;
    case 'notEqual':
      return left !== right;
    case 'lessThan':
      return left < right;
    case 'lessThanOrEqual':
      return left <= right;
    case 'greaterThan':
      return left > right;
    default:
      return left >= right;
  }
}

/**
 * The selectable column filter: a mode selector (Simple Filter / Selection
 * Filter) over the column's configured filter definitions. The card embeds it
 * directly; the grid's filter manager uses its doesFilterPass for row matching.
 * @feature Filters Tool Panel
 */
export class SelectableFilter implements IFilter {
  private readonly gui = document.createElement('div');
  private params: SelectableInitParams | undefined;
  private defs: SelectableFilterDef[] = [];
  private activeIndex = 0;
  private innerDefIndex: number | undefined;
  private inner: InnerFilter | undefined;

  public constructor() {
    this.gui.className = 'lgr-selectable-filter';
    this.gui.setAttribute('aria-label', 'Filter');
  }

  public init(params: SelectableInitParams): void {
    this.params = params;
    this.defs = params.filters?.length
      ? params.filters
      : [{ filter: 'agTextColumnFilter' }, { filter: 'agSetColumnFilter' }];
    this.activeIndex = this.clamp(params.defaultFilterIndex ?? 0);
    this.render();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public isFilterActive(): boolean {
    return this.inner?.isFilterActive() ?? false;
  }

  public getModel(): SelectableFilterModel | null {
    const model = this.inner?.getModel();
    if (!model) return null;
    return { filterType: 'selectable', type: this.activeIndex, filter: model };
  }

  public setModel(model: SelectableFilterModel | null): void {
    if (model && model.filterType === 'selectable' && typeof model.type === 'number') {
      this.activeIndex = this.clamp(model.type);
    }
    this.ensureInner();
    this.inner?.setModel(model?.filter ?? null);
    this.render();
  }

  public doesFilterPass(params: IDoesFilterPassParams): boolean {
    return this.inner?.doesFilterPass(params) ?? true;
  }

  public destroy(): void {
    this.inner?.destroy();
    this.inner = undefined;
    this.gui.replaceChildren();
  }

  private render(): void {
    this.gui.replaceChildren();
    const select = document.createElement('select');
    select.className = 'lgr-select lgr-filter-type-select';
    select.setAttribute('aria-label', 'Filter type');
    this.defs.forEach((definition, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = this.label(definition);
      option.selected = index === this.activeIndex;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      this.activeIndex = this.clamp(Number(select.value));
      this.ensureInner();
      this.render();
      this.notify();
    });
    this.gui.appendChild(select);

    this.ensureInner();
    const body = document.createElement('div');
    body.className = 'lgr-selectable-filter-body';
    if (this.inner) body.appendChild(this.inner.getGui());
    this.gui.appendChild(body);
  }

  private ensureInner(): void {
    if (this.inner && this.innerDefIndex === this.activeIndex) return;
    this.inner?.destroy();
    this.inner = this.createInner(this.defs[this.activeIndex]);
    this.innerDefIndex = this.activeIndex;
  }

  private createInner(definition: SelectableFilterDef | undefined): InnerFilter | undefined {
    if (!definition) return undefined;
    if (definition.filter === 'agSetColumnFilter') {
      const filter = new SetFilter();
      filter.init({
        api: this.params?.api,
        colDef: this.params?.colDef ?? {},
        column: this.params?.column,
        getValue: (node: unknown) => this.params?.getValue?.(node),
        filterChangedCallback: () => this.notify(),
        filterModifiedCallback: () => {},
        ...(definition.filterParams ?? {}),
      } as never);
      return {
        getGui: () => filter.getGui(),
        getModel: () => filter.getModel(),
        setModel: (model) => filter.setModel(model as SetFilterModel | null),
        doesFilterPass: (params) => filter.doesFilterPass(params),
        isFilterActive: () => filter.isFilterActive(),
        destroy: () => filter.destroy(),
      };
    }
    const filter = new SimpleFilter();
    filter.init({
      filterChangedCallback: () => this.notify(),
      getValue: (node: unknown) => this.params?.getValue?.(node),
      filterParams: definition.filterParams,
    });
    return {
      getGui: () => filter.getGui(),
      getModel: () => filter.getModel(),
      setModel: (model) => filter.setModel(model as SimpleFilterModel | null),
      doesFilterPass: (params) => filter.doesFilterPass(params),
      isFilterActive: () => filter.isFilterActive(),
      destroy: () => filter.destroy(),
    };
  }

  private label(definition: SelectableFilterDef): string {
    if (definition.name) return definition.name;
    if (definition.filter === 'agSetColumnFilter') return 'Selection Filter';
    return 'Simple Filter';
  }

  private clamp(index: number): number {
    return Math.max(0, Math.min(index, this.defs.length - 1));
  }

  private notify(): void {
    this.params?.filterChangedCallback?.();
  }
}
