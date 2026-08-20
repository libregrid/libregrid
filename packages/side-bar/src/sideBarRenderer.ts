import type { ToolPanelDef } from 'ag-grid-community';

export interface SideBarRenderRequest {
  host: HTMLElement;
  panelDefs: ToolPanelDef[];
  openedPanelId: string | null;
  position: 'left' | 'right';
  displayed: boolean;
  togglePanel: (id: string) => void;
}

export interface SideBarRenderer {
  refresh(request: SideBarRenderRequest): void;
}

const RENDERER_KEY = Symbol.for('libregrid.sideBarRenderer');

function getStore(): {
  renderer: SideBarRenderer | undefined;
  latestRequest: SideBarRenderRequest | undefined;
} {
  const scope = globalThis as typeof globalThis & {
    [RENDERER_KEY]?: {
      renderer: SideBarRenderer | undefined;
      latestRequest: SideBarRenderRequest | undefined;
    };
  };
  return (scope[RENDERER_KEY] ??= { renderer: undefined, latestRequest: undefined });
}

/** Install an optional UI renderer without coupling this package to a framework. */
export function registerSideBarRenderer(
  nextRenderer: SideBarRenderer,
  options: { replaceExisting?: boolean } = {},
): () => void {
  const store = getStore();
  if (store.renderer && options.replaceExisting === false) {
    return () => {};
  }
  const previous = store.renderer;
  store.renderer = nextRenderer;
  if (store.latestRequest) nextRenderer.refresh(store.latestRequest);
  notifyRendererChanged();
  return () => {
    if (store.renderer === nextRenderer) {
      store.renderer = previous;
      notifyRendererChanged();
    }
  };
}

/** @internal — consumed by the side-bar component. */
export function getSideBarRenderer(): SideBarRenderer | undefined {
  return getStore().renderer;
}

/** @internal — records the current grid state for a renderer installed later. */
export function renderSideBar(request: SideBarRenderRequest): void {
  const store = getStore();
  store.latestRequest = request;
  store.renderer?.refresh(request);
}

function notifyRendererChanged(): void {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new Event('lgr-side-bar-renderer-changed'));
  }
}
