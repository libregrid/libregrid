import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { FindModule } from '@libregrid/find';
ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  FindModule,
]);
interface Row {
  country: string;
  sales: number;
  status: string;
}
const rows: Row[] = [
  { country: 'United Kingdom', sales: 120, status: 'Draft' },
  { country: 'United States', sales: 240, status: 'Published' },
  { country: 'Japan', sales: 300, status: 'Review' },
  { country: 'Germany', sales: 180, status: 'Draft' },
];
const rowData = rows;
const advancedParent = document.querySelector<HTMLElement>('#advancedParent')!;
let findText = '';
let matches = 0;
let gridApi: GridApi<Row> | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'country' },
  { field: 'sales', cellDataType: 'number' },
  {
    field: 'status',
    getFindText: ({ value }) =>
      value === 'Published' ? 'Live' : value == null ? null : String(value),
  },
];
const gridOptions: GridOptions<Row> = {
  enableAdvancedFilter: true,
  advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
  findOptions: { caseSensitive: false },
};
function ready(api: GridApi<Row>): void {
  gridApi = api;
  api.setGridOption('advancedFilterParent', advancedParent);
  api.addEventListener('findChanged', () => {
    matches = api.findGetTotalMatches();
    render();
  });
}
function showBuilder(): void {
  gridApi?.showAdvancedFilterBuilder();
}
function clearFilter(): void {
  gridApi?.setAdvancedFilterModel(null);
}
function setFind(value: string): void {
  findText = value;
  gridApi?.setGridOption('findSearchValue', value);
  matches = gridApi?.findGetTotalMatches() ?? 0;
}
function next(): void {
  gridApi?.findNext();
}
function render(): void {
  document.querySelector('#matches')!.textContent = `${matches} matches`;
  document.querySelector<HTMLInputElement>('#input-3')!.value = findText;
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  showBuilder();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  clearFilter();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  next();
  render();
});
document.querySelector('#input-3')!.addEventListener('input', (event) => {
  setFind((event.target as HTMLInputElement).value);
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rowData,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
