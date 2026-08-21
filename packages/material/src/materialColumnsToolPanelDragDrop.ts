import {
  createDragRef,
  createDropListRef,
  type DragRef,
  type DropListRef,
} from '@angular/cdk/drag-drop';
import type { EnvironmentInjector } from '@angular/core';
import {
  listDropZones,
  onDropZoneRegistryChange,
  registerColumnsToolPanelDragDropAdapter,
  type ColumnsToolPanelDragDropAdapter,
  type DropZoneHandle,
} from '@libregrid/columns-tool-panel';

interface ColumnDragData {
  id: string;
  name: string;
  index: number;
}

interface DropListData {
  kind: 'source' | 'group' | 'value' | 'pivot' | 'embedded';
}

interface PendingMove {
  label: string;
  remaining: number;
  scheduled: boolean;
}

/**
 * Installs Material CDK drag-drop for Columns tool panel instances.
 *
 * @feature Columns Tool Panel
 */
export function installMaterialColumnsToolPanelDragDrop(
  environmentInjector: EnvironmentInjector,
): () => void {
  return registerColumnsToolPanelDragDropAdapter(
    createMaterialColumnsToolPanelDragDropAdapter(environmentInjector),
  );
}

/**
 * Creates a Material CDK decorator for the framework-neutral Columns tool panel.
 *
 * @feature Columns Tool Panel
 */
export function createMaterialColumnsToolPanelDragDropAdapter(
  environmentInjector: EnvironmentInjector,
): ColumnsToolPanelDragDropAdapter {
  const pendingMoves = new WeakMap<HTMLElement, PendingMove>();
  return {
    attach(root) {
      const sourceElement = root.querySelector<HTMLElement>('.lgr-columns-list');
      if (!sourceElement) return () => undefined;

      const source = createDropListRef<DropListData>(environmentInjector, sourceElement);
      source.data = { kind: 'source' };
      sourceElement.classList.add('cdk-drop-list');

      const nativeDraggableAttributes = new Map<HTMLElement, string | null>();
      const drags = Array.from(
        sourceElement.querySelectorAll<HTMLElement>('.lgr-columns-row:not(.lgr-columns-group-row)'),
      ).flatMap((row): DragRef<ColumnDragData>[] => {
        if (row.dataset['columnMovable'] !== 'true') return [];
        const id = row.dataset['columnId'];
        const name = row.dataset['columnName'];
        const index = Number(row.dataset['columnIndex']);
        if (!id || !name || !Number.isInteger(index)) return [];
        nativeDraggableAttributes.set(row, row.getAttribute('draggable'));
        row.draggable = false;
        row.classList.add('cdk-drag');
        const drag = createDragRef<ColumnDragData>(environmentInjector, row);
        drag.data = { id, name, index };
        return [drag];
      });
      source.withItems(drags);

      const targets = Array.from(
        root.querySelectorAll<HTMLElement>('.lgr-columns-drop-zone'),
      ).flatMap((element): DropListRef<DropListData>[] => {
        const kind = element.dataset['functionKind'];
        if (kind !== 'group' && kind !== 'value' && kind !== 'pivot') return [];
        const target = createDropListRef<DropListData>(environmentInjector, element);
        target.data = { kind };
        target.sortingDisabled = true;
        element.classList.add('cdk-drop-list');
        return [target];
      });

      // Toolbar-embedded and standalone header drop zones understand native
      // HTML5 drags only; CDK rows have native dragging disabled, so bridge
      // them in as CDK targets and let each zone validate the drop itself.
      // Embedded zones can mount after the panel (the toolbar and header are
      // separate views), so keep the CDK connections in sync with the shared
      // registry rather than taking a one-time snapshot during attach.
      const embeddedTargets = new Map<DropZoneHandle, DropListRef<DropListData>>();
      const embeddedSubscriptions = new Map<DropZoneHandle, { unsubscribe: () => void }>();
      const allTargets = () => [...targets, ...embeddedTargets.values()];
      const reconnectTargets = () => {
        const connectedTargets = allTargets();
        source.connectedTo(connectedTargets);
        for (const target of connectedTargets) {
          target.connectedTo([source, ...connectedTargets.filter((other) => other !== target)]);
        }
      };
      const refreshEmbeddedTargets = () => {
        const zones = new Set(findEmbeddedDropZones(root));
        for (const [zone, target] of embeddedTargets) {
          if (zones.has(zone)) continue;
          embeddedSubscriptions.get(zone)?.unsubscribe();
          embeddedSubscriptions.delete(zone);
          embeddedTargets.delete(zone);
          target.dispose();
          zone.element.classList.remove('cdk-drop-list');
        }
        for (const zone of zones) {
          if (embeddedTargets.has(zone)) continue;
          const target = createDropListRef<DropListData>(environmentInjector, zone.element);
          target.data = { kind: 'embedded' };
          target.sortingDisabled = true;
          zone.element.classList.add('cdk-drop-list');
          embeddedTargets.set(zone, target);
          embeddedSubscriptions.set(zone, target.dropped.subscribe(({ item }) => {
            if (item.data !== undefined) zone.dropColumns([item.data.id]);
          }));
        }
        reconnectTargets();
      };
      const unsubscribeRegistry = onDropZoneRegistryChange(refreshEmbeddedTargets);
      refreshEmbeddedTargets();

      const timers = new Set<ReturnType<typeof setTimeout>>();
      const subscriptions = [
        source.dropped.subscribe(({ item, previousContainer, currentIndex }) => {
          if (previousContainer !== source || item.data === undefined) return;
          const targetIndex = getTargetColumnIndex(drags, currentIndex);
          startColumnMove(root, item.data.name, item.data.index, targetIndex, pendingMoves, schedule);
        }),
        ...targets.map((target) => target.dropped.subscribe(({ item }) => {
          if (item.data === undefined) return;
          const element = target.element instanceof HTMLElement
            ? target.element
            : target.element.nativeElement;
          const action = target.data.kind === 'group' ? 'Group by' : target.data.kind === 'value' ? 'Add value' : 'Add pivot';
          clickButton(element, `${action} ${item.data.name}`);
        })),
      ];

      schedulePendingMove(root, pendingMoves, schedule);

      return () => {
        for (const timer of timers) clearTimeout(timer);
        const pending = pendingMoves.get(root);
        if (pending) pending.scheduled = false;
        unsubscribeRegistry();
        for (const subscription of subscriptions) subscription.unsubscribe();
        for (const [zone, subscription] of embeddedSubscriptions) {
          subscription.unsubscribe();
          zone.element.classList.remove('cdk-drop-list');
        }
        for (const drag of drags) drag.dispose();
        source.dispose();
        for (const target of allTargets()) target.dispose();
        sourceElement.classList.remove('cdk-drop-list');
        for (const target of allTargets()) {
          const element = target.element instanceof HTMLElement
            ? target.element
            : target.element.nativeElement;
          element.classList.remove('cdk-drop-list');
        }
        for (const [row, draggable] of nativeDraggableAttributes) {
          row.classList.remove('cdk-drag');
          if (draggable === null) row.removeAttribute('draggable');
          else row.setAttribute('draggable', draggable);
        }
      };

      function schedule(action: () => void): void {
        const timer = setTimeout(() => {
          timers.delete(timer);
          action();
        });
        timers.add(timer);
      }
    },
  };
}

