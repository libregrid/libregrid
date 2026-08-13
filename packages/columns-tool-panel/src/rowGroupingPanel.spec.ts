/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Column, GridApi } from 'ag-grid-community';
import { RowGroupPanelBuilder } from './rowGroupPanelBuilder';
import { RowGroupDropZone } from './rowGroupDropZone';

function createColumn(id: string, enableRowGroup = true, auto = false): Column {
  return {
    getColId: () => id,
    getColDef: () => ({ colId: id, headerName: `Display ${id}`, enableRowGroup }),
    isAutoRowGroupColumn: () => auto,
  } as unknown as Column;
}

function createApi(columns: Column[], functionsReadOnly = false) {
  const listeners = new Map<string, () => void>();
  const rowGroups = [...columns];
  return {
    getColumn: vi.fn((id: string) => columns.find((column) => column.getColId() === id) ?? null),
    getRowGroupColumns: vi.fn(() => rowGroups),
    getDisplayNameForColumn: vi.fn((column: Column) => `Display ${column.getColId()}`),
    getGridOption: vi.fn((key: string) => key === 'functionsReadOnly' ? functionsReadOnly : undefined),
    removeRowGroupColumns: vi.fn(),
    moveRowGroupColumn: vi.fn(),
    addRowGroupColumns: vi.fn(),
    addEventListener: vi.fn((name: string, listener: () => void) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    listeners,
  };
}

function drop(gui: HTMLElement, id: string): void {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { getData: () => id } });
  gui.dispatchEvent(event);
}

function protectedDragOver(gui: HTMLElement): Event {
  const event = new Event('dragover', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { getData: () => '' } });
  gui.dispatchEvent(event);
  return event;
}

afterEach(() => document.body.replaceChildren());

describe('RowGroupingPanel', () => {
  it('builds un-wired drop zone components', () => {
    const builder = new RowGroupPanelBuilder();

    expect(builder.createRowGroupDropZone(true)).toBeInstanceOf(RowGroupDropZone);
    expect(builder.createPivotDropZone(false).getGui().textContent).toContain('Pivot available in Phase 8');
  });

  it('uses guarded public APIs to remove, reorder, and add eligible group columns', () => {
    const country = createColumn('country');
    const athlete = createColumn('athlete');
    const api = createApi([country, athlete]);
    const zone = new RowGroupDropZone(true);
    zone.init(api as unknown as GridApi);
    document.body.appendChild(zone.getGui());

    expect(protectedDragOver(zone.getGui()).defaultPrevented).toBe(true);

    zone.getGui().querySelector<HTMLButtonElement>('[aria-label="Remove Display country from row groups"]')!.click();
    zone.getGui().querySelector<HTMLButtonElement>('[aria-label="Move Display country down"]')!.click();
    drop(zone.getGui(), 'athlete');
    expect(api.removeRowGroupColumns).toHaveBeenCalledWith(['country']);
    expect(api.moveRowGroupColumn).toHaveBeenCalledWith(0, 1);
    expect(api.addRowGroupColumns).toHaveBeenCalledWith(['athlete']);

    const disabled = createColumn('disabled', false);
    const automatic = createColumn('ag-Grid-AutoColumn', true, true);
    const guardedApi = createApi([disabled, automatic], true);
    const guardedZone = new RowGroupDropZone(true);
    guardedZone.init(guardedApi as unknown as GridApi);
    expect(protectedDragOver(guardedZone.getGui()).defaultPrevented).toBe(false);
    drop(guardedZone.getGui(), 'disabled');
    drop(guardedZone.getGui(), 'ag-Grid-AutoColumn');
    guardedZone.getGui().querySelector<HTMLButtonElement>('[aria-label="Remove Display disabled from row groups"]')!.click();
    expect(guardedApi.addRowGroupColumns).not.toHaveBeenCalled();
    expect(guardedApi.removeRowGroupColumns).not.toHaveBeenCalled();
  });
});
