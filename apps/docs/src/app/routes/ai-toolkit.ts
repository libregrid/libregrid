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
      padding-left: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: light-dark(#3d3d3d, #e0e0e0);
    }
    .lgr-ai-log-empty {
      list-style: none;
      margin-left: -20px;
      font-style: italic;
      color: light-dark(#5a5759, #b8b5b9);
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
        browser</strong> by a 27M-parameter Needle model running on WebAssembly
        (ADR 0006). Nothing leaves this page: the prompt, the schema and the
        inference all happen client-side. Type a request or pick a suggestion —
        below the confidence threshold the toolkit asks for clarification
        instead of guessing.
      </p>
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
        [value]="prompt()"
        (input)="onPromptInput($event)"
        placeholder="e.g. Hide the region column"
      />
      <div class="lgr-ai-chips">
        @for (suggestion of SUGGESTIONS; track suggestion) {
          <button type="button" class="lgr-ai-chip" (click)="ask(suggestion)">{{ suggestion }}</button>
        }
      </div>
      <button type="button" class="lgr-ai-ask" data-testid="ai-ask" [disabled]="busy()" (click)="ask(prompt())">Ask</button>
      @if (busy()) {
        <span data-testid="ai-busy">Thinking… (first run downloads the ~14 MB model)</span>
      }
      <h2>Log</h2>
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
  `,
})
export class AiToolkitDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly SUGGESTIONS = SUGGESTIONS;
  protected readonly prompt = signal('');
  protected readonly busy = signal(false);
  protected readonly log = signal<string[]>([]);

  protected gridOptions: GridOptions<Row> = {
    columnDefs: [
      { field: 'product', headerName: 'Product' },
      { field: 'revenue', headerName: 'Revenue', cellDataType: 'number' },
      { field: 'region', headerName: 'Region' },
      { field: 'units', headerName: 'Units', cellDataType: 'number' },
    ],
    rowData: makeRows(),
    onGridReady: (params) => {
      this.api = params.api;
    },
  };

  private api: GridApi<Row> | undefined;
  // One session per page: the ~14 MB model is fetched and initialised once.
  private provider: NeedleWasmProvider | undefined;

  protected onPromptInput(event: Event): void {
    this.prompt.set((event.target as HTMLInputElement).value);
  }

  protected async ask(rawPrompt?: string): Promise<void> {
    const prompt = (rawPrompt ?? this.prompt()).trim();
    if (!prompt || this.busy()) return;
    this.busy.set(true);
    try {
      const provider = (this.provider ??= new NeedleWasmProvider());
      const outcome = await runToolkit(provider, {
        prompt,
        context: `Grid columns:\n${COLUMNS.map((c) => `${c.colId}: ${c.headerName}`).join('\n')}`,
        tools: buildGridTools(COLUMNS),
      });

      if (outcome.status === 'clarify') {
        this.pushLog(`clarify: ${outcome.reason}`);
        return;
      }

      const validated = validateToolCall(outcome.call, COLUMNS);
      if (!validated.ok) {
        this.pushLog(`rejected: ${validated.reason}`);
        return;
      }

      this.api?.setState(toolCallToStatePatch(validated));
      this.pushLog(`applied via ${outcome.via} @ ${outcome.confidence.toFixed(2)}: ${JSON.stringify(outcome.call)}`);
    } catch (error) {
      this.pushLog(`error: ${String(error)}`);
    } finally {
      this.busy.set(false);
    }
  }

  private pushLog(entry: string): void {
    this.log.update((entries) => [...entries, entry].slice(-8));
  }
}
