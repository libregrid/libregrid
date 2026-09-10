import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = signal<Row[]>([
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
  ]);
  protected readonly lastAction = signal('none');
  protected readonly suppressContextMenu = signal(false);
  private api: GridApi | null = null;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', minWidth: 160 },
    { field: 'region', minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', type: 'numericColumn', minWidth: 110 },
    { field: 'units', type: 'numericColumn', minWidth: 100 },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
    rowSelection: { mode: 'multiRow' },
    getContextMenuItems: (params) => [
      ...(params.defaultItems ?? []),
      'separator',
      {
        name: 'Inspect Cell',
        action: () => this.lastAction.set(String(params.value ?? 'empty')),
      },
      {
        name: 'Clear Inspection',
        action: () => this.lastAction.set('none'),
      },
      {
        name: 'Row status (custom component)',
        menuItem: RowStatusMenuItem,
        suppressCloseOnSelect: true,
      },
    ],
    allowContextMenuWithControlKey: true,
  };
  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }
  showContextMenu(): void {
    this.api?.showContextMenu();
  }
  hidePopupMenu(): void {
    this.api?.hidePopupMenu();
  }
  setContextMenuSuppressed(suppressed: boolean): void {
    this.api?.setGridOption('suppressContextMenu', suppressed);
    this.suppressContextMenu.set(suppressed);
  }
}
