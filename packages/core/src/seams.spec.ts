import { describe, it, expect, expectTypeOf } from 'vitest';
import * as ag from 'ag-grid-community';
import type {
  Module,
  BeanCollection,
  NamedBean,
  _ModuleWithApi,
  _IRowNodeGroupStage,
  _IRowNodeAggregationStage,
  _IRowNodePivotStage,
  _IRowNodeFlattenStage,
  _RowGroupingGridApi,
  _ServerSideRowModelGridApi,
} from 'ag-grid-community';

/**
 * TASK 0.8 — SEAM VERIFICATION (permanent regression test).
 *
 * The entire LibreGrid strategy rests on one line in Community's source:
 *   src/main.ts:1216  ->  export * from './main-internal';
 *
 * That re-export is what makes BeanStub, the _IRowNode*Stage interfaces and
 * the _*GridApi slice types reachable from the published npm package. All of
 * it is marked `@internal AG_GRID_INTERNAL - Not for public use. Can change /
 * be removed at any time.` (guardrail G5).
 *
 * This test is the tripwire. If it fails after an ag-grid-community upgrade,
 * STOP — do not work around it, do not patch node_modules. Report and re-plan.
 */
describe('G5 seam verification — ag-grid-community public surface', () => {
  describe('runtime exports', () => {
    const REQUIRED = [
      'ModuleRegistry',
      'createGrid',
      'AllCommunityModule',
      'BeanStub',
      'Component',
      'createTheme',
      'themeQuartz',
      'themeAlpine',
      'themeBalham',
      'themeMaterial',
      'styleMaterial',
      '_getClientSideRowModel',
      '_getServerSideRowModel',
      '_getViewportRowModel',
      '_warnOnce',
      '_consoleError',
      '_EmptyBean',
      '_ChangedRowNodes',
    ] as const;

    it.each(REQUIRED)('exports %s', (name) => {
      expect(
        (ag as unknown as Record<string, unknown>)[name],
        `'${name}' is missing from ag-grid-community. See docs/reference/api-seams.md §1.`,
      ).toBeDefined();
    });

    it('ModuleRegistry.registerModules is callable', () => {
      expect(typeof ag.ModuleRegistry.registerModules).toBe('function');
    });

    it('BeanStub exposes the documented lifecycle members', () => {
      const proto = ag.BeanStub.prototype as unknown as Record<string, unknown>;
      for (const m of [
        'preWireBeans',
        'addManagedPropertyListener',
        'addManagedEventListeners',
        'addDestroyFunc',
        'destroy',
      ]) {
        expect(typeof proto[m], `BeanStub.${m}`).toBe('function');
      }
    });
  });

  describe('type-only exports', () => {
    it('module and bean types resolve', () => {
      expectTypeOf<Module>().toBeObject();
      expectTypeOf<BeanCollection>().toBeObject();
      expectTypeOf<NamedBean>().toBeObject();
      expectTypeOf<_ModuleWithApi<_RowGroupingGridApi>>().toBeObject();
      expectTypeOf<_ServerSideRowModelGridApi>().toBeObject();
    });

    it('CSRM stage slots exist on BeanCollection and are all optional', () => {
      // If any of these became required, `{}` would stop type-checking.
      const slots: Pick<
        BeanCollection,
        | 'groupStage'
        | 'aggStage'
        | 'pivotStage'
        | 'filterAggStage'
        | 'flattenStage'
        | 'groupFilterStage'
        | 'groupSortStage'
      > = {};
      expect(slots).toEqual({});
      expectTypeOf<_IRowNodeGroupStage>().toBeObject();
      expectTypeOf<_IRowNodeAggregationStage>().toBeObject();
      expectTypeOf<_IRowNodePivotStage>().toBeObject();
      expectTypeOf<_IRowNodeFlattenStage>().toBeObject();
    });

    it('ModuleName is a closed union that accepts Enterprise literals', () => {
      const names: Module['moduleName'][] = [
        'EnterpriseCore',
        'RowGrouping',
        'Pivot',
        'TreeData',
        'MasterDetail',
        'Clipboard',
        'ExcelExport',
        'SideBar',
        'ColumnsToolPanel',
        'FiltersToolPanel',
        'CellSelection',
        'SetFilter',
        'MultiFilter',
        'AdvancedFilter',
        'IntegratedCharts',
        'StatusBar',
        'RichSelect',
        'ContextMenu',
        'ColumnMenu',
        'ServerSideRowModel',
        'ViewportRowModel',
        'Find',
      ];
      expect(names.length).toBe(22);

      // @ts-expect-error - invented names must be rejected (api-seams.md §3).
      const invalid: Module['moduleName'] = 'TotallyMadeUpModule';
      expect(invalid).toBe('TotallyMadeUpModule');
    });
  });

  describe('version sourcing', () => {
    it('VERSION is NOT exported — must be generated (standards.md §5)', () => {
      expect((ag as unknown as Record<string, unknown>)['VERSION']).toBeUndefined();
    });

    it('version is readable from a community module object', () => {
      expect(ag.AllCommunityModule.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });
});
