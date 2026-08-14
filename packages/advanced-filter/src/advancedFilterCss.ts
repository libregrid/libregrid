export const advancedFilterCss = `
.lgr-advanced-filter, .lgr-advanced-filter-builder { color:var(--ag-foreground-color); background:var(--ag-background-color); font:inherit; }
.lgr-advanced-filter { display:flex; gap:6px; align-items:center; padding:5px; }
.lgr-advanced-filter input { min-width:280px; flex:1; }
.lgr-advanced-filter-error { color:var(--ag-invalid-color, #c62828); font-size:.85em; }
.lgr-advanced-filter-builder { display:grid; gap:10px; min-width:420px; padding:14px; border:1px solid var(--ag-border-color); border-radius:6px; box-shadow:var(--ag-popup-shadow); }
.lgr-advanced-filter-pills { display:grid; gap:6px; }
.lgr-advanced-filter-pill { display:flex; gap:6px; align-items:center; padding:6px; border:1px solid var(--ag-border-color); border-radius:5px; }
.lgr-advanced-filter-pill button { margin-inline-start:auto; }
.lgr-advanced-filter-actions { display:flex; gap:6px; justify-content:flex-end; }
.lgr-advanced-filter-builder.lgr-advanced-filter-fullscreen { inset:12px; max-width:none; position:fixed; z-index:1000; }
`;
