/**
 * Optional drag-drop decorator for the framework-neutral Columns tool panel.
 *
 * @feature Columns Tool Panel
 */
export interface ColumnsToolPanelDragDropAdapter {
  attach(root: HTMLElement): () => void;
}

const ADAPTER_KEY = Symbol.for('libregrid.columnsToolPanelDragDropAdapter');

interface AdapterStore {
  adapter: ColumnsToolPanelDragDropAdapter | undefined;
  cleanups: WeakMap<HTMLElement, () => void>;
}

function getStore(): AdapterStore {
  const scope = globalThis as typeof globalThis & { [ADAPTER_KEY]?: AdapterStore };
  return (scope[ADAPTER_KEY] ??= {
    adapter: undefined,
    cleanups: new WeakMap<HTMLElement, () => void>(),
  });
}

/**
 * Installs the active Columns tool panel drag-drop decorator.
 *
 * @feature Columns Tool Panel
 */
export function registerColumnsToolPanelDragDropAdapter(
  adapter: ColumnsToolPanelDragDropAdapter,
): () => void {
  const store = getStore();
  const previous = store.adapter;
  store.adapter = adapter;
  return () => {
    if (store.adapter === adapter) store.adapter = previous;
  };
}

export function attachColumnsToolPanelDragDrop(root: HTMLElement): void {
  detachColumnsToolPanelDragDrop(root);
  const cleanup = getStore().adapter?.attach(root);
  if (cleanup) getStore().cleanups.set(root, cleanup);
}

export function detachColumnsToolPanelDragDrop(root: HTMLElement): void {
  const store = getStore();
  store.cleanups.get(root)?.();
  store.cleanups.delete(root);
}
