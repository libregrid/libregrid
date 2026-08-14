import { BeanStub, type ChartType, type NamedBean, type SeriesChartType } from 'ag-grid-community';
import { AgChartsCommunityProvider, type ChartProvider } from './chartProvider';
import { chartOptionsFor, type ChartDataSet } from './chartTranslation';

/** Reserved Community seam exposing the bundled MIT chart-engine adapter. */
export class AgChartsExports extends BeanStub implements NamedBean {
  public beanName = 'agChartsExports' as const;
  public provider(): ChartProvider { return new AgChartsCommunityProvider(); }
}

/** Reserved proxy seam, keeping per-chart-type option selection out of the service. */
export class EnterpriseChartProxyFactory extends BeanStub implements NamedBean {
  public beanName = 'enterpriseChartProxyFactory' as const;
  public create(chartType: ChartType, data: ChartDataSet, seriesChartTypes?: SeriesChartType[]) { return chartOptionsFor(chartType, data, seriesChartTypes); }
}

/** Reserved translation seam for consumers that want to inspect range-derived chart data. */
export class ChartTranslation extends BeanStub implements NamedBean {
  public beanName = 'chartTranslation' as const;
  public translate(chartType: ChartType, data: ChartDataSet, seriesChartTypes?: SeriesChartType[]) { return chartOptionsFor(chartType, data, seriesChartTypes); }
}

type ToolbarItem = 'chartLink' | 'chartUnlink' | 'chartDownload' | 'chartMenu';
/** Menu seams retain the documented toolbar-customisation callback. */
export class ChartMenuListFactory extends BeanStub implements NamedBean {
  public beanName = 'chartMenuListFactory' as const;
  public getItems(_chartId: string): ToolbarItem[] {
    const defaults: ToolbarItem[] = ['chartMenu', 'chartUnlink', 'chartDownload'];
    const callback = this.gos.get('getChartToolbarItems');
    const selected = typeof callback === 'function' ? callback({ defaultItems: defaults } as never) : defaults;
    return Array.isArray(selected) ? selected.filter((item): item is ToolbarItem => typeof item === 'string' && defaults.includes(item as ToolbarItem)) : defaults;
  }
}
export class ChartMenuItemMapper extends BeanStub implements NamedBean { public beanName = 'chartMenuItemMapper' as const; }
export class ChartMenuService extends BeanStub implements NamedBean { public beanName = 'chartMenuSvc' as const; }
