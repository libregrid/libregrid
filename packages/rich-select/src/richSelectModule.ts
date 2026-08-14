import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RichSelectCellEditor } from './richSelectCellEditor';
import { richSelectCss } from './richSelectCss';
import { VERSION } from './version';
/** Registers the virtualised, keyboard-operable rich select editor. @feature Rich Select */
export const RichSelectModule: Module = { moduleName: 'RichSelect', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule], userComponents: { agRichSelectCellEditor: RichSelectCellEditor, agRichSelect: RichSelectCellEditor }, css: [richSelectCss] };
