import type { ColDef } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RichSelectModule } from '@libregrid/rich-select';
ModuleRegistry.registerModules([
  AllCommunityModule,
  RichSelectModule,
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
const richColumns: ColDef<Row>[] = [
  { field: 'country' },
  {
    field: 'status',
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorParams: {
      values: Array.from({ length: 10000 }, (_, index) =>
        index < 3 ? ['Draft', 'Published', 'Review'][index] : `Status ${index}`,
      ),
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    },
  },
];
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: richColumns,
  rowData: rowData,
});
render();
