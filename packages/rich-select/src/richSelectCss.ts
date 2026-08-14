export const richSelectCss = `
.lgr-rich-select { min-width:180px; background:var(--ag-background-color); color:var(--ag-foreground-color); border:1px solid var(--ag-border-color); border-radius:4px; box-shadow:var(--ag-popup-shadow); padding:6px; }
.lgr-rich-select input { box-sizing:border-box; width:100%; margin-bottom:6px; }
.lgr-rich-select-list { max-height:260px; overflow:auto; position:relative; outline:none; }
.lgr-rich-select-option { align-items:center; box-sizing:border-box; cursor:pointer; display:flex; padding:0 8px; position:absolute; width:100%; }
.lgr-rich-select-option[aria-selected=true], .lgr-rich-select-option:hover { background:var(--ag-row-hover-color,rgba(0,0,0,.08)); }
.lgr-rich-select-option.lgr-rich-select-active { outline:1px solid var(--ag-focus-shadow-color,currentColor); }
`;
