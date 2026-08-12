import type { MenuItemDef } from 'ag-grid-community';
import type { MenuActionParams } from './menuItemRegistry';

export type MenuKind = 'context' | 'column';

export interface MenuRenderRequest {
  kind: MenuKind;
  items: MenuItemDef[];
  params: MenuActionParams;
  onItemSelected?: () => void;
  fallback: () => HTMLElement;
}

export interface MenuRenderResult {
  element: HTMLElement;
  destroy?: () => void;
}

export interface MenuRenderer {
  render(request: MenuRenderRequest): MenuRenderResult;
}

let renderer: MenuRenderer | undefined;

/** Install an optional UI renderer without coupling this package to a framework. */
export function registerMenuRenderer(nextRenderer: MenuRenderer): () => void {
  const previous = renderer;
  renderer = nextRenderer;
  return () => {
    if (renderer === nextRenderer) renderer = previous;
  };
}

/** @internal — consumed by the menu beans. */
export function getMenuRenderer(): MenuRenderer | undefined {
  return renderer;
}
