import type { IDoesFilterPassParams, IFilter, IMultiFilter, IMultiFilterDef, IMultiFilterModel, MultiFilterParams } from 'ag-grid-community';
import { SetFilter } from '@libregrid/set-filter';

type ChildFilter = IFilter & { getGui?: () => HTMLElement; init?: (params: never) => void; destroy?: () => void };
type ChildFilterModel = {
  filterType?: string;
  type?: string;
  filter?: unknown;
  caseSensitive?: boolean;
  values?: unknown[];
} | null;

/**
 * A model-oriented Multi Filter. Child models retain their configured order and
 * a row must pass every active child, making it directly serialisable for SSRM.
 */
export class MultiFilter implements IMultiFilter {
  public readonly filterType = 'multi' as const;

  private readonly gui = document.createElement('section');
  private params: MultiFilterParams | undefined;
  private definitions: IMultiFilterDef[] = [];
  private children: (ChildFilter | undefined)[] = [];
  private models: ChildFilterModel[] | null = null;

  public constructor() {
    this.gui.className = 'lgr-multi-filter';
    this.gui.setAttribute('aria-label', 'Multi filter');
  }

  public init(params: MultiFilterParams): void {
    this.params = params;
    this.definitions = params.filters?.length ? params.filters : [{ filter: 'agTextColumnFilter' }, { filter: 'agSetColumnFilter' }];
    this.children = this.definitions.map((definition) => this.createChild(definition));
    this.render();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public destroy(): void {
    this.children.forEach((child) => child?.destroy?.());
    this.gui.replaceChildren();
  }

  public isFilterActive(): boolean {
    return Boolean(this.getModel());
  }

  public doesFilterPass(params: IDoesFilterPassParams): boolean {
    return this.children.every((child, index) => !this.childModel(index) || !child || child.doesFilterPass(params));
  }

  public getModel(): IMultiFilterModel | null {
    const models = this.children.map((child, index) => child?.getModel?.() ?? this.models?.[index] ?? null);
    return models.some(Boolean) ? { filterType: 'multi', filterModels: models } : null;
  }
  public getModelFromUi(): IMultiFilterModel | null { return this.getModel(); }
  public applyModel(_source: 'api' | 'ui' | 'rowDataUpdated' = 'api'): boolean { return false; }

  public setModel(model: IMultiFilterModel | null): void {
    this.models = model?.filterModels ? [...model.filterModels] : null;
    this.children.forEach((child, index) => child?.setModel(this.models?.[index] ?? null));
    this.render();
  }

  public getChildFilterInstance<TFilter = IFilter>(index: number): TFilter | undefined {
    return this.children[index] as TFilter | undefined;
  }

  public refresh(params: MultiFilterParams): boolean {
    this.params = params;
    return true;
  }

  private createChild(definition: IMultiFilterDef): ChildFilter | undefined {
    if (definition.filter === 'agSetColumnFilter') {
      const child = new SetFilter();
      child.init({ ...this.params, ...definition.filterParams } as never);
      return child;
    }
    if (typeof definition.filter === 'function') {
      const child = new (definition.filter as new () => ChildFilter)();
      child.init?.({ ...this.params, ...definition.filterParams } as never);
      return child;
    }
    return undefined;
  }

  private childModel(index: number): unknown {
    return this.children[index]?.getModel?.() ?? this.models?.[index] ?? null;
  }

  private render(): void {
    this.gui.replaceChildren();
    this.definitions.forEach((definition, index) => this.appendChild(definition, index));
  }

  private appendChild(definition: IMultiFilterDef, index: number): void {
    const child = this.children[index];
    const display = definition.display ?? 'inline';
    const title = definition.title ?? `Filter ${index + 1}`;
    const container = display === 'accordion' ? document.createElement('details') : document.createElement('div');
    container.className = `lgr-multi-filter-child lgr-multi-filter-${display}`;
    if (container instanceof HTMLDetailsElement) {
      container.open = true;
      const summary = document.createElement('summary');
      summary.textContent = title;
      container.appendChild(summary);
    } else if (display === 'subMenu') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.setAttribute('aria-haspopup', 'menu');
      button.addEventListener('click', () => container.classList.toggle('lgr-multi-filter-submenu-open'));
      container.appendChild(button);
    }
    if (child?.getGui) {
      container.appendChild(child.getGui());
    } else {
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = title;
      input.value = String(this.models?.[index]?.filter ?? '');
      input.disabled = this.params?.readOnly ?? false;
      input.setAttribute('aria-label', title);
      input.addEventListener('input', () => {
        const models = this.models ? [...this.models] : Array(this.definitions.length).fill(null);
        models[index] = input.value ? { filterType: 'text', type: 'contains', filter: input.value } : null;
        this.models = models;
        this.params?.filterChangedCallback();
      });
      container.appendChild(input);
    }
    this.gui.appendChild(container);
  }
}
