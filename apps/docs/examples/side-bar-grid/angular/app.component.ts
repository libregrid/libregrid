import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type ColDef, type GridOptions, type GridApi, type SideBarDef } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
  category: string;
  discount: number;
  stock: number;
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
      category: 'Gadget',
      discount: 0,
      stock: 10,
    },
    {
      country: 'France',
      region: 'South',
      product: 'Gadget',
      sales: 8019,
      units: 32,
      category: 'Doohickey',
      discount: 7,
      stock: 63,
    },
    {
      country: 'Japan',
      region: 'East',
      product: 'Doohickey',
      sales: 5938,
      units: 13,
      category: 'Widget',
      discount: 14,
      stock: 116,
    },
    {
      country: 'Brazil',
      region: 'West',
      product: 'Widget',
      sales: 3857,
      units: 44,
      category: 'Gadget',
      discount: 21,
      stock: 169,
    },
    {
      country: 'Germany',
      region: 'North',
      product: 'Gadget',
      sales: 1776,
      units: 25,
      category: 'Doohickey',
      discount: 28,
      stock: 22,
    },
    {
      country: 'United States',
      region: 'South',
      product: 'Doohickey',
      sales: 9695,
      units: 6,
      category: 'Widget',
      discount: 5,
      stock: 75,
    },
    {
      country: 'France',
      region: 'East',
      product: 'Widget',
      sales: 7614,
      units: 37,
      category: 'Gadget',
      discount: 12,
      stock: 128,
    },
    {
      country: 'Japan',
      region: 'West',
      product: 'Gadget',
      sales: 5533,
      units: 18,
      category: 'Doohickey',
      discount: 19,
      stock: 181,
    },
  ]);
  protected readonly isVisible = signal(false);
  protected readonly openPanelId = signal<string | null>(null);
  protected readonly buttonsHidden = signal(false);
  private api: GridApi | null = null;
  private readonly sideBarDef: SideBarDef = {
    toolPanels: ['columns', 'filters'],
    defaultToolPanel: 'columns',
  };
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', enableRowGroup: true, minWidth: 160 },
    { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
    { field: 'product', enableRowGroup: true, minWidth: 130 },
    { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
    { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
    { field: 'category', enablePivot: true, minWidth: 150 },
    { field: 'discount', enableValue: true, type: 'numericColumn', minWidth: 130 },
    { field: 'stock', type: 'numericColumn', minWidth: 130 },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
    sideBar: this.sideBarDef,
  };
  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
    this.isVisible.set(gridApi.isSideBarVisible());
    this.openPanelId.set(gridApi.getOpenedToolPanel());
  }
  toggleSideBar(): void {
    const current = this.api?.isSideBarVisible() ?? false;
    this.api?.setSideBarVisible(!current);
    this.isVisible.set(!current);
  }
  openPanel(id: string): void {
    this.api?.openToolPanel(id);
    this.openPanelId.set(id);
  }
  closePanel(): void {
    this.api?.closeToolPanel();
    this.openPanelId.set(null);
  }
  setPosition(position: 'left' | 'right'): void {
    this.api?.setSideBarPosition(position);
  }
  setButtonsHidden(hidden: boolean): void {
    this.buttonsHidden.set(hidden);
    this.api?.setGridOption('sideBar', {
      ...this.sideBarDef,
      hideButtons: hidden,
    });
  }
}
