import { describe, expect, it } from 'vitest';
import {
  AdvancedFilterModule,
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  EnterpriseCoreModule,
  FiltersToolPanelModule,
  FindModule,
  IntegratedChartsModule,
  MasterDetailModule,
  MultiFilterModule,
  PivotModule,
  RichSelectModule,
  RowGroupingModule,
  RowGroupingPanelModule,
  ServerSideRowModelModule,
  SetFilterModule,
  SideBarModule,
  SparklinesModule,
  StatusBarModule,
  TreeDataModule,
  ViewportRowModelModule,
  defineGridOptions,
  provideLibreGrid,
} from './index';

describe('@libregrid/all', () => {
  it('re-exports every feature module', () => {
    const modules = [
      EnterpriseCoreModule,
      ContextMenuModule,
      ColumnMenuModule,
      SideBarModule,
      RowGroupingModule,
      ColumnsToolPanelModule,
      RowGroupingPanelModule,
      CellSelectionModule,
      ClipboardModule,
      StatusBarModule,
      SetFilterModule,
      MultiFilterModule,
      FiltersToolPanelModule,
      ServerSideRowModelModule,
      PivotModule,
      ViewportRowModelModule,
      TreeDataModule,
      MasterDetailModule,
      AdvancedFilterModule,
      FindModule,
      RichSelectModule,
      IntegratedChartsModule,
      SparklinesModule,
    ];
    for (const module of modules) {
      expect(module.moduleName).toBeTypeOf('string');
    }
    expect(new Set(modules.map((m) => m.moduleName)).size).toBe(modules.length);
  });

  it('re-exports the Angular ergonomics surface', () => {
    expect(typeof provideLibreGrid).toBe('function');
    expect(defineGridOptions({ rowData: [] })).toEqual({ rowData: [] });
  });
});
