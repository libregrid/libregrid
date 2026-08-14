export const multiFilterCss = `
.lgr-multi-filter { display: grid; gap: 8px; padding: 8px; color: var(--ag-foreground-color); background: var(--ag-background-color); }
.lgr-multi-filter-child { border: 1px solid var(--ag-border-color); border-radius: 4px; }
.lgr-multi-filter-child > button, .lgr-multi-filter-child > summary { padding: 8px; font-weight: 600; cursor: pointer; }
.lgr-multi-filter-subMenu > :not(button) { display: none; }
.lgr-multi-filter-subMenu.lgr-multi-filter-submenu-open > :not(button) { display: block; }
`;
