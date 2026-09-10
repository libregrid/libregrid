import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ContextMenuModule } from '@libregrid/menu';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, ContextMenuModule, ColumnMenuModule]);
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
}
class RowStatusMenuItem {
  private gui: HTMLElement | undefined;
  private onItemActivated: (() => void) | undefined;
  public agInit(params: { onItemActivated: () => void; api: GridApi }): void {
    this.onItemActivated = params.onItemActivated;
    this.gui = document.createElement('span');
    this.gui.textContent = 'Displayed rows: ' + String(params.api.getDisplayedRowCount());
  }
  public configureDefaults(): boolean {
    return true;
  }
  public setActive(active: boolean): void {
    if (this.gui) this.gui.style.fontWeight = active ? '700' : '500';
  }
  public select(): void {
    this.onItemActivated?.();
  }
  public getGui(): HTMLElement {
    return this.gui ?? document.createElement('span');
  }
}
const rowData: Row[] = [
  {
    country: 'United States',
    region: 'North',
    product: 'Widget',
    sales: 100,
    units: 1,
  },
  {
    country: 'France',
    region: 'South',
    product: 'Gadget',
    sales: 8019,
    units: 32,
  },
  {
    country: 'Japan',
    region: 'East',
    product: 'Doohickey',
    sales: 5938,
    units: 13,
  },
  {
    country: 'Brazil',
    region: 'West',
    product: 'Widget',
    sales: 3857,
    units: 44,
  },
  {
    country: 'Germany',
    region: 'North',
    product: 'Gadget',
    sales: 1776,
    units: 25,
  },
  {
    country: 'United States',
    region: 'South',
    product: 'Doohickey',
    sales: 9695,
    units: 6,
  },
  {
    country: 'France',
    region: 'East',
    product: 'Widget',
    sales: 7614,
    units: 37,
  },
  {
    country: 'Japan',
    region: 'West',
    product: 'Gadget',
    sales: 5533,
    units: 18,
  },
];
let lastAction = 'none';
let suppressContextMenu = false;
let gridApi: GridApi | null = null;
const columnDefs: ColDef<Row>[] = [
  { field: 'country', minWidth: 160 },
  { field: 'region', minWidth: 110 },
  { field: 'product', minWidth: 130 },
  { field: 'sales', type: 'numericColumn', minWidth: 110 },
  { field: 'units', type: 'numericColumn', minWidth: 100 },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
  rowSelection: { mode: 'multiRow' },
  getContextMenuItems: (params) => [
    ...(params.defaultItems ?? []),
    'separator',
    {
      name: 'Inspect Cell',
      action: () => ((lastAction = String(params.value ?? 'empty')), render()),
    },
    {
      name: 'Clear Inspection',
      action: () => ((lastAction = 'none'), render()),
    },
    {
      name: 'Row status (custom component)',
      menuItem: RowStatusMenuItem,
      suppressCloseOnSelect: true,
    },
  ],
  allowContextMenuWithControlKey: true,
};
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
}
function showContextMenu(): void {
  gridApi?.showContextMenu();
}
function hidePopupMenu(): void {
  gridApi?.hidePopupMenu();
}
function setContextMenuSuppressed(suppressed: boolean): void {
  gridApi?.setGridOption('suppressContextMenu', suppressed);
  suppressContextMenu = suppressed;
  render();
}
function render(): void {
  document.querySelector('#status-lastAction')!.textContent =
    lastAction == null ? '' : String(lastAction);
  document.querySelector('#status-suppressContextMenu')!.textContent =
    suppressContextMenu == null ? '' : String(suppressContextMenu);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  showContextMenu();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  hidePopupMenu();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  setContextMenuSuppressed(true);
  render();
});
document.querySelector('#action-3')!.addEventListener('click', () => {
  setContextMenuSuppressed(false);
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rowData,
  onGridReady: (event) => {
    onGridReady(event.api);
    render();
  },
});
render();
