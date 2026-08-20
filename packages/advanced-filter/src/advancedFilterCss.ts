export const advancedFilterCss = `
.lgr-advanced-filter, .lgr-advanced-filter-builder, .lgr-advanced-filter-builder * { box-sizing:border-box; }
.lgr-advanced-filter { display:grid; grid-template-columns:minmax(0, 1fr) auto auto; gap:8px; align-items:center; padding:7px 10px; border-bottom:1px solid var(--ag-border-color); color:var(--ag-foreground-color); background:var(--ag-background-color); box-shadow:0 1px 0 color-mix(in srgb, var(--ag-border-color) 55%, transparent); font:inherit; }
.lgr-advanced-filter input { width:100%; min-width:0; }
.lgr-advanced-filter-error { grid-column:1 / -1; color:var(--ag-invalid-color, #c62828); font-size:.85em; }
.lgr-advanced-filter-error:empty { display:none; }

.lgr-advanced-filter-builder-overlay { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:16px; background:rgba(0,0,0,.38); }
.lgr-advanced-filter-builder { --lgr-advanced-filter-builder-min-width:520px; display:flex; flex-direction:column; width:min(900px, calc(100vw - 32px)); min-width:min(100%, var(--lgr-advanced-filter-builder-min-width)); max-height:calc(100vh - 32px); overflow:hidden; border:1px solid var(--ag-border-color, #ddd); border-radius:12px; color:var(--ag-foreground-color, #111); background:var(--ag-background-color, #fff); box-shadow:0 20px 58px rgba(0,0,0,.3); font:inherit; }
.lgr-advanced-filter-builder-header { display:flex; align-items:flex-start; gap:12px; padding:16px 20px; border-bottom:1px solid var(--ag-border-color, #ddd); }
.lgr-advanced-filter-builder-heading { min-width:0; flex:1; }
.lgr-advanced-filter-builder-heading h2 { margin:0; font:inherit; font-size:17px; font-weight:680; }
.lgr-advanced-filter-builder-heading p { margin:3px 0 0; color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:12px; line-height:1.4; }
.lgr-advanced-filter-builder-body { min-height:0; flex:1; overflow:auto; padding:18px 20px 20px; }
.lgr-advanced-filter-rules { min-width:0; }
.lgr-advanced-filter-section-label { display:block; margin:0 0 6px; color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }

.lgr-advanced-filter-rule-group { position:relative; display:grid; gap:10px; padding:12px; border:1px solid var(--ag-border-color, #ddd); border-radius:10px; background:var(--ag-subtle-background-color, color-mix(in srgb, var(--ag-foreground-color, #111) 2%, var(--ag-background-color, #fff))); }
.lgr-advanced-filter-rule-group-root { padding:0; border:0; background:transparent; }
.lgr-advanced-filter-group-toolbar { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.lgr-advanced-filter-logic-choice { display:inline-flex; gap:3px; padding:3px; border-radius:8px; background:var(--ag-header-background-color, color-mix(in srgb, var(--ag-foreground-color, #111) 6%, transparent)); }
.lgr-advanced-filter-builder .lgr-advanced-filter-logic-button { min-height:29px; padding:4px 10px; border:0; border-radius:6px; background:transparent; color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:12px; }
.lgr-advanced-filter-builder .lgr-advanced-filter-logic-button-active { background:var(--ag-background-color, #fff); color:var(--ag-accent-color, #006bd6); box-shadow:0 1px 3px color-mix(in srgb, var(--ag-foreground-color, #111) 18%, transparent); font-weight:700; }
.lgr-advanced-filter-group-content { position:relative; display:grid; grid-template-columns:24px minmax(0,1fr); }
.lgr-advanced-filter-rule-rail { position:relative; width:13px; margin:4px 0; border:2px solid var(--ag-accent-color, #006bd6); border-right:0; border-radius:7px 0 0 7px; }
.lgr-advanced-filter-rule-rail span { position:absolute; top:50%; left:-10px; padding:2px; background:var(--ag-background-color, #fff); color:var(--ag-accent-color, #006bd6); font-size:9px; font-weight:800; letter-spacing:.04em; transform:translateY(-50%) rotate(-90deg); }
.lgr-advanced-filter-rule-group:not(.lgr-advanced-filter-rule-group-root) .lgr-advanced-filter-rule-rail span { background:var(--ag-subtle-background-color, var(--ag-background-color, #fff)); }
.lgr-advanced-filter-rule-rows { display:grid; gap:8px; min-width:0; }
.lgr-advanced-filter-condition-row { display:grid; grid-template-columns:28px minmax(120px,.8fr) minmax(145px,1fr) minmax(130px,1.15fr) 32px; gap:8px; align-items:center; min-width:0; padding:8px; border:1px solid var(--ag-border-color, #ddd); border-radius:8px; background:var(--ag-background-color, #fff); }
.lgr-advanced-filter-condition-dragging { opacity:.55; }
.lgr-advanced-filter-condition-control { width:100%; min-width:0; max-width:100%; height:35px; padding:5px 8px; border:1px solid var(--ag-border-color, #ccc); border-radius:6px; background:var(--ag-input-background-color, var(--ag-background-color, #fff)); color:inherit; font:inherit; font-size:12px; }
.lgr-advanced-filter-condition-column { border-left:3px solid #4daacb; }
.lgr-advanced-filter-condition-operator { border-left:3px solid #d68b41; }
.lgr-advanced-filter-condition-value { border-left:3px solid #6fab69; }
.lgr-advanced-filter-condition-value-host { min-width:0; }
.lgr-advanced-filter-condition-no-value { display:flex; min-height:35px; align-items:center; padding:5px 9px; border:1px dashed var(--ag-border-color, #ccc); border-radius:6px; color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:11px; }
.lgr-advanced-filter-group-actions { display:flex; gap:6px; padding-left:24px; }

.lgr-advanced-filter-expression-block { margin-top:16px; }
.lgr-advanced-filter-builder-expression { width:100%; height:40px; padding:8px 10px; border:1px solid var(--ag-border-color, #ccc); border-radius:7px; background:var(--ag-input-background-color, var(--ag-background-color, #fff)); color:inherit; font:inherit; font-family:var(--ag-font-family-monospace, ui-monospace, monospace); }
.lgr-advanced-filter-builder-expression[aria-invalid="true"] { border-color:var(--ag-invalid-color, #c62828); outline:1px solid var(--ag-invalid-color, #c62828); }
.lgr-advanced-filter-expression-help { margin:5px 0 0; color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:11px; }
.lgr-advanced-filter-builder-error { margin-top:5px; color:var(--ag-invalid-color, #c62828); font-size:11px; }
.lgr-advanced-filter-builder-empty { display:grid; gap:4px; min-height:78px; place-content:center start; padding:12px; border:1px dashed var(--ag-border-color, #ccc); border-radius:8px; background:color-mix(in srgb, var(--ag-accent-color, #006bd6) 5%, var(--ag-background-color, #fff)); }
.lgr-advanced-filter-builder-empty strong { font-size:12px; }
.lgr-advanced-filter-builder-empty span { color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); font-size:11px; }

.lgr-advanced-filter-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; padding:12px 20px; border-top:1px solid var(--ag-border-color, #ddd); background:var(--ag-header-background-color, color-mix(in srgb, var(--ag-foreground-color, #111) 3%, var(--ag-background-color, #fff))); }
.lgr-advanced-filter-builder button { min-height:34px; padding:5px 11px; border:1px solid var(--ag-border-color, #ccc); border-radius:7px; background:var(--ag-background-color, #fff); color:var(--ag-foreground-color, #111); cursor:pointer; font:inherit; font-size:12px; }
.lgr-advanced-filter-builder button:hover { border-color:var(--ag-accent-color, #006bd6); background:var(--ag-row-hover-color, color-mix(in srgb, var(--ag-accent-color, #006bd6) 8%, var(--ag-background-color, #fff))); }
.lgr-advanced-filter-builder button:focus-visible, .lgr-advanced-filter-builder input:focus-visible, .lgr-advanced-filter-builder select:focus-visible { outline:2px solid var(--ag-accent-color, #006bd6); outline-offset:2px; }
.lgr-advanced-filter-builder button:disabled { cursor:not-allowed; opacity:.5; }
.lgr-advanced-filter-builder .lgr-advanced-filter-icon-button { display:grid; width:32px; min-width:32px; height:32px; min-height:32px; padding:0; place-items:center; border-color:transparent; background:transparent; font-size:18px; line-height:1; }
.lgr-advanced-filter-builder .lgr-advanced-filter-move-handle { color:var(--ag-secondary-foreground-color, var(--ag-foreground-color)); cursor:grab; font-size:16px; }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-quiet { border-color:transparent; background:transparent; }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-add { border-color:transparent; background:var(--ag-row-hover-color, color-mix(in srgb, var(--ag-accent-color, #006bd6) 10%, var(--ag-background-color, #fff))); font-weight:650; }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-primary { border-color:var(--ag-accent-color, #006bd6); background:var(--ag-accent-color, #006bd6); color:var(--ag-background-color, #fff); font-weight:700; }
.lgr-advanced-filter-builder .lgr-advanced-filter-builder-primary:hover { background:color-mix(in srgb, var(--ag-accent-color, #006bd6) 84%, #000); }

@media (max-width:650px) {
  .lgr-advanced-filter-builder-overlay { align-items:stretch; padding:8px; }
  .lgr-advanced-filter-builder { width:100%; min-width:0; max-height:calc(100vh - 16px); border-radius:9px; }
  .lgr-advanced-filter-builder-header { padding:13px 14px; }
  .lgr-advanced-filter-builder-heading p { display:none; }
  .lgr-advanced-filter-builder-body { padding:12px; }
  .lgr-advanced-filter-condition-row { grid-template-columns:24px minmax(0,1fr) 32px; gap:6px; }
  .lgr-advanced-filter-condition-operator, .lgr-advanced-filter-condition-value-host { grid-column:2; }
  .lgr-advanced-filter-actions { padding:10px 12px; }
}
`;
