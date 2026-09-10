import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridApi, GridOptions } from 'ag-grid-community';
import { createGridAssistant, type GridCommandProposal } from '@libregrid/ai-client';
import { mockTransport } from './mock-transport';
import { ROWS, type SaleRow } from './data';
@Component({
  selector: 'example-app',
  imports: [AgGridAngular, JsonPipe],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  api: GridApi<SaleRow> | undefined;
  readonly busy = signal(false);
  readonly review = signal(false);
  readonly proposal = signal<GridCommandProposal | null>(null);
  readonly status = signal('Ready. This example uses four fixed mock commands.');
  readonly traffic = signal('');
  readonly gridOptions: GridOptions<SaleRow> = {
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
  };
  async run(command: string): Promise<void> {
    if (!this.api || this.busy() || !command.trim()) return;
    this.busy.set(true);
    this.proposal.set(null);
    try {
      const assistant = createGridAssistant({
        api: this.api,
        transport: mockTransport,
        schema: {
          columns: { region: { includeSetValues: true }, category: { includeSetValues: true } },
        },
      });
      const proposal = await assistant.run(command);
      this.traffic.set(
        JSON.stringify({ request: proposal.request, response: proposal.response }, null, 2),
      );
      if (this.review()) {
        this.proposal.set(proposal);
        this.status.set(proposal.response.output.explanation);
      } else {
        proposal.apply();
        this.status.set(proposal.response.output.explanation);
      }
    } catch (error) {
      this.status.set(String(error));
    } finally {
      this.busy.set(false);
    }
  }
  apply(): void {
    try {
      this.proposal()?.apply();
      this.proposal.set(null);
      this.status.set('Changes applied.');
    } catch (error) {
      this.status.set(String(error));
    }
  }
  discard(): void {
    this.proposal.set(null);
    this.status.set('Proposal discarded.');
  }
  reset(): void {
    this.api?.setFilterModel(null);
    this.api?.resetColumnState();
    this.api?.setGridOption('pivotMode', false);
    this.proposal.set(null);
    this.status.set('Grid reset.');
  }
}
