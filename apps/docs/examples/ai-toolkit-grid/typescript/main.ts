import { createGrid } from 'ag-grid-community';
import { createGridAssistant, type GridCommandProposal } from '@libregrid/ai-client';
import { mockTransport } from './mock-transport';
import { ROWS, type SaleRow } from './data';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
import { SetFilterModule } from '@libregrid/set-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  AiToolkitModule,
  RowGroupingModule,
  PivotModule,
  SetFilterModule,
]);
let busy = false,
  review = false;
let proposal: GridCommandProposal | null = null;
let status = 'Ready. This example uses fixed mock commands.',
  traffic = '';
async function run(command: string): Promise<void> {
  if (!api || busy || !command.trim()) return;
  busy = true;
  render();
  proposal = null;
  try {
    const assistant = createGridAssistant({
      api: api,
      transport: mockTransport,
      schema: {
        columns: { region: { includeSetValues: true }, category: { includeSetValues: true } },
      },
    });
    const pending = await assistant.run(command);
    traffic = JSON.stringify({ request: pending.request, response: pending.response }, null, 2);
    if (review) {
      proposal = pending;
      status = pending.response.output.explanation;
    } else {
      pending.apply();
      status = pending.response.output.explanation;
    }
  } catch (error) {
    status = String(error);
  } finally {
    busy = false;
    render();
  }
}
function apply(): void {
  try {
    proposal?.apply();
    proposal = null;
    status = 'Changes applied.';
  } catch (error) {
    status = String(error);
  }
}
function discard(): void {
  proposal = null;
  status = 'Proposal discarded.';
}
function reset(): void {
  api?.setFilterModel(null);
  api?.resetColumnState();
  api?.setGridOption('pivotMode', false);
  proposal = null;
  status = 'Grid reset.';
}
function render(): void {
  document.querySelector('#status')!.textContent = status;
  document.querySelector('#traffic')!.textContent = traffic;
  document.querySelector<HTMLElement>('#proposal')!.hidden = !proposal;
  document.querySelector('#diff')!.textContent = JSON.stringify(proposal?.changes ?? [], null, 2);
  document.querySelector<HTMLButtonElement>('#run')!.disabled = busy;
  document.querySelector<HTMLButtonElement>('#reset')!.disabled = busy;
}
document
  .querySelector('#run')!
  .addEventListener(
    'click',
    () => void run(document.querySelector<HTMLInputElement>('#command')!.value),
  );
document.querySelector('#review')!.addEventListener('change', (event) => {
  review = (event.target as HTMLInputElement).checked;
});
document.querySelector('#apply')!.addEventListener('click', () => {
  apply();
  render();
});
document.querySelector('#discard')!.addEventListener('click', () => {
  discard();
  render();
});
document.querySelector('#reset')!.addEventListener('click', () => {
  reset();
  render();
});
const api = createGrid<SaleRow>(document.querySelector<HTMLElement>('#grid')!, {
  rowData: ROWS,
  columnDefs: [
    { field: 'order', headerName: 'Sales order', filter: 'agTextColumnFilter' },
    { field: 'product', headerName: 'Product name', filter: 'agTextColumnFilter' },
    {
      field: 'amountUsd',
      headerName: 'Sales amount (USD)',
      cellDataType: 'number',
      filter: 'agNumberColumnFilter',
      enableValue: true,
    },
    {
      field: 'region',
      headerName: 'Sales region',
      filter: 'agSetColumnFilter',
      filterParams: { values: ['North America', 'Europe', 'Asia Pacific'] },
      enableRowGroup: true,
      enablePivot: true,
    },
    {
      field: 'category',
      headerName: 'Product category',
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Hardware', 'Software License'] },
      enableRowGroup: true,
      enablePivot: true,
    },
    { field: 'salesRep', headerName: 'Sales rep', filter: 'agTextColumnFilter' },
    {
      field: 'closedDate',
      headerName: 'Closed date',
      cellDataType: 'dateString',
      filter: 'agDateColumnFilter',
    },
  ],
  defaultColDef: { sortable: true, resizable: true },
});
render();
