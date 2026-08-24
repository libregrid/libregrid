import type { BeanCollection, StructuredSchemaParams } from 'ag-grid-community';
import { buildStructuredSchema, type AiColumnInfo, type StructuredSchemaInput } from './structuredSchema';

interface ColumnLike {
  getColId(): string;
  getColDef(): { headerName?: string; field?: string; filter?: unknown };
}

interface ColModelLike {
  getCols(): ColumnLike[];
}

interface FilterManagerLike {
  getFilterModel(): Record<string, unknown> | null;
}

/**
 * The `getStructuredSchema` GridApi function (Community's reserved slot).
 * Builds the JSON schema of the grid state from the live column model and
 * current filter values — no row data ever enters the schema.
 */
export function getStructuredSchema(beans: BeanCollection, params?: StructuredSchemaParams): Record<string, unknown> {
  const colModel = (beans as unknown as { colModel?: ColModelLike }).colModel;
  if (!colModel) throw new Error('ai-toolkit: colModel bean missing');
  const filterManager = (beans as unknown as { filterManager?: FilterManagerLike }).filterManager;

  const columns: AiColumnInfo[] = colModel.getCols().map((col) => {
    const colDef = col.getColDef();
    const headerName = colDef.headerName ?? (typeof colDef.field === 'string' ? colDef.field : undefined);
    const info: AiColumnInfo = { colId: col.getColId(), filterable: colDef.filter !== false };
    if (headerName !== undefined) info.headerName = headerName;
    return info;
  });

  const input: StructuredSchemaInput = { columns, currentFilterModel: filterManager?.getFilterModel() ?? null };
  return buildStructuredSchema(input, params);
}
