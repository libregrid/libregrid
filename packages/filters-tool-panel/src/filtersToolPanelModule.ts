import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SideBarModule } from '@libregrid/side-bar';
import { FiltersToolPanelFactory } from './filtersToolPanelFactory';
import { FiltersToolPanel } from './filtersToolPanel';
import { filtersToolPanelCss } from './filtersToolPanelCss';
import { VERSION } from './version';

export const FiltersToolPanelModule: Module = { moduleName: 'FiltersToolPanel', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule, SideBarModule], beans: [FiltersToolPanelFactory], userComponents: { agFiltersToolPanel: FiltersToolPanel, agNewFiltersToolPanel: FiltersToolPanel }, css: [filtersToolPanelCss] };
