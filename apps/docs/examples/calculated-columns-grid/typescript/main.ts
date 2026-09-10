import {
  type CalculatedColumnExpressionChangedEvent,
  type CalculatedColumnValidationStateChangedEvent,
  type GridOptions,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { CalculatedColumnsModule } from '@libregrid/calculated-columns';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, CalculatedColumnsModule, ColumnMenuModule]);
interface Row {
  product: string;
  revenue: number;
  cost: number;
  units: number;
}
let log: string[] = [];
const gridOptions: GridOptions<Row> = {
  columnDefs: [
    { field: 'product' },
    { field: 'revenue' },
    { field: 'cost' },
    { field: 'units' },
    {
      colId: 'profit',
      headerName: 'Profit',
      calculatedExpression: '[revenue] - [cost]',
      cellDataType: 'number',
      aggFunc: 'sum',
      sortable: true,
      filter: true,
    },
    {
      colId: 'unitPrice',
      headerName: 'Unit Price',
      calculatedExpression: 'IF([units] > 0, [revenue] / [units], 0)',
      cellDataType: 'number',
    },
  ],
  rowData: [
    {
      product: 'Widget',
      revenue: 1000,
      cost: 400,
      units: 12,
    },
    {
      product: 'Gadget',
      revenue: 2723,
      cost: 1319,
      units: 19,
    },
    {
      product: 'Gizmo',
      revenue: 4446,
      cost: 2238,
      units: 26,
    },
    {
      product: 'Doohickey',
      revenue: 6169,
      cost: 3157,
      units: 33,
    },
    {
      product: 'Thingamajig',
      revenue: 7892,
      cost: 4076,
      units: 40,
    },
  ],
  calculatedColumns: true,
  getRowId: (params) => `row-${params.data.product}`,
  onGridReady: (params) => {
    const api = params.api;
    pushEvent('grid ready — open a header menu to add a calculated column');
    api.addEventListener('calculatedColumnCreated', (event) => {
      pushEvent(`calculatedColumnCreated: [${event.column.getColId()}]`);
    });
    api.addEventListener('calculatedColumnRemoved', (event) => {
      pushEvent(`calculatedColumnRemoved: [${event.column.getColId()}]`);
    });
    api.addEventListener(
      'calculatedColumnExpressionChanged',
      (event: CalculatedColumnExpressionChangedEvent) => {
        pushEvent(
          `calculatedColumnExpressionChanged: [${event.column.getColId()}] "${event.oldExpression}" → "${event.expression}"`,
        );
      },
    );
    api.addEventListener(
      'calculatedColumnValidationStateChanged',
      (event: CalculatedColumnValidationStateChangedEvent) => {
        pushEvent(
          `calculatedColumnValidationStateChanged: [${event.column.getColId()}] ${event.valid ? 'valid' : `invalid (${event.reason ?? 'unknown'})`}`,
        );
      },
    );
  },
};
function pushEvent(entry: string): void {
  log = ((entries) => [...entries, entry].slice(-8))(log);
  render();
}
function render(): void {
  document.querySelector('#status-log')!.textContent = log == null ? '' : String(log);
}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
});
render();
