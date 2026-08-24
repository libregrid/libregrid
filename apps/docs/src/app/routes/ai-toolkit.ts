import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { applyAiCommand } from '@libregrid/ai-toolkit';
import { buildAiEnvironment, snapshotGrid } from '@libregrid/ai-toolkit/advanced';

interface Row {
  product: string;
  revenue: number;
  region: string;
  units: number;
}

const SUGGESTIONS = [
  'Revenue over 5000',
  'Sort by revenue, highest first',
  'Hide the region column',
  'Reset everything',
];

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
    .lgr-ai-chip:disabled {
      cursor: default;
      opacity: 0.5;
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
    .lgr-ai-env {
      width: 100%;
      max-height: 320px;
      overflow: auto;
      padding: 8px 12px;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .lgr-ai-code {
      display: block;
      margin: 8px 0 24px;
      padding: 12px;
      border-radius: 4px;
      background: light-dark(#f4f2f4, #2a282a);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      white-space: pre;
      overflow-x: auto;
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
        Hugging Face URL.
      </p>
      <p>
        There is no AI configuration on this page, because there is none to write.
        The toolkit reads the live grid — column types, which columns are filterable
        or sortable, which operators each filter supports — and builds the model
        environment itself.
      </p>
      <code class="lgr-ai-code">await applyAiCommand(api, 'Revenue over 5000');</code>
      <ag-grid-angular
        [theme]="theme.gridTheme()"
        [gridOptions]="gridOptions"
        class="ag-theme-quartz"
        style="height: 320px; width: 100%"
        data-testid="ai-toolkit-grid"
      />
      <h2>Ask the grid</h2>
      <input
        class="lgr-ai-input"
        data-testid="ai-prompt"
        aria-label="Ask the grid"
        [value]="prompt()"
        (input)="onPromptInput($event)"
        placeholder="e.g. Revenue over 5000"
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
          <ul class="lgr-ai-log" tabindex="0" role="region" aria-label="Request log">
            @for (entry of log(); track $index) {
              <li data-testid="ai-log-item">{{ entry }}</li>
            }
          </ul>
        }
      </div>
      <h2>What the toolkit sends the model</h2>
      <p class="lgr-ai-hint">
        Generated from the live grid on every request — this is the environment, not a
        setting. Column references (<code>c0</code>, <code>c1</code>) keep the prompt small
        and give the model a stable vocabulary across grids it has never seen.
      </p>
      <button type="button" class="lgr-ai-chip" data-testid="ai-show-env" (click)="refreshEnvironment()">
        Show the current environment
      </button>
      @if (environment(); as env) {
        <!-- tabindex: a scrollable region is unreachable by keyboard without it. -->
        <pre class="lgr-ai-env" data-testid="ai-env" tabindex="0" role="region" aria-label="Generated model environment">{{ env }}</pre>
      }
    </div>
  `,
})
export class AiToolkitDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly SUGGESTIONS = SUGGESTIONS;
  protected readonly prompt = signal('');
  protected readonly busy = signal(false);
  protected readonly busyLabel = signal('Thinking…');
  protected readonly log = signal<string[]>([]);
  protected readonly environment = signal<string | null>(null);

  protected gridOptions: GridOptions<Row> = {
    // Ordinary Community filters. The toolkit reads each column's filter and
    // data type to decide which operators to offer: a number filter gets
    // comparisons and ranges, a text filter gets contains/startsWith.
    columnDefs: [
      { field: 'product', headerName: 'Product', filter: 'agTextColumnFilter' },
      { field: 'revenue', headerName: 'Revenue', cellDataType: 'number', filter: 'agNumberColumnFilter' },
      { field: 'region', headerName: 'Region', filter: 'agTextColumnFilter' },
      { field: 'units', headerName: 'Units', cellDataType: 'number', filter: 'agNumberColumnFilter' },
    ],
    rowData: makeRows(),
    onGridReady: (params) => {
      this.api = params.api;
    },
  };

  private api: GridApi<Row> | undefined;

  protected onPromptInput(event: Event): void {
    this.prompt.set((event.target as HTMLInputElement).value);
  }

  protected async ask(rawPrompt?: string): Promise<void> {
    const prompt = (rawPrompt ?? this.prompt()).trim();
    const api = this.api;
    if (!prompt || !api || this.busy()) return;

    this.busy.set(true);
    this.busyLabel.set('Thinking…');
    try {
      const result = await applyAiCommand(api, prompt, {
        onPlan: (plan) => this.pushLog(`plan: ${JSON.stringify(plan)}`),
      });

      if (result.status === 'applied') {
        this.pushLog(`applied: ${JSON.stringify(result.changes)}`);
      } else {
        // Ambiguous, unsupported, off-topic, invalid and cancelled are ordinary
        // outcomes, not errors — the toolkit says so rather than guessing.
        this.pushLog(`${result.reason}: ${result.message}`);
      }
    } catch (error) {
      // Only operational failures reach here, such as the model failing to load.
      this.pushLog(`error: ${String(error)}`);
    } finally {
      this.busy.set(false);
      if (this.environment() !== null) this.refreshEnvironment();
    }
  }

  /** Show the exact context and tools the toolkit derives from the live grid. */
  protected refreshEnvironment(): void {
    const api = this.api;
    if (!api) return;
    const built = buildAiEnvironment(snapshotGrid(api));
    this.environment.set(`${built.context}\n\ntools:\n${JSON.stringify(built.tools, null, 2)}`);
  }

  protected clearLog(): void {
    this.log.set([]);
  }

  private pushLog(entry: string): void {
    this.log.update((entries) => [...entries, entry]);
  }
}
