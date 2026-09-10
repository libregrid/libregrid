import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'label' }, { field: 'score' }],
  rowData: [
    { label: 'A', score: 1 },
    { label: 'B', score: 2 },
  ],
});
