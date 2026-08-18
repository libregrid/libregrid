import {
  BeanStub,
  DragSourceType,
  type DropTarget,
  type GridDraggingEvent,
} from 'ag-grid-community';
import {
  DROP_ZONE_DRAG_OVER_CLASS,
  listDropZones,
  onDropZoneRegistryChange,
  type DropZoneHandle,
} from './dropZoneRegistry';

/**
 * Bridges registered drop zones (standalone header panel and toolbar-embedded)
 * into the grid's own DragAndDropService as drop targets, so dragging a
 * column header onto a zone groups/pivots — the same gesture AG Grid uses.
 * Zones keep their native HTML5 handling for tool-panel row drags; this adds
 * the pointer-based header path with the grid's drag ghost.
 *
 * Registration defers a microtask: zones register from their init, before
 * their element reaches the grid DOM, so containment checks run after the
 * current task.
 *
 * @feature Columns Tool Panel
 */
export class DropZoneDragTargetService extends BeanStub {
  // Not in Community's closed BeanName union; the DI keys beans by their
  // beanName string at runtime (api-seams.md §7).
  public readonly beanName = 'dropZoneDragTargetSvc';

  private root: HTMLElement | undefined;
  private readonly targets = new Map<DropZoneHandle, DropTarget>();
  private unsubscribeRegistry: (() => void) | undefined;
  private syncQueued = false;

  public postConstruct(): void {
    this.beans.ctrlsSvc?.whenReady(this, ({ gridCtrl }) => {
      this.root = gridCtrl.getGui();
      this.unsubscribeRegistry = onDropZoneRegistryChange(() => this.scheduleSync());
      this.scheduleSync();
    });
  }

  public override destroy(): void {
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = undefined;
    const dragAndDrop = this.beans.dragAndDrop;
    for (const target of this.targets.values()) dragAndDrop?.removeDropTarget(target);
    this.targets.clear();
    super.destroy();
  }

  private scheduleSync(): void {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      this.sync();
    });
  }

  private sync(): void {
    if (!this.isAlive()) return;
    const root = this.root;
    const dragAndDrop = this.beans.dragAndDrop;
    if (!root || !dragAndDrop) return;
    const active = listDropZones().filter((zone) => zone.element.isConnected && root.contains(zone.element));
    for (const [handle, target] of this.targets) {
      if (!active.includes(handle)) {
        dragAndDrop.removeDropTarget(target);
        this.targets.delete(handle);
      }
    }
    for (const handle of active) {
      if (this.targets.has(handle)) continue;
      const target = this.createDropTarget(handle);
      this.targets.set(handle, target);
      dragAndDrop.addDropTarget(target);
    }
  }

  private createDropTarget(handle: DropZoneHandle): DropTarget {
    const icon = handle.kind === 'group' ? 'group' : 'pivot';
    const columnIds = (event: GridDraggingEvent): string[] =>
      (event.dragItem?.columns ?? []).map((column) => column.getColId());
    const anyEligible = (event: GridDraggingEvent | null | undefined): boolean =>
      !!event && columnIds(event).some((id) => handle.canDrop(id));
    return {
      getContainer: () => handle.element,
      isInterestedIn: (type) => type === DragSourceType.HeaderCell,
      getIconName: (event) => (anyEligible(event) ? icon : 'notAllowed'),
      onDragEnter: (event) => {
        if (anyEligible(event)) handle.element.classList.add(DROP_ZONE_DRAG_OVER_CLASS);
      },
      onDragLeave: () => handle.element.classList.remove(DROP_ZONE_DRAG_OVER_CLASS),
      onDragStop: (event) => {
        handle.element.classList.remove(DROP_ZONE_DRAG_OVER_CLASS);
        handle.dropColumns(columnIds(event));
      },
    };
  }
}
