import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import {
  NeedleWasmProvider,
  buildGridTools,
  validateToolCall,
  toolCallToStatePatch,
  runToolkit,
  type AiColumnInfo,
} from '@libregrid/ai-toolkit';

interface Row {
  product: string;
  revenue: number;
  region: string;
  units: number;
}

const COLUMNS: AiColumnInfo[] = [
  { colId: 'product', headerName: 'Product', filterable: true },
  { colId: 'revenue', headerName: 'Revenue', filterable: true },
  { colId: 'region', headerName: 'Region', filterable: true },
  { colId: 'units', headerName: 'Units', filterable: true },
];

const SUGGESTIONS = ['Hide the region column', 'Sort by revenue, highest first', 'Show every column and clear the sort'];

/** The editable request shape sent to the model (the "configuration file"). */
interface ToolkitConfig {
  /** System turn — what the model knows about this grid. */
  context: string;
  /** Columns the call is validated against — edit these and validation follows. */
  columns: AiColumnInfo[];
  /** Tool catalogue in standard function-schema form. */
  tools: Record<string, unknown>[];
  maxNewTokens?: number;
  threshold?: number;
}

const DEFAULT_CONFIG: ToolkitConfig = {
  context: `Grid columns:\n${COLUMNS.map((c) => `${c.colId}: ${c.headerName}`).join('\n')}`,
  columns: COLUMNS,
  tools: buildGridTools(COLUMNS),
  maxNewTokens: 256,
  threshold: 0.5,
};

const DEFAULT_CONFIG_JSON = JSON.stringify(DEFAULT_CONFIG, null, 2);

function parseConfig(raw: string): ToolkitConfig {
  const parsed = JSON.parse(raw) as Partial<ToolkitConfig>;
  if (typeof parsed.context !== 'string') throw new Error('"context" must be a string');
  if (!Array.isArray(parsed.tools)) throw new Error('"tools" must be an array of tool schemas');
  for (const tool of parsed.tools) {
    if (typeof (tool as Record<string, unknown> | undefined)?.name !== 'string') {
      throw new Error('every tool needs a "name" string');
    }
  }
  if (!Array.isArray(parsed.columns)) throw new Error('"columns" must be an array of column info');
  for (const column of parsed.columns) {
    if (typeof (column as Partial<AiColumnInfo> | undefined)?.colId !== 'string') {
      throw new Error('every column needs a "colId" string');
    }
  }
  const config: ToolkitConfig = { context: parsed.context, columns: parsed.columns, tools: parsed.tools };
  if (typeof parsed.maxNewTokens === 'number') config.maxNewTokens = parsed.maxNewTokens;
  if (typeof parsed.threshold === 'number') config.threshold = parsed.threshold;
  return config;
}

function makeRows(): Row[] {
  const products: [string, number, string, number][] = [
    ['Widget', 4200, 'Europe', 31],
    ['Gadget', 7800, 'Asia', 52],
    ['Gizmo', 2300, 'Americas', 18],
    ['Doohickey', 6100, 'Europe', 44],
    ['Thingamajig', 950, 'Asia', 9],
  ];
  return products.map(([product, revenue, region, units]) => ({ product, revenue, region, units }));
}

