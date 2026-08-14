export const chartCss = `
.lgr-chart { background:var(--ag-background-color,#fff); border:1px solid var(--ag-border-color,#ddd); min-height:260px; position:relative; }
.lgr-chart-toolbar { display:flex; gap:4px; left:8px; position:absolute; top:8px; z-index:2; }
.lgr-chart-toolbar button { background:var(--ag-background-color,#fff); border:1px solid var(--ag-border-color,#ddd); color:var(--ag-foreground-color,#111); font:inherit; padding:4px 8px; }
.lgr-chart-tool-panel { background:var(--ag-background-color,#fff); border:1px solid var(--ag-border-color,#ddd); color:var(--ag-foreground-color,#111); display:grid; gap:12px; margin-top:8px; max-width:320px; padding:16px; }
.lgr-chart-tool-panel select, .lgr-chart-tool-panel button { font:inherit; min-height:36px; }
`;
