import type { GridApi } from 'ag-grid-community';

/**
 * Toolbar item contribution registry.
 *
 * The toolbar shell is generic; feature packages contribute their built-in
 * items at module scope (the same pattern as registerMenuItems), so the
 * toolbar package stays dependency-free beyond core. Feature packages call
 * registerToolbarItem('agRowGroupPanelToolbarItem', …) when they register.
 */

/** Params passed to a toolbar item factory. */
export interface ToolbarItemParams {
  api: GridApi;
  context: unknown;
  /** The grid's PopupService, for items that open popups. */
  popupSvc?: unknown;
  /** Item definition fields, passed through from the toolbar option. */
  key?: string;
  alignment?: 'left' | 'right';
  label?: string;
  tooltip?: string;
  icon?: unknown;
  toolbarItemParams?: unknown;
}

/** What a toolbar item factory produces for one grid instance. */
export interface ToolbarItemFactoryResult {
  gui: HTMLElement;
  /** Optional instance for api.getToolbarItemInstance(key). */
  instance?: unknown;
  /** Optional cleanup, called when the toolbar reconfigures or destroys. */
  destroy?: () => void;
}

export type ToolbarItemFactory = (params: ToolbarItemParams) => ToolbarItemFactoryResult;

const REGISTRY_KEY = Symbol.for('libregrid.toolbarItems');

interface Registry {
  factories: Map<string, ToolbarItemFactory>;
}

function store(): Registry {
  const scope = globalThis as typeof globalThis & { [REGISTRY_KEY]?: Registry };
  return (scope[REGISTRY_KEY] ??= { factories: new Map() });
}

/** Register a built-in toolbar item factory under a ToolbarItemComponentName. */
export function registerToolbarItem(name: string, factory: ToolbarItemFactory): void {
  store().factories.set(name, factory);
}

/** @internal — resolves a registered built-in toolbar item factory. */
export function getToolbarItemFactory(name: string): ToolbarItemFactory | undefined {
  return store().factories.get(name);
}
