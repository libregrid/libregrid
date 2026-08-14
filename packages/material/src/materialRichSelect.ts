import { RichSelectCellEditor } from '@libregrid/rich-select';

/** Material-theme adapter for the framework-neutral rich-select editor. */
export class MaterialRichSelectCellEditor<TData = unknown, TValue = unknown> extends RichSelectCellEditor<TData, TValue> {}

/** Provides the Material editor under the standard AG Grid component name. */
export function installMaterialRichSelectCellEditor(options: { components?: Record<string, unknown> }): void {
  options.components = { ...options.components, agRichSelectCellEditor: MaterialRichSelectCellEditor };
}
