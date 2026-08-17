import { RowGroupDropZone } from './rowGroupDropZone';
import { PivotDropZone } from './pivotDropZone';

/**
 * Toolbar item contributions for the row group and pivot panels.
 *
 * Registered against the toolbar package's Symbol.for store directly, so this
 * package does not need a dependency on @libregrid/toolbar (the same pattern
 * as the menu item registry — docs/reference/package-architecture.md §4).
 */

const REGISTRY_KEY = Symbol.for('libregrid.toolbarItems');

interface ToolbarItemParams {
  api: unknown;
}

interface ToolbarItemFactoryResult {
  gui: HTMLElement;
  instance?: unknown;
  destroy?: () => void;
}

function register(name: string, factory: (params: ToolbarItemParams) => ToolbarItemFactoryResult): void {
  const scope = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: { factories: Map<string, (params: ToolbarItemParams) => ToolbarItemFactoryResult> };
  };
  const store = (scope[REGISTRY_KEY] ??= { factories: new Map() });
  store.factories.set(name, factory);
}

/**
 * Register the row group and pivot panel toolbar items. Called from
 * ColumnsToolPanelModule.onRegister, so bundlers cannot tree-shake the
 * registration away (sideEffects: false packages must not rely on
 * side-effect imports).
 */
export function registerPanelToolbarItems(): void {
  register('agRowGroupPanelToolbarItem', (params) => {
    const zone = new RowGroupDropZone(true, true);
    zone.init(params.api as never);
    return { gui: zone.getGui(), instance: zone, destroy: () => zone.destroy() };
  });

  register('agPivotPanelToolbarItem', (params) => {
    const zone = new PivotDropZone(true, true);
    zone.init(params.api as never);
    return { gui: zone.getGui(), instance: zone, destroy: () => zone.destroy() };
  });
}
