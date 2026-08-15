import {
  AllCommunityModule,
  type ColDef,
  type ColGroupDef,
  type GridOptions,
  type Module,
} from 'ag-grid-community';

/**
 * Typed identity helper for a {@link GridOptions} literal.
 *
 * ```ts
 * const options = defineGridOptions<Row>({
 *   columnDefs: createColumnDefs<Row>([{ field: 'name' }]),
 * });
 * ```
 *
 * @feature Angular integration
 */
export function defineGridOptions<TData>(options: GridOptions<TData>): GridOptions<TData> {
  return options;
}

/**
 * Typed identity helper for a column-definition array literal.
 *
 * @feature Angular integration
 */
export function createColumnDefs<TData>(
  defs: (ColDef<TData> | ColGroupDef<TData>)[],
): (ColDef<TData> | ColGroupDef<TData>)[] {
  return defs;
}

/**
 * Returns {@link AllCommunityModule} followed by the given LibreGrid modules,
 * ready for `ModuleRegistry.registerModules(...)`.
 *
 * @feature Angular integration
 */
export function withCommunityModules(...modules: Module[]): Module[] {
  return [AllCommunityModule, ...modules];
}
