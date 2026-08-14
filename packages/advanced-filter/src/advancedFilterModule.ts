import type { AdvancedFilterModel, BeanCollection, IAdvancedFilterService, _AdvancedFilterGridApi, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { AdvancedFilterService } from './advancedFilterService';
import { AdvancedFilterExpressionService } from './advancedFilterExpressionService';
import { AdvancedSettingsMenuFactory } from './advancedSettingsMenuFactory';
import { advancedFilterCss } from './advancedFilterCss';
import { VERSION } from './version';

function advanced(beans: BeanCollection): IAdvancedFilterService | undefined { return beans.advancedFilter; }
function getAdvancedFilterModel(beans: BeanCollection): AdvancedFilterModel | null { return advanced(beans)?.getModel() ?? null; }
function setAdvancedFilterModel(beans: BeanCollection, model: AdvancedFilterModel | null): void { beans.filterManager?.setAdvFilterModel(model, 'api'); }
function showAdvancedFilterBuilder(beans: BeanCollection): void { beans.filterManager?.toggleAdvFilterBuilder(true, 'api'); }
function hideAdvancedFilterBuilder(beans: BeanCollection): void { beans.filterManager?.toggleAdvFilterBuilder(false, 'api'); }

/** Registers expression parsing, filtering, and the accessible builder UI. @feature Advanced Filter */
export const AdvancedFilterModule: _ModuleWithApi<_AdvancedFilterGridApi> = {
  moduleName: 'AdvancedFilter', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule], beans: [AdvancedFilterExpressionService, AdvancedSettingsMenuFactory, AdvancedFilterService], css: [advancedFilterCss],
  apiFunctions: { getAdvancedFilterModel, setAdvancedFilterModel, showAdvancedFilterBuilder, hideAdvancedFilterBuilder },
};
