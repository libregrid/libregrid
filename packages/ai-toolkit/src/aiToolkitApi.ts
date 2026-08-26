import type {
  AgColumn,
  BaseCellDataType,
  BeanCollection,
  ColDef,
  IFilterOptionDef,
  StructuredSchemaParams,
} from 'ag-grid-community';
import {
  buildStructuredSchema,
  type ColumnFilterCapability,
  type SimpleFilterOperatorCapability,
  type StructuredColumnCapability,
  type StructuredColumnDataType,
  type StructuredSchemaInput,
} from './structuredSchema';

const BUILTIN_OPERATORS = {
  bigint: ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'inRange', 'blank', 'notBlank'],
  date: ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'inRange', 'blank', 'notBlank'],
  number: ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'inRange', 'blank', 'notBlank'],
  text: ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith', 'blank', 'notBlank'],
} as const;

const DATE_PRESETS = new Set<string>([
  'today', 'yesterday', 'tomorrow', 'thisWeek', 'lastWeek', 'nextWeek', 'thisMonth', 'lastMonth', 'nextMonth',
  'thisQuarter', 'lastQuarter', 'nextQuarter', 'thisYear', 'lastYear', 'nextYear', 'yearToDate', 'last7Days',
  'last30Days', 'last90Days', 'last6Months', 'last12Months', 'last24Months',
]);

type SimpleFilterType = 'bigint' | 'date' | 'number' | 'text';

interface SimpleFilterParamsLike {
  filterOptions?: (IFilterOptionDef | string)[];
  maxNumConditions?: number;
  useIsoSeparator?: boolean;
  values?: unknown[];
}

interface SetFilterHandlerLike {
  getFilterKeys(): (string | null)[];
}