@Component({
  selector: 'lgr-ai-toolkit-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  styles: `
    .lgr-ai-input {
      width: 100%;
      padding: 8px 12px;
      margin: 8px 0;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .lgr-ai-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 8px 0 16px;
    }
    .lgr-ai-chip {
      padding: 4px 12px;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 16px;
      background: transparent;
      color: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .lgr-ai-log {
      margin: 8px 0 24px;
      max-height: 240px;
      overflow-y: auto;
      padding-left: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: light-dark(#3d3d3d, #e0e0e0);
      word-break: break-word;
    }
    .lgr-ai-log-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .lgr-ai-chip:disabled {
      cursor: default;
      opacity: 0.5;
    }
    .lgr-ai-log-empty {
      list-style: none;
      margin-left: -20px;
      font-style: italic;
      color: light-dark(#5a5759, #b8b5b9);
    }
    .lgr-ai-hint {
      margin: 8px 0;
      color: light-dark(#5a5759, #b8b5b9);
    }
    .lgr-ai-config {
      width: 100%;
      padding: 8px 12px;
      margin: 8px 0;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      resize: vertical;
    }
    /* Explicit colours in both themes: webkit's UA default button rendering
       fails WCAG contrast in dark mode (#fff on #c0c0c0 ≈ 1.8:1). */
    .lgr-ai-ask {
      padding: 6px 16px;
      border: none;
      border-radius: 4px;
      background: light-dark(#3d3d3d, #e0e0e0);
      color: light-dark(#ffffff, #3d3d3d);
      font: inherit;
      cursor: pointer;
    }
    .lgr-ai-ask:disabled {
      cursor: default;
    }
  `,
  template: `
    <div class="lgr-page">
      <h1>AI Toolkit</h1>
      <p>
        Natural-language control of grid state, inferred <strong>locally in the
        browser</strong> by a 45M-parameter Needle model running on WebAssembly
        (ADR 0006). Your prompt, the schema and the inference stay on this page —
        the only network request is the one-time model download from the pinned
        Hugging Face URL. Type a request or pick a suggestion — below the
        confidence threshold the toolkit asks for clarification instead of
        guessing.
      </p>
      <ag-grid-angular
        [theme]="theme.gridTheme()"
        [gridOptions]="gridOptions"
        class="ag-theme-quartz"
        style="height: 320px; width: 100%"
        data-testid="ai-toolkit-grid"
      />
      <h2>Model configuration</h2>
      <p class="lgr-ai-hint">
        The exact request shape sent to the model — system turn, tool catalogue, token budget and
        confidence gate. Edit it, then reload.
      </p>
      <textarea
        class="lgr-ai-config"
        data-testid="ai-config"
        aria-label="Model configuration JSON"
        rows="14"
        [value]="configText()"
        (input)="onConfigInput($event)"
      ></textarea>
      <button type="button" class="lgr-ai-chip" data-testid="ai-reload-config" (click)="reloadConfig()">
        Reload configuration
      </button>
      <h2>Ask the grid</h2>
      <input
        class="lgr-ai-input"
        data-testid="ai-prompt"
        aria-label="Ask the grid"
        [value]="prompt()"
        (input)="onPromptInput($event)"
        placeholder="e.g. Hide the region column"
      />
      <div class="lgr-ai-chips">
        @for (suggestion of SUGGESTIONS; track suggestion) {
          <button type="button" class="lgr-ai-chip" [disabled]="busy()" (click)="ask(suggestion)">{{ suggestion }}</button>
        }
      </div>
      <button type="button" class="lgr-ai-ask" data-testid="ai-ask" [disabled]="busy()" (click)="ask(prompt())">Ask</button>
      <span role="status" aria-live="polite" data-testid="ai-busy">{{ busy() ? busyLabel() : '' }}</span>
      <div class="lgr-ai-log-head">
        <h2>Log</h2>
        <button type="button" class="lgr-ai-chip" data-testid="ai-clear-log" [disabled]="log().length === 0" (click)="clearLog()">
          Clear log
        </button>
      </div>
      <!-- The log is where the answer appears, so it has to be announced. -->
      <div role="status" aria-live="polite">
        @if (log().length === 0) {
          <ul class="lgr-ai-log lgr-ai-log-empty"><li>No requests yet.</li></ul>
        } @else {
          <ul class="lgr-ai-log">
            @for (entry of log(); track $index) {
              <li data-testid="ai-log-item">{{ entry }}</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class AiToolkitDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly SUGGESTIONS = SUGGESTIONS;
  protected readonly prompt = signal('');
  protected readonly busy = signal(false);
  protected readonly busyLabel = signal('Thinking…');
  protected readonly configText = signal(DEFAULT_CONFIG_JSON);
  protected readonly config = signal<ToolkitConfig>(DEFAULT_CONFIG);
  protected readonly log = signal<string[]>([]);

  protected gridOptions: GridOptions<Row> = {
    // `agSetColumnFilter` is required, not decorative: `setFilters` emits a
    // `filterType: 'set'` model, which any other filter silently discards.
    columnDefs: [
      { field: 'product', headerName: 'Product', filter: 'agSetColumnFilter' },
      { field: 'revenue', headerName: 'Revenue', cellDataType: 'number', filter: 'agSetColumnFilter' },
      { field: 'region', headerName: 'Region', filter: 'agSetColumnFilter' },
      { field: 'units', headerName: 'Units', cellDataType: 'number', filter: 'agSetColumnFilter' },
    ],
    rowData: makeRows(),
    onGridReady: (params) => {
      this.api = params.api;
    },
  };

  private api: GridApi<Row> | undefined;
  // One provider per page; the engine re-initialises automatically when the
  // configuration's context or tools change.
  private provider: NeedleWasmProvider | undefined;

  protected onPromptInput(event: Event): void {
    this.prompt.set((event.target as HTMLInputElement).value);
  }

  protected onConfigInput(event: Event): void {
    this.configText.set((event.target as HTMLTextAreaElement).value);
  }

  /** Parse the configuration box and apply it; invalid JSON is logged, not thrown. */
  protected reloadConfig(): void {
    try {
      const config = parseConfig(this.configText());
      this.config.set(config);
      this.pushLog(`config reloaded (threshold ${config.threshold ?? 'default'}, maxNewTokens ${config.maxNewTokens ?? 'default'})`);
    } catch (error) {
      this.pushLog(`config invalid: ${(error as Error).message}`);
    }
  }

  protected async ask(rawPrompt?: string): Promise<void> {
    const prompt = (rawPrompt ?? this.prompt()).trim();
    if (!prompt || this.busy()) return;
    this.busy.set(true);
    try {
      const provider = (this.provider ??= new NeedleWasmProvider());
      // Only announce a download when the weights actually come from the
      // network — repeat visits serve them from Cache Storage.
      this.busyLabel.set((await provider.willDownloadWeights()) ? 'Thinking… (downloading the ~14 MB model)' : 'Thinking…');
      const cfg = this.config();
      const outcome = await runToolkit(
        provider,
        {
          prompt,
          context: cfg.context,
          tools: cfg.tools,
          ...(cfg.maxNewTokens !== undefined ? { maxNewTokens: cfg.maxNewTokens } : {}),
        },
        cfg.threshold !== undefined ? { threshold: cfg.threshold } : {},
      );

      // Verbose: the model's entire normalised response — every call, the
      // confidence and the reasoning, not just the selected decision.
      this.pushLog(`model: ${JSON.stringify(outcome.result)}`);

      if (outcome.status === 'clarify') {
        this.pushLog(`clarify: ${outcome.reason}`);
        return;
      }

      const validated = validateToolCall(outcome.call, cfg.columns);
      if (!validated.ok) {
        this.pushLog(`rejected: ${validated.reason}`);
        return;
      }

      // Merge over the live filter model: setState replaces it wholesale, so
      // filtering one column would otherwise clear every other column filter.
      this.api?.setState(toolCallToStatePatch(validated, this.api.getFilterModel()));
      this.pushLog(`applied via ${outcome.via} @ ${outcome.confidence.toFixed(2)}: ${JSON.stringify(outcome.call)}`);
    } catch (error) {
      this.pushLog(`error: ${String(error)}`);
    } finally {
      this.busy.set(false);
    }
  }

  protected clearLog(): void {
    this.log.set([]);
  }

  private pushLog(entry: string): void {
    this.log.update((entries) => [...entries, entry]);
  }
}
