import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SideBarModule } from '@libregrid/side-bar';
import { FiltersToolPanelFactory } from './filtersToolPanelFactory';
import { FiltersToolPanel } from './filtersToolPanel';
import { SelectableFilter } from './selectableFilter';
import { filtersToolPanelCss } from './filtersToolPanelCss';
import { selectableFilterCss } from './selectableFilterCss';
import { VERSION } from './version';

export const FiltersToolPanelModule: Module = {
  moduleName: 'FiltersToolPanel',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule, SideBarModule],
  beans: [FiltersToolPanelFactory],
  userComponents: {
    agFiltersToolPanel: FiltersToolPanel,
    agNewFiltersToolPanel: FiltersToolPanel,
    agSelectableColumnFilter: SelectableFilter,
  } as unknown as NonNullable<Module['userComponents']>,
  css: [filtersToolPanelCss, selectableFilterCss],
};
