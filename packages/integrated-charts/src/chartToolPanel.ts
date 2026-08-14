import type { ChartType } from 'ag-grid-community';

export interface ChartPanelUpdate { chartType?: ChartType; switchCategorySeries?: boolean; chartThemeName?: string; }

/** Small, native-control tool panel. Material themes style these standard controls consistently. */
export class ChartToolPanel {
  private readonly gui = document.createElement('section');
  public constructor(
    chartId: string,
    chartType: ChartType,
    private readonly update: (change: ChartPanelUpdate) => void,
    close: () => void,
  ) {
    this.gui.className = 'lgr-chart-tool-panel'; this.gui.dataset['chartId'] = chartId; this.gui.setAttribute('role', 'dialog'); this.gui.setAttribute('aria-label', 'Chart configuration');
    const title = document.createElement('h2'); title.textContent = 'Chart configuration';
    const type = document.createElement('select'); type.setAttribute('aria-label', 'Chart type');
    for (const value of ['groupedColumn', 'groupedBar', 'line', 'area', 'stackedArea', 'stackedColumn', 'pie', 'columnLineCombo', 'areaColumnCombo', 'customCombo'] as ChartType[]) {
      const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = value === chartType; type.append(option);
    }
    type.addEventListener('change', () => this.update({ chartType: type.value as ChartType }));
    const data = document.createElement('label'); const switchSeries = document.createElement('input'); switchSeries.type = 'checkbox'; switchSeries.setAttribute('aria-label', 'Switch category and series'); switchSeries.addEventListener('change', () => this.update({ switchCategorySeries: switchSeries.checked })); data.append(switchSeries, ' Switch category and series');
    const format = document.createElement('label'); format.textContent = 'Theme '; const theme = document.createElement('select'); theme.setAttribute('aria-label', 'Chart theme'); for (const value of ['ag-default', 'ag-material', 'ag-vivid']) { const option = document.createElement('option'); option.value = value; option.textContent = value; theme.append(option); } theme.addEventListener('change', () => this.update({ chartThemeName: theme.value })); format.append(theme);
    const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.textContent = 'Close'; closeButton.addEventListener('click', close);
    this.gui.append(title, type, data, format, closeButton);
  }
  public getGui(): HTMLElement { return this.gui; }
  public destroy(): void { this.gui.remove(); }
}
