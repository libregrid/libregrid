import {
  type BatchEditingStoppedEvent,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { BatchEditModule } from '@libregrid/batch-edit';
ModuleRegistry.registerModules([AllCommunityModule, BatchEditModule]);
interface Row {
  country: string;
  region: string;
  sales: number;
}
const rowData: Row[] = [
  {
    country: 'United States',
    region: 'North',
    sales: 100,
  },
  {
    country: 'France',
    region: 'South',
    sales: 8019,
  },
  {
    country: 'Japan',
    region: 'East',
    sales: 5938,
  },
  {
    country: 'Brazil',
    region: 'West',
    sales: 3857,
  },
  {
    country: 'Germany',
    region: 'North',
    sales: 1776,
  },
  {
    country: 'United States',
    region: 'South',
    sales: 9695,
  },
  {
    country: 'France',
    region: 'East',
    sales: 7614,
  },
  {
    country: 'Japan',
    region: 'West',
    sales: 5533,
  },
];
let batchEditing = false;
let log: string[] = [];
let gridApi: GridApi<Row> | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'country', editable: true, minWidth: 150 },
  { field: 'region', editable: true, minWidth: 110 },
  { field: 'sales', editable: true, type: 'numericColumn', minWidth: 110 },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { sortable: true, resizable: true, flex: 1 },
  onBatchEditingStarted: () => onBatchStarted(),
  onBatchEditingStopped: (e: BatchEditingStoppedEvent<Row>) => onBatchStopped(e),
  onCellValueChanged: (e: CellValueChangedEvent<Row>) => onCellChanged(e),
};
function onGridReady(readyApi: GridApi<Row>): void {
  gridApi = readyApi;
}
function startBatch(): void {
  gridApi?.startBatchEdit();
  syncBatchState();
}
function commitBatch(): void {
  gridApi?.commitBatchEdit();
  syncBatchState();
}
function cancelBatch(): void {
  gridApi?.cancelBatchEdit();
  syncBatchState();
}
function syncBatchState(): void {
  batchEditing = gridApi?.isBatchEditing() ?? false;
  render();
}
function onBatchStarted(): void {
  batchEditing = true;
  render();
  pushLog('batchEditingStarted');
}
function onBatchStopped(e: BatchEditingStoppedEvent<Row>): void {
  batchEditing = false;
  render();
  const n = e.changes?.length ?? 0;
  pushLog(`batchEditingStopped (${n} change${n === 1 ? '' : 's'})`);
}
function onCellChanged(e: CellValueChangedEvent<Row>): void {
  pushLog(`cellValueChanged ${e.colDef.field}`);
}
function pushLog(entry: string): void {
  log = ((entries) => [entry, ...entries].slice(0, 50))(log);
  render();
}
function render(): void {
  document.querySelector<HTMLButtonElement>('#action-0')!.disabled = batchEditing;
  document.querySelector<HTMLButtonElement>('#action-1')!.disabled = !batchEditing;
  document.querySelector<HTMLButtonElement>('#action-2')!.disabled = !batchEditing;
  document.querySelector('#status-batchEditing')!.textContent =
    batchEditing == null ? '' : String(batchEditing);
  document.querySelector('#status-log')!.textContent = log == null ? '' : String(log);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  startBatch();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  commitBatch();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  cancelBatch();
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