/**
 * Registered row-group/pivot zones outside the panel (toolbar items, the
 * standalone header panel). Scoped to the panel's grid when the panel is
 * attached; a detached panel root falls back to all registered zones, whose
 * own eligibility checks reject foreign columns.
 */
function findEmbeddedDropZones(root: HTMLElement): DropZoneHandle[] {
  const gridRoot = root.closest('.ag-root-wrapper');
  return listDropZones().filter(
    (zone) => !root.contains(zone.element) && (gridRoot === null || gridRoot.contains(zone.element)),
  );
}

function startColumnMove(
  root: HTMLElement,
  name: string,
  previousIndex: number,
  currentIndex: number,
  pendingMoves: WeakMap<HTMLElement, PendingMove>,
  schedule: (action: () => void) => void,
): void {
  const direction = currentIndex < previousIndex ? 'up' : 'down';
  pendingMoves.set(root, {
    label: `Move ${name} ${direction}`,
    remaining: Math.abs(currentIndex - previousIndex),
    scheduled: false,
  });
  continuePendingMove(root, pendingMoves, schedule);
}

function getTargetColumnIndex(drags: DragRef<ColumnDragData>[], currentIndex: number): number {
  return drags[currentIndex]?.data.index ?? drags.at(-1)?.data.index ?? currentIndex;
}

function schedulePendingMove(
  root: HTMLElement,
  pendingMoves: WeakMap<HTMLElement, PendingMove>,
  schedule: (action: () => void) => void,
): void {
  const pending = pendingMoves.get(root);
  if (!pending || pending.scheduled) return;
  pending.scheduled = true;
  schedule(() => {
    pending.scheduled = false;
    continuePendingMove(root, pendingMoves, schedule);
  });
}

function continuePendingMove(
  root: HTMLElement,
  pendingMoves: WeakMap<HTMLElement, PendingMove>,
  schedule: (action: () => void) => void,
): void {
  const pending = pendingMoves.get(root);
  if (!pending || pending.remaining === 0 || !clickButton(root, pending.label)) {
    pendingMoves.delete(root);
    return;
  }
  pending.remaining -= 1;
  if (pending.remaining === 0) pendingMoves.delete(root);
  else schedulePendingMove(root, pendingMoves, schedule);
}

function clickButton(root: HTMLElement, label: string): boolean {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find((candidate) => candidate.getAttribute('aria-label') === label);
  if (!button || button.disabled) return false;
  button.click();
  return true;
}
