import { AgCharts, AgChartsCommunityModule } from 'ag-charts-community';
import type { AgChartInstance, AgSparklineOptions } from 'ag-charts-types';
import type { ICellRendererComp, ISparklineCellRendererParams } from 'ag-grid-community';

type Params = ISparklineCellRendererParams & { value?: unknown; valueFormatted?: string | null };

/** DOM-owned renderer; grid virtualisation calls destroy as rows leave the viewport. */
export class SparklineCellRenderer implements ICellRendererComp {
  private static configured = false;
  private readonly gui = document.createElement('div');
  private chart: AgChartInstance<AgSparklineOptions> | undefined;
  private params: Params | undefined;

  public init(params: Params): void { this.params = params; this.gui.className = 'lgr-sparkline'; this.gui.setAttribute('role', 'img'); this.render(); }
  public getGui(): HTMLElement { return this.gui; }
  public refresh(params: Params): boolean { this.params = params; this.destroyChart(); this.render(); return true; }
  public destroy(): void { this.destroyChart(); this.gui.replaceChildren(); }

  private render(): void {
    const params = this.params; if (!params) return;
    const input = Array.isArray(params.value) ? params.value : [];
    const options = { ...(params.sparklineOptions ?? {}), type: params.sparklineOptions?.type ?? 'line', container: this.gui, data: input } as AgSparklineOptions;
    this.gui.setAttribute('aria-label', `Sparkline with ${input.length} values`);
    if (params.createSparkline) this.chart = params.createSparkline(options);
    else {
      if (!SparklineCellRenderer.configured) { AgChartsCommunityModule.setup(); SparklineCellRenderer.configured = true; }
      this.chart = AgCharts.__createSparkline(options);
    }
  }
  private destroyChart(): void { this.chart?.destroy(); this.chart = undefined; }
}