function uniqueSetKeys(values: readonly (string | null)[]): (string | null)[] {
  return [...new Set(values.filter((value) => value !== null && value !== ''))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function baseDataType(beans: BeanCollection, column: AgColumn): StructuredColumnDataType {
  const resolved = beans.dataTypeSvc?.getBaseDataType(column);
  if (resolved) return resolved;
  const configured = column.getColDef().cellDataType;
  if (typeof configured === 'string' && isBaseDataType(configured)) return configured;
  return 'object';
}

function isBaseDataType(value: string): value is BaseCellDataType {
  return ['text', 'number', 'bigint', 'boolean', 'date', 'dateString', 'dateTime', 'dateTimeString', 'object'].includes(value);
}

function filterTypeFromName(name: string): SimpleFilterType | 'set' | undefined {
  if (name === 'agSetColumnFilter' || name === 'set') return 'set';
  if (name === 'agTextColumnFilter' || name === 'text') return 'text';
  if (name === 'agNumberColumnFilter' || name === 'number') return 'number';
  if (name === 'agBigIntColumnFilter' || name === 'bigint') return 'bigint';
  if (name === 'agDateColumnFilter' || name === 'date') return 'date';
  return undefined;
}

function operatorInputs(key: string, configured?: 0 | 1 | 2): 0 | 1 | 2 {
  if (configured !== undefined) return configured;
  if (key === 'blank' || key === 'notBlank' || DATE_PRESETS.has(key)) return 0;
  if (key === 'inRange') return 2;
  return 1;
}

function filterParams(colDef: ColDef): SimpleFilterParamsLike | undefined {
  return isRecord(colDef.filterParams) ? colDef.filterParams as SimpleFilterParamsLike : undefined;
}

function simpleOperators(type: SimpleFilterType, params: SimpleFilterParamsLike | undefined): SimpleFilterOperatorCapability[] {
  const configured = params?.filterOptions;
  if (!configured || configured.length === 0) {
    return BUILTIN_OPERATORS[type].map((key) => ({ key, inputs: operatorInputs(key) }));
  }
  const result: SimpleFilterOperatorCapability[] = [];
  const builtins = new Set<string>(BUILTIN_OPERATORS[type]);
  for (const option of configured) {
    if (typeof option === 'string') {
      const supported = builtins.has(option) || (type === 'date' && DATE_PRESETS.has(option));
      if (option !== 'empty' && supported) result.push({ key: option, inputs: operatorInputs(option) });
    }
  }
  return result;
}

function setValues(beans: BeanCollection, column: AgColumn, include: boolean): (string | null)[] | undefined {
  if (!include) return undefined;
  const handler = beans.colFilter?.getHandler(column, true);
  if (isRecord(handler) && typeof handler.getFilterKeys === 'function') {
    const values = (handler as unknown as SetFilterHandlerLike).getFilterKeys();
    if (Array.isArray(values)) return uniqueSetKeys(values);
  }
  const configured = filterParams(column.getColDef())?.values;
  if (!Array.isArray(configured)) return undefined;
  return uniqueSetKeys(configured.flatMap((value) => {
    if (value === null || value === undefined || value === '') return [];
    return ['string', 'number', 'boolean'].includes(typeof value) ? [String(value)] : [];
  }));
}

function filterCapability(
  beans: BeanCollection,
  column: AgColumn,
  params?: StructuredSchemaParams,
): ColumnFilterCapability | undefined {
  if (!beans.colFilter || !column.isFilterAllowed()) return undefined;
  const colDef = column.getColDef();
  const configuredFilter = colDef.filter as unknown;
  const configuredName = typeof configuredFilter === 'string'
    ? configuredFilter
    : configuredFilter === true
      ? beans.colFilter.getDefaultFilter(column)
      : isRecord(configuredFilter)
        ? typeof configuredFilter.component === 'string'
          ? configuredFilter.component
          : configuredFilter.component === true
            ? beans.colFilter.getDefaultFilter(column)
            : undefined
        : undefined;
  if (!configuredName) return undefined;
  const type = filterTypeFromName(configuredName);
  if (!type) return undefined;
  if (type === 'set') {
    const values = setValues(beans, column, params?.columns?.[column.getColId()]?.includeSetValues === true);
    return values ? { kind: 'set', values } : { kind: 'set' };
  }
  const simpleParams = filterParams(colDef);
  const configuredMax = simpleParams?.maxNumConditions;
  const maxNumConditions = Number.isInteger(configuredMax) && configuredMax && configuredMax > 0
    ? configuredMax
    : 2;
  const operators = simpleOperators(type, simpleParams);
  if (operators.length === 0) return undefined;
  return {
    kind: 'simple',
    filterType: type,
    maxNumConditions,
    operators,
    ...(type === 'date' && simpleParams?.useIsoSeparator === true ? { useIsoSeparator: true } : {}),
  };
}

function columnCapability(
  beans: BeanCollection,
  column: AgColumn,
  params?: StructuredSchemaParams,
): StructuredColumnCapability {
  const colDef = column.getColDef();
  const dataType = baseDataType(beans, column);
  const headerName = colDef.headerName ?? (typeof colDef.field === 'string' ? colDef.field : undefined);
  const result: StructuredColumnCapability = {
    aggregationFunctions: column.isAllowValue() ? beans.aggFuncSvc?.getFuncNames(column) ?? [] : [],
    colId: column.getColId(),
    dataType,
    pivotable: column.isAllowPivot(),
    resizable: column.isResizable(),
    rowGroupable: column.isAllowRowGroup(),
    sortable: Boolean(beans.sortSvc && column.isSortable()),
  };
  if (headerName !== undefined) result.headerName = headerName;
  const filter = filterCapability(beans, column, params);
  if (filter) result.filter = filter;
  return result;
}

/**
 * AG Grid's `getStructuredSchema` API implementation. It snapshots only live
 * column metadata and feature capability; no row values or provider concerns
 * enter the pure schema package.
 */
export function getStructuredSchema(beans: BeanCollection, params?: StructuredSchemaParams): Record<string, unknown> {
  if (!beans.colModel) throw new Error('ai-toolkit: colModel bean missing');
  const advancedFilterEnabled = beans.advancedFilter?.isEnabled() ?? false;
  const columns = beans.colModel.getCols().map((column) => columnCapability(beans, column, params));
  if (advancedFilterEnabled && !beans.dataTypeSvc) {
    for (const column of columns) delete column.filter;
  }
  const input: StructuredSchemaInput = {
    advancedFilterEnabled,
    columns,
  };
  return buildStructuredSchema(input, params) as Record<string, unknown>;
}
