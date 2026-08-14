import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { sparklineCss } from './sparklineCss';
import { SparklineCellRenderer } from './sparklineCellRenderer';
import { VERSION } from './version';

/** Registers the AG Grid standard `agSparklineCellRenderer` component. @feature Sparklines */
export const SparklinesModule: Module = { moduleName: 'Sparklines', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule], userComponents: { agSparklineCellRenderer: SparklineCellRenderer }, css: [sparklineCss] };
