import { AgCharts, AgChartsCommunityModule } from 'ag-charts-community';

/** The engine seam: applications can replace AG Charts without replacing grid integration. */
export interface ChartProvider {
  create(options: ChartProviderOptions): ChartInstance;
}

export interface ChartProviderOptions {
  container: HTMLElement;
  data: Record<string, unknown>[];
  series: Record<string, unknown>[];
  theme?: unknown;
  themeOverrides?: unknown;
  onDatumClick?: (datum: Record<string, unknown>) => void;
}

export interface ChartInstance {
  update(options: ChartProviderOptions): void;
  destroy(): void;
  getImageDataURL?(fileFormat?: string): string;
  download?(fileName?: string, fileFormat?: string, dimensions?: { width: number; height: number }): void;
}

/** Reference MIT adapter. It is intentionally the only source that imports AG Charts. */
export class AgChartsCommunityProvider implements ChartProvider {
  private static configured = false;

  public constructor() {
    if (!AgChartsCommunityProvider.configured) {
      AgChartsCommunityModule.setup();
      AgChartsCommunityProvider.configured = true;
    }
  }

  public create(options: ChartProviderOptions): ChartInstance {
    const chart = AgCharts.create(toAgOptions(options) as never) as unknown as {
      update(next: unknown): void;
      destroy(): void;
      getImageDataURL?(type?: string): string;
      download?(options?: unknown): void;
    };
    return {
      update: (next) => chart.update(toAgOptions(next)),
      destroy: () => chart.destroy(),
      getImageDataURL: (fileFormat) => chart.getImageDataURL?.(fileFormat) ?? '',
      download: (fileName, fileFormat, dimensions) => chart.download?.({ fileName, fileFormat, width: dimensions?.width, height: dimensions?.height }),
    };
  }
}

function toAgOptions(options: ChartProviderOptions): Record<string, unknown> {
  return {
    container: options.container,
    data: options.data,
    series: options.series.map((series) => ({
      ...series,
      listeners: options.onDatumClick ? { nodeClick: (event: { datum?: Record<string, unknown> }) => event.datum && options.onDatumClick?.(event.datum) } : undefined,
    })),
    theme: options.theme,
    themeOverrides: options.themeOverrides,
    legend: { enabled: true },
  };
}
