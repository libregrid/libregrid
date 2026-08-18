/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { DragSourceType, type Column, type DropTarget, type GridApi } from 'ag-grid-community';
import { RowGroupDropZone } from './rowGroupDropZone';
import { PivotDropZone } from './pivotDropZone';
import { getDropZoneForElement, listDropZones } from './dropZoneRegistry';
import { DropZoneDragTargetService } from './dropZoneDragTargetService';

function createColumn(id: string, colDef: Record<string, unknown> = {}): Column {
  return {
    getColId: () => id,
    getColDef: () => ({ colId: id, ...colDef }),
  } as unknown as Column;
}

function createGroupApi(columns: Column[]) {
  return {
    getColumn: vi.fn((id: string) => columns.find((column) => column.getColId() === id) ?? null),
    getRowGroupColumns: vi.fn((): Column[] => []),
    getGridOption: vi.fn(() => undefined),
    addRowGroupColumns: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createPivotApi(columns: Column[]) {
  return {
    getColumn: vi.fn((id: string) => columns.find((column) => column.getColId() === id) ?? null),
    getPivotColumns: vi.fn((): Column[] => []),
    getGridOption: vi.fn(() => undefined),
    addPivotColumns: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function makeHarness(root: HTMLElement) {
  const dragAndDrop = { addDropTarget: vi.fn(), removeDropTarget: vi.fn() };
  const harness = makeBeanHarness(DropZoneDragTargetService, {
    beans: {
      dragAndDrop,
      ctrlsSvc: {
        whenReady: (_caller: unknown, callback: (params: unknown) => void) =>
          callback({ gridCtrl: { getGui: () => root } }),
      },
    },
  });
  return { ...harness, dragAndDrop };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('drop zone registry', () => {
  it('zones register on init and unregister on destroy, with validated drop entry points', () => {
    const api = createGroupApi([createColumn('country', { enableRowGroup: true }), createColumn('sales')]);
    const zone = new RowGroupDropZone(true, true);
    zone.init(api as unknown as GridApi);

    const handle = getDropZoneForElement(zone.getGui());
    expect(listDropZones()).toHaveLength(1);
    expect(handle?.kind).toBe('group');
    expect(handle?.canDrop('country')).toBe(true);
    expect(handle?.canDrop('sales')).toBe(false);
    expect(handle?.dropColumns(['country', 'sales'])).toBe(1);
    expect(api.addRowGroupColumns).toHaveBeenCalledWith(['country']);

    zone.destroy();
    expect(listDropZones()).toHaveLength(0);
  });

  it('pivot zones validate against enablePivot and functionsReadOnly', () => {
    const api = createPivotApi([createColumn('region', { enablePivot: true })]);
    const zone = new PivotDropZone(true);
    zone.init(api as unknown as GridApi);

    const handle = getDropZoneForElement(zone.getGui());
    expect(handle?.kind).toBe('pivot');
    expect(handle?.dropColumns(['region'])).toBe(1);
    expect(api.addPivotColumns).toHaveBeenCalledWith(['region']);

    zone.destroy();
  });
});

describe('DropZoneDragTargetService', () => {
  it('registers grid drop targets for zones inside the grid root and delivers header drops', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const api = createGroupApi([createColumn('country', { enableRowGroup: true }), createColumn('sales')]);
    const zone = new RowGroupDropZone(true, true);
    zone.init(api as unknown as GridApi);
    root.appendChild(zone.getGui());
    const outside = new RowGroupDropZone(true, true);
    outside.init(createGroupApi([]) as unknown as GridApi);
    document.body.appendChild(outside.getGui());

    const { dragAndDrop } = makeHarness(root);
    await flush();

    expect(dragAndDrop.addDropTarget).toHaveBeenCalledOnce();
    const target = dragAndDrop.addDropTarget.mock.calls[0]![0] as DropTarget;
    expect(target.getContainer()).toBe(zone.getGui());
    expect(target.isInterestedIn(DragSourceType.HeaderCell, zone.getGui())).toBe(true);
    expect(target.isInterestedIn(DragSourceType.RowDrag, zone.getGui())).toBe(false);

    const eligible = { dragItem: { columns: [createColumn('country', { enableRowGroup: true })] } };
    const ineligible = { dragItem: { columns: [createColumn('sales')] } };
    expect(target.getIconName?.(eligible as never)).toBe('group');
    expect(target.getIconName?.(ineligible as never)).toBe('notAllowed');

    target.onDragEnter?.(eligible as never);
    expect(zone.getGui().classList.contains('lgr-drop-zone-drag-over')).toBe(true);
    target.onDragLeave?.(eligible as never);
    expect(zone.getGui().classList.contains('lgr-drop-zone-drag-over')).toBe(false);
    target.onDragEnter?.(ineligible as never);
    expect(zone.getGui().classList.contains('lgr-drop-zone-drag-over')).toBe(false);

    target.onDragStop?.(eligible as never);
    expect(api.addRowGroupColumns).toHaveBeenCalledWith(['country']);
    expect(zone.getGui().classList.contains('lgr-drop-zone-drag-over')).toBe(false);

    zone.destroy();
    outside.destroy();
  });

  it('removes targets when zones unregister and on destroy', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const zone = new RowGroupDropZone(true, true);
    zone.init(createGroupApi([]) as unknown as GridApi);
    root.appendChild(zone.getGui());

    const harness = makeHarness(root);
    await flush();
    expect(harness.dragAndDrop.addDropTarget).toHaveBeenCalledOnce();

    zone.destroy();
    await flush();
    expect(harness.dragAndDrop.removeDropTarget).toHaveBeenCalledOnce();

    zone.init(createGroupApi([]) as unknown as GridApi);
    root.appendChild(zone.getGui());
    await flush();
    expect(harness.dragAndDrop.addDropTarget).toHaveBeenCalledTimes(2);

    harness.destroy();
    expect(harness.dragAndDrop.removeDropTarget).toHaveBeenCalledTimes(2);
    zone.destroy();
  });

  it('ignores zones from other grid roots', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const foreign = new PivotDropZone(true, true);
    foreign.init(createPivotApi([]) as unknown as GridApi);
    document.body.appendChild(foreign.getGui());

    const { dragAndDrop } = makeHarness(root);
    await flush();

    expect(dragAndDrop.addDropTarget).not.toHaveBeenCalled();
    foreign.destroy();
  });
});
