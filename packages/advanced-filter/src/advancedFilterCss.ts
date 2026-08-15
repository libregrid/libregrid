export const advancedFilterCss = `
.lgr-advanced-filter, .lgr-advanced-filter-builder { box-sizing:border-box; color:var(--ag-foreground-color); background:var(--ag-background-color); font:inherit; }
.lgr-advanced-filter { display:grid; grid-template-columns:minmax(0, 1fr) auto auto; gap:8px; align-items:center; padding:7px 10px; border-bottom:1px solid var(--ag-border-color); box-shadow:0 1px 0 color-mix(in srgb, var(--ag-border-color) 55%, transparent); }
.lgr-advanced-filter input { width:100%; min-width:0; }
.lgr-advanced-filter-error { grid-column:1 / -1; color:var(--ag-invalid-color, #c62828); font-size:.85em; }
.lgr-advanced-filter-error:empty { display:none; }
.lgr-advanced-filter-builder { --lgr-advanced-filter-builder-min-width:420px; display:grid; gap:16px; width:min(100%, var(--lgr-advanced-filter-builder-min-width)); min-width:min(100%, var(--lgr-advanced-filter-builder-min-width)); max-width:100%; padding:18px; border:1px solid color-mix(in srgb, var(--ag-border-color) 90%, var(--ag-accent-color, #6d28d9)); border-radius:14px; background:linear-gradient(150deg, color-mix(in srgb, var(--ag-background-color) 94%, var(--ag-accent-color, #6d28d9)), var(--ag-background-color)); box-shadow:0 10px 28px color-mix(in srgb, var(--ag-foreground-color) 12%, transparent); }
.lgr-advanced-filter-builder-heading { display:grid; gap:4px; }
.lgr-advanced-filter-builder-heading strong { font-size:1rem; letter-spacing:.01em; }
.lgr-advanced-filter-builder-heading span { color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:.86rem; line-height:1.4; }
.lgr-advanced-filter-pills { display:grid; gap:6px; }
.lgr-advanced-filter-builder-empty { display:grid; gap:4px; min-height:92px; place-content:center start; padding:14px; border:1px dashed color-mix(in srgb, var(--ag-border-color) 65%, var(--ag-accent-color, #6d28d9)); border-radius:10px; background:color-mix(in srgb, var(--ag-accent-color, #6d28d9) 6%, var(--ag-background-color)); }
.lgr-advanced-filter-builder-empty strong { font-size:.9rem; }
.lgr-advanced-filter-builder-empty span { color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:.84rem; line-height:1.4; }
.lgr-advanced-filter-pill { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px; border:1px solid var(--ag-border-color); border-radius:9px; background:color-mix(in srgb, var(--ag-background-color) 80%, var(--ag-foreground-color)); }
.lgr-advanced-filter-pill select, .lgr-advanced-filter-pill input { min-width:0; max-width:100%; }
.lgr-advanced-filter-pill button { margin-inline-start:auto; }
.lgr-advanced-filter-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; padding-top:14px; border-top:1px solid var(--ag-border-color); }
.lgr-advanced-filter-builder button { min-height:32px; padding:4px 10px; border:1px solid var(--ag-border-color); border-radius:7px; background:var(--ag-background-color); color:var(--ag-foreground-color); cursor:pointer; font:inherit; font-size:.86rem; }
.lgr-advanced-filter-builder button:hover { border-color:var(--ag-accent-color, #6d28d9); background:color-mix(in srgb, var(--ag-accent-color, #6d28d9) 10%, var(--ag-background-color)); }
.lgr-advanced-filter-builder button:focus-visible { outline:2px solid var(--ag-accent-color, #6d28d9); outline-offset:2px; }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-primary, .lgr-advanced-filter-builder .lgr-advanced-filter-builder-add { border-color:var(--ag-accent-color, #6d28d9); background:var(--ag-accent-color, #6d28d9); color:var(--ag-background-color); }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-primary:hover, .lgr-advanced-filter-builder .lgr-advanced-filter-builder-add:hover { background:color-mix(in srgb, var(--ag-accent-color, #6d28d9) 84%, #000); }
@media (max-width:600px) {
  .lgr-advanced-filter-builder { gap:12px; padding:14px; border-radius:10px; }
  .lgr-advanced-filter-actions { justify-content:flex-start; }
  .lgr-advanced-filter-pill button { margin-inline-start:0; }
}
`;
