/**
 * Shared registry of mounted row-group/pivot drop zones (standalone header
 * panel and toolbar-embedded). Lets drag sources outside a zone's own DOM —
 * the grid DragAndDropService bridge and the Material CDK adapter — deliver
 * drops through the zone's own eligibility validation.
 *
 * Cross-package seams use a Symbol.for store so feature packages register
 * without a hard dependency (docs/reference/package-architecture.md §4).
 *
 * @feature Columns Tool Panel
 */
export const DROP_ZONE_DRAG_OVER_CLASS = 'lgr-drop-zone-drag-over';

export interface DropZoneHandle {
  readonly element: HTMLElement;
  readonly kind: 'group' | 'pivot';
  /** Mirrors the native drop validation: eligibility plus functionsReadOnly. */
  canDrop(columnId: string): boolean;
  /** Adds the eligible subset; returns how many columns were added. */
  dropColumns(columnIds: string[]): number;
}

const REGISTRY_KEY = Symbol.for('libregrid.dropZones');

interface RegistryStore {
  zones: Set<DropZoneHandle>;
  listeners: Set<() => void>;
}

function getStore(): RegistryStore {
  const scope = globalThis as typeof globalThis & { [REGISTRY_KEY]?: RegistryStore };
  return (scope[REGISTRY_KEY] ??= { zones: new Set(), listeners: new Set() });
}

function notify(): void {
  for (const listener of getStore().listeners) listener();
}

export function registerDropZone(handle: DropZoneHandle): () => void {
  const store = getStore();
  store.zones.add(handle);
  notify();
  return () => {
    store.zones.delete(handle);
    notify();
  };
}

export function listDropZones(): DropZoneHandle[] {
  return [...getStore().zones];
}

export function getDropZoneForElement(element: HTMLElement): DropZoneHandle | undefined {
  for (const handle of getStore().zones) {
    if (handle.element === element) return handle;
  }
  return undefined;
}

/** Fires when zones register or unregister. Listeners are process-global. */
export function onDropZoneRegistryChange(listener: () => void): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}
