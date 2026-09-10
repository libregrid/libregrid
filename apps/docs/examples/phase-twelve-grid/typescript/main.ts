import type { ChartModel, ChartRef, ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { IntegratedChartsModule } from '@libregrid/integrated-charts';
import { CellSelectionModule } from '@libregrid/cell-selection';
ModuleRegistry.registerModules([AllCommunityModule, IntegratedChartsModule, CellSelectionModule]);
interface ChartRow {
  country: string;
  sales: number;
  profit: number;
  pipeline: number;
}
const ROWS: ChartRow[] = [
  { country: 'United Kingdom', sales: 120, profit: 28, pipeline: 146 },
  { country: 'United States', sales: 240, profit: 62, pipeline: 318 },
  { country: 'Japan', sales: 300, profit: 81, pipeline: 384 },
  { country: 'Germany', sales: 180, profit: 39, pipeline: 211 },
  { country: 'Brazil', sales: 155, profit: 31, pipeline: 202 },
];
const chartContainer = document.querySelector<HTMLElement>('#chartContainer')!;
let gridApi: GridApi<ChartRow> | undefined;
let ref: ChartRef | undefined;
let saved: ChartModel | undefined;
let chart: ChartRef | undefined = undefined;
let status = 'Create a chart from the current market rows.';
const gridOptions: GridOptions<ChartRow> = {
  rowData: ROWS.map((row) => ({ ...row })),
  enableCharts: true,
  cellSelection: true,
  animateRows: false,
  columnDefs: [
    { field: 'country', minWidth: 155 },
    { field: 'sales', headerName: 'Sales ($k)', type: 'numericColumn', editable: true },
    { field: 'profit', headerName: 'Profit ($k)', type: 'numericColumn', editable: true },
    { field: 'pipeline', headerName: 'Pipeline ($k)', type: 'numericColumn' },
  ] satisfies ColDef<ChartRow>[],
  defaultColDef: { flex: 1, minWidth: 110, sortable: true },
};
function ready(api: GridApi<ChartRow>): void {
  gridApi = api;
}
function createSalesChart(): void {
  ref?.destroyChart();
  ref = gridApi?.createRangeChart({
    chartType: 'groupedColumn',
    cellRange: {
      rowStartIndex: 0,
      rowEndIndex: ROWS.length - 1,
      columns: ['country', 'sales', 'profit'],
    },
    chartContainer: chartContainer,
  });
  chart = ref;
  render();
  status = ref
    ? 'Sales and profit chart linked to the visible market rows.'
    : 'The grid is still loading. Try again in a moment.';
  render();
}
function updateFirstMarket(): void {
  const first = gridApi?.getDisplayedRowAtIndex(0);
  if (!first?.data) return;
  gridApi?.applyTransaction({ update: [{ ...first.data, sales: first.data.sales + 10 }] });
  status = 'United Kingdom sales updated; the linked chart refreshed.';
  render();
}
function saveView(): void {
  const models = gridApi?.getChartModels();
  saved = models?.[0];
  status = saved
    ? 'Chart state captured. Persist this model with the user’s workspace.'
    : 'Create a chart before saving its state.';
  render();
}
function clearChart(): void {
  ref?.destroyChart();
  ref = undefined;
  chart = undefined;
  render();
  status = 'Chart cleared; the grid data is unchanged.';
  render();
}
function render(): void {
  document.querySelector('#chart-state')!.textContent = chart
    ? 'Linked to grid'
    : 'Create a chart to begin.';
  document.querySelector('#status-status')!.textContent = status == null ? '' : String(status);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  createSalesChart();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  updateFirstMarket();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  saveView();
  render();
});
document.querySelector('#action-3')!.addEventListener('click', () => {
  clearChart();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
