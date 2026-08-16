import { BeanStub, type GridApi, type Toolbar } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { createFindToolbarItem, createQuickFilterToolbarItem } from './providedItems';
import { getToolbarItemFactory, type ToolbarItemParams, type ToolbarItemFactoryResult } from './toolbarRegistry';

export interface ToolbarEntry {
  key?: string;
  align: 'left' | 'right';
  gui: HTMLElement;
  instance?: unknown;
  destroy?: () => void;
}

/**
 * Item definition widened past the closed unions: the service reads only the
 * fields it understands and ignores the rest.
 */
interface WideItemDef {
  key?: string;
  alignment?: 'left' | 'right';
  label?: string;
  icon?: unknown;
  tooltip?: string;
  action?: (...args: never[]) => void;
  toolbarItem?: unknown;
  toolbarItemParams?: unknown;
}

type ToolbarConfig = Toolbar | undefined;

/**
 * Parses the toolbar grid option, instantiates built-in, action, and custom
 * items, and feeds the shell component. @feature Toolbar
 */
export class ToolbarService extends BeanStub {
  // Not in Community's closed BeanName union; the DI keys beans by their
  // beanName string at runtime and callers read it via the untyped seam.
  public readonly beanName = 'toolbarSvc';

  /** The shell component — attached by the toolbar component. */
  public comp: { refresh(): void } | undefined;

  private entries: ToolbarEntry[] = [];
  private instances = new Map<string, unknown>();

  public postConstruct(): void {
    this.configure(this.gos.get('toolbar') as ToolbarConfig);
    this.addManagedPropertyListener('toolbar', () => {
      this.configure(this.gos.get('toolbar') as ToolbarConfig);
    });
  }

  public getEntries(): ToolbarEntry[] {
    return this.entries;
  }

  public getToolbarItemInstance<T>(key: string): T | undefined {
    return this.instances.get(key) as T | undefined;
  }

  public override destroy(): void {
    this.destroyEntries();
    super.destroy();
  }

  private configure(config: ToolbarConfig): void {
    this.destroyEntries();
    this.entries = [];
    this.instances = new Map();
    const api = this.beans.gridApi as GridApi | undefined;
    if (!api || !config) return;

    const defaultAlign = config.alignment === 'right' ? 'right' : 'left';
    for (const raw of config.items ?? []) {
      const entry = this.buildEntry(raw, defaultAlign, api);
      if (!entry) continue;
      this.entries.push(entry);
      if (entry.key && entry.instance) this.instances.set(entry.key, entry.instance);
    }
    this.comp?.refresh();
  }

  private buildEntry(
    raw: string | WideItemDef,
    defaultAlign: 'left' | 'right',
    api: GridApi,
  ): ToolbarEntry | undefined {
    if (typeof raw === 'string') {
      if (raw === 'separator') return this.separatorEntry(defaultAlign);
      return this.namedEntry(raw, undefined, defaultAlign, api);
    }
    const def = raw;
    const align =
      def.alignment === 'right' ? 'right' : def.alignment === 'left' ? 'left' : defaultAlign;

    // Action button shorthand: label/icon/action without a component.
    if (typeof def.action === 'function') {
      return this.actionButtonEntry(def, align, api);
    }

    const name = typeof def.toolbarItem === 'string' ? def.toolbarItem : undefined;
    if (name && name !== 'separator') {
      return this.namedEntry(name, def, align, api);
    }

    // Custom component reference (class or framework component).
    return this.customEntry(def, align, api);
  }

  private separatorEntry(align: 'left' | 'right'): ToolbarEntry {
    const separator = document.createElement('span');
    separator.className = 'lgr-toolbar-separator';
    separator.setAttribute('aria-hidden', 'true');
    return { align, gui: separator };
  }

  private namedEntry(
    name: string,
    def: WideItemDef | undefined,
    align: 'left' | 'right',
    api: GridApi,
  ): ToolbarEntry | undefined {
    const itemParams: ToolbarItemParams = {
      api,
      context: this.gos.get('context'),
      popupSvc: this.beans.popupSvc,
      ...(def?.key ? { key: def.key } : {}),
      ...(def?.alignment ? { alignment: def.alignment } : {}),
      ...(def?.label ? { label: def.label } : {}),
      ...(def?.tooltip ? { tooltip: def.tooltip } : {}),
      ...(def?.icon ? { icon: def.icon } : {}),
      ...(def?.toolbarItemParams ? { toolbarItemParams: def.toolbarItemParams } : {}),
    };
    let result: ToolbarItemFactoryResult | undefined;
    const factory = getToolbarItemFactory(name);
    if (factory) {
      result = factory(itemParams);
    } else if (name === 'agQuickFilterToolbarItem') {
      result = createQuickFilterToolbarItem(api);
    } else if (name === 'agFindToolbarItem') {
      result = createFindToolbarItem(api);
    }
    if (!result) return undefined;
    return {
      ...(def?.key ? { key: def.key } : {}),
      align,
      gui: result.gui,
      ...(result.instance ? { instance: result.instance } : {}),
      ...(result.destroy ? { destroy: result.destroy } : {}),
    };
  }

  private actionButtonEntry(def: WideItemDef, align: 'left' | 'right', api: GridApi): ToolbarEntry {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lgr-toolbar-button';
    const label = def.label;
    const tooltip = def.tooltip ?? label;
    if (tooltip) {
      button.setAttribute('aria-label', tooltip);
      button.title = tooltip;
    }
    const svg = def.icon ? iconSvg(def.icon as never) : null;
    if (svg) {
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = svg;
      button.appendChild(icon);
    }
    if (label) {
      const text = document.createElement('span');
      text.textContent = label;
      button.appendChild(text);
    }
    button.addEventListener('click', () => {
      def.action?.({ api, context: this.gos.get('context'), key: def.key ?? '' } as never);
    });
    return { ...(def.key ? { key: def.key } : {}), align, gui: button };
  }

  private customEntry(def: WideItemDef, align: 'left' | 'right', api: GridApi): ToolbarEntry | undefined {
    const component = def.toolbarItem as unknown;
    if (typeof component !== 'function') return undefined;
    try {
      const factory = this.beans.userCompFactory as unknown as {
        getCompDetailsFromGridOptions?: (
          type: object,
          name: string,
          params: object,
          mandatory: boolean,
        ) => { newAgStackInstance?: () => { agInit?: (params: object) => void } } | undefined;
      };
      const initParams = {
        key: def.key ?? '',
        alignment: align,
        toolbarItemParams: def.toolbarItemParams,
        label: def.label,
        tooltip: def.tooltip,
        icon: def.icon,
        action: undefined,
        api,
        context: this.gos.get('context'),
      };
      const details = factory.getCompDetailsFromGridOptions?.(
        { name: 'toolbarItem', mandatoryMethods: ['agInit'], optionalMethods: ['refresh', 'destroy'] },
        'agCustomToolbarItem',
        initParams,
        true,
      );
      const instance = details?.newAgStackInstance?.();
      if (!instance) return undefined;
      instance.agInit?.(initParams);
      const gui = (instance as unknown as { getGui?: () => HTMLElement }).getGui?.();
      if (!gui) return undefined;
      return {
        ...(def.key ? { key: def.key } : {}),
        align,
        gui,
        instance,
        destroy: () => (instance as unknown as { destroy?: () => void }).destroy?.(),
      };
    } catch {
      return undefined;
    }
  }

  private destroyEntries(): void {
    for (const entry of this.entries) {
      entry.destroy?.();
    }
    this.entries = [];
    this.instances = new Map();
  }
}
