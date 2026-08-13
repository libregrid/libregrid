export const columnsToolPanelCss = `
.lgr-columns-tool-panel { display: grid; gap: 8px; padding: 8px; color: var(--ag-foreground-color, #181d1f); }
.lgr-columns-tool-panel h2, .lgr-columns-tool-panel h3 { margin: 0; font: inherit; font-weight: 600; }
.lgr-columns-tool-panel h2 { font-size: 1rem; }
.lgr-columns-toolbar, .lgr-columns-list, .lgr-columns-section { display: grid; gap: 6px; }
.lgr-columns-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lgr-columns-actions { display: flex; justify-content: flex-end; gap: 6px; }
.lgr-columns-list { max-height: 160px; overflow: auto; }
.lgr-columns-row, .lgr-columns-member { display: flex; align-items: center; gap: 6px; min-width: 0; }
.lgr-columns-row { padding-left: calc(var(--lgr-column-depth, 0) * 16px); }
.lgr-columns-row label, .lgr-columns-member span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lgr-columns-row button { flex: none; }
.lgr-columns-group-toggle { width: 2rem; }
.lgr-columns-children { display: grid; gap: 6px; }
.lgr-columns-drop-zone { min-height: 2rem; outline: 1px dashed transparent; outline-offset: 3px; }
.lgr-columns-drop-zone:has([draggable="true"]) { outline-color: var(--ag-border-color, #babfc7); }
.lgr-columns-member button { margin-left: auto; }
.lgr-columns-status, .lgr-columns-unavailable { color: inherit; opacity: 0.75; font-size: 0.875rem; }
.lgr-column-chooser-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgb(0 0 0 / 45%); }
.lgr-column-chooser-dialog { width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; padding: 16px; background: var(--ag-background-color, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 30%); }
.lgr-column-chooser-close { float: right; }
`;
