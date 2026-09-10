import type { ColDef, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { SparklinesModule } from '@libregrid/sparklines';
ModuleRegistry.registerModules([AllCommunityModule, SparklinesModule]);
interface AccountHealth {
  account: string;
  owner: string;
  monthlyUsage: number[];
  retention: number[];
  trend: 'Growing' | 'Watch';
}
const ROWS: AccountHealth[] = [
  {
    account: 'Northstar Health',
    owner: 'Avery',
    monthlyUsage: [24, 29, 31, 38, 44, 57],
    retention: [82, 84, 83, 88, 90, 93],
    trend: 'Growing',
  },
  {
    account: 'Meridian Retail',
    owner: 'Jo',
    monthlyUsage: [52, 49, 47, 45, 41, 38],
    retention: [91, 90, 88, 84, 80, 76],
    trend: 'Watch',
  },
  {
    account: 'Fieldstone Labs',
    owner: 'Mina',
    monthlyUsage: [12, 18, 21, 28, 35, 41],
    retention: [69, 74, 78, 82, 85, 88],
    trend: 'Growing',
  },
  {
    account: 'Crown & Finch',
    owner: 'Daniel',
    monthlyUsage: [34, 37, 35, 40, 44, 46],
    retention: [88, 87, 89, 90, 91, 91],
    trend: 'Growing',
  },
];
const gridOptions: GridOptions<AccountHealth> = {
  rowData: ROWS,
  columnDefs: [
    { field: 'account', minWidth: 180 },
    { field: 'owner', width: 120 },
    {
      field: 'monthlyUsage',
      headerName: 'Monthly usage',
      minWidth: 190,
      cellRenderer: 'agSparklineCellRenderer',
      cellRendererParams: { sparklineOptions: { type: 'area', tooltip: { enabled: true } } },
    },
    {
      field: 'retention',
      headerName: 'Retention',
      minWidth: 190,
      cellRenderer: 'agSparklineCellRenderer',
      cellRendererParams: { sparklineOptions: { type: 'line', tooltip: { enabled: true } } },
    },
    { field: 'trend', width: 120 },
  ] satisfies ColDef<AccountHealth>[],
  animateRows: false,
};
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
});
render();
