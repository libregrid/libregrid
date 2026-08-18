/** @vitest-environment jsdom */
import { DragRef, DropListRef } from '@angular/cdk/drag-drop';
import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ColumnsToolPanel,
  registerDropZone,
} from '@libregrid/columns-tool-panel';
import type { Column, GridApi } from 'ag-grid-community';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMaterialColumnsToolPanelDragDropAdapter,
  installMaterialColumnsToolPanelDragDrop,
} from './materialColumnsToolPanelDragDrop';

interface TestDropListData {
  kind: 'source' | 'group' | 'value';
}

interface TestDragData {
  id: string;
  name: string;
  index: number;
}

function createColumn(id: string, enableRowGroup = false, enableValue = false): Column {
  return {
    getColId: () => id,
    getColDef: () => ({ colId: id, enableRowGroup, enableValue }),
    isVisible: () => true,
    getPinned: () => null,
  } as unknown as Column;
}

function createApi(columns: Column[]) {
  return {
    getAllGridColumns: () => columns,
    moveColumns: vi.fn(),
    setColumnsVisible: vi.fn(),
    setColumnsPinned: vi.fn(),
    getDisplayNameForColumn: vi.fn((column: Column) => `Display ${column.getColId()}`),
    getRowGroupColumns: vi.fn((): Column[] => []),
    getValueColumns: vi.fn((): Column[] => []),
    addRowGroupColumns: vi.fn(),
    removeRowGroupColumns: vi.fn(),
    addValueColumns: vi.fn(),
    removeValueColumns: vi.fn(),
    getGridOption: vi.fn(() => false),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe('Material columns tool panel drag-drop adapter', () => {
  it('leaves roots without a columns list unchanged', () => {
    const root = document.createElement('div');
    const cleanup = createMaterialColumnsToolPanelDragDropAdapter(
      TestBed.inject(EnvironmentInjector),
    ).attach(root);

    cleanup();

    expect(root.childElementCount).toBe(0);
  });

  it('does not decorate rows when column movement is suppressed', () => {
    const api = createApi([createColumn('country')]);
    const uninstall = installMaterialColumnsToolPanelDragDrop(
      TestBed.inject(EnvironmentInjector),
    );
    const panel = new ColumnsToolPanel();

    panel.init({
      api: api as unknown as GridApi,
      context: null,
      onStateUpdated: vi.fn(),
      suppressColumnMove: true,
    } as never);

    expect(panel.getGui().querySelector('.cdk-drag')).toBeNull();
    panel.destroy();
    uninstall();
  });

  it('skips malformed and non-function DOM rows', () => {
    const root = document.createElement('section');
    root.innerHTML = `
      <div class="lgr-columns-list">
        <div class="lgr-columns-row" data-column-movable="true"></div>
      </div>
      <section class="lgr-columns-drop-zone"></section>
    `;
    const cleanup = createMaterialColumnsToolPanelDragDropAdapter(
      TestBed.inject(EnvironmentInjector),
    ).attach(root);

    expect(root.querySelector('.cdk-drag')).toBeNull();
    expect(root.querySelectorAll('.cdk-drop-list')).toHaveLength(1);
    cleanup();
  });

  it('decorates the neutral panel, delegates drops to its buttons, and disposes cleanly', async () => {
    const connectedTo = vi.spyOn(DropListRef.prototype, 'connectedTo');
    const disposeDropList = vi.spyOn(DropListRef.prototype, 'dispose');
    const disposeDrag = vi.spyOn(DragRef.prototype, 'dispose');
    const country = createColumn('country', true);
    const gold = createColumn('gold', false, true);
    const api = createApi([country, gold]);
    const uninstall = installMaterialColumnsToolPanelDragDrop(
      TestBed.inject(EnvironmentInjector),
    );
    const panel = new ColumnsToolPanel();

    panel.init({
      api: api as unknown as GridApi,
      context: null,
      onStateUpdated: vi.fn(),
    } as never);
    const root = panel.getGui();
    document.body.appendChild(root);

    const lists = connectedTo.mock.instances as unknown as DropListRef<TestDropListData>[];
    const source = lists.find((list) => list.data.kind === 'source');
    const groupTarget = lists.find((list) => list.data.kind === 'group');
    const valueTarget = lists.find((list) => list.data.kind === 'value');
    const countryDrag = source?.getItemAtIndex(0) as DragRef<TestDragData> | null;
    const goldDrag = source?.getItemAtIndex(1) as DragRef<TestDragData> | null;

    expect(root.querySelector('.lgr-columns-list')?.classList).toContain('cdk-drop-list');
    expect(root.querySelectorAll('.cdk-drag')).toHaveLength(2);
    expect(root.querySelector<HTMLElement>('[data-column-id="country"]')?.draggable).toBe(false);
    expect(source).toBeDefined();
    expect(groupTarget).toBeDefined();
    expect(valueTarget).toBeDefined();
    expect(countryDrag).not.toBeNull();
    expect(goldDrag).not.toBeNull();

    groupTarget?.drop(countryDrag!, 0, 0, source!, true, { x: 0, y: 0 }, { x: 0, y: 0 }, new MouseEvent('mouseup'));
    valueTarget?.drop(goldDrag!, 0, 1, source!, true, { x: 0, y: 0 }, { x: 0, y: 0 }, new MouseEvent('mouseup'));
    source?.drop(countryDrag!, 1, 0, source, true, { x: 0, y: 0 }, { x: 0, y: 0 }, new MouseEvent('mouseup'));

    await vi.waitFor(() => expect(api.moveColumns).toHaveBeenCalledOnce());

    expect(api.addRowGroupColumns).toHaveBeenCalledWith([country]);
    expect(api.addValueColumns).toHaveBeenCalledWith([gold]);
    expect(api.moveColumns).toHaveBeenCalledWith([country], 1);

    panel.destroy();
    expect(root.querySelector('.cdk-drop-list')).toBeNull();
    expect(root.querySelector('.cdk-drag')).toBeNull();
    expect(disposeDropList).toHaveBeenCalledTimes(4);
    expect(disposeDrag).toHaveBeenCalledTimes(2);

    uninstall();
  });

  it('bridges CDK drops into registered toolbar and header drop zones', () => {
    const connectedTo = vi.spyOn(DropListRef.prototype, 'connectedTo');
    const zoneElement = document.createElement('section');
    zoneElement.className = 'lgr-row-group-drop-zone';
    document.body.appendChild(zoneElement);
    const dropColumns = vi.fn(() => 1);
    const unregister = registerDropZone({
      element: zoneElement,
      kind: 'group',
      canDrop: () => true,
      dropColumns,
    });

    const country = createColumn('country', true);
    const api = createApi([country]);
    const uninstall = installMaterialColumnsToolPanelDragDrop(
      TestBed.inject(EnvironmentInjector),
    );
    const panel = new ColumnsToolPanel();
    panel.init({
      api: api as unknown as GridApi,
      context: null,
      onStateUpdated: vi.fn(),
    } as never);
    document.body.appendChild(panel.getGui());

    const lists = connectedTo.mock.instances as unknown as DropListRef<{ kind: string }>[];
    const source = lists.find((list) => list.data.kind === 'source');
    const embedded = lists.find((list) => list.data.kind === 'embedded');
    const countryDrag = source?.getItemAtIndex(0) as DragRef<TestDragData> | null;

    expect(embedded).toBeDefined();
    expect(zoneElement.classList).toContain('cdk-drop-list');

    embedded?.drop(countryDrag!, 0, 0, source!, true, { x: 0, y: 0 }, { x: 0, y: 0 }, new MouseEvent('mouseup'));

    expect(dropColumns).toHaveBeenCalledWith(['country']);

    panel.destroy();
    expect(zoneElement.classList).not.toContain('cdk-drop-list');
    uninstall();
    unregister();
  });
});
