import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import {
  createGridAssistant,
  type GridCommandProposal,
  type GridCommandTransport,
} from '@libregrid/ai-client';
import {
  AI_PROTOCOL,
  buildProviderOutputSchema,
  buildProviderPrompt,
  type GridCommandRequest,
  type GridCommandSuccess,
  type GridFeature,
  type GridStateKey,
  type JsonObject,
} from '@libregrid/ai-protocol';

interface SaleRow {
  order: string;
  product: string;
  amountUsd: number;
  region: string;
  category: string;
  salesRep: string;
  closedDate: string;
}

type GatewayMode = 'mock' | 'http';

const SUGGESTIONS = [
  'Show sales over $5,000 from North America, hardware only',
  'Sort by sales amount, highest first',
  'Hide the sales rep column',
  'Group by region and total the sales amount',
] as const;

const ROWS: SaleRow[] = [
  { order: 'SO-1001', product: 'Atlas Router', amountUsd: 7_800, region: 'North America', category: 'Hardware', salesRep: 'Avery', closedDate: '2026-08-03' },
  { order: 'SO-1002', product: 'Support Suite', amountUsd: 3_100, region: 'North America', category: 'Software License', salesRep: 'Morgan', closedDate: '2026-08-05' },
  { order: 'SO-1003', product: 'Edge Switch', amountUsd: 5_450, region: 'Europe', category: 'Hardware', salesRep: 'Jordan', closedDate: '2026-08-08' },
  { order: 'SO-1004', product: 'Compute Node', amountUsd: 12_300, region: 'North America', category: 'Hardware', salesRep: 'Sam', closedDate: '2026-08-11' },
  { order: 'SO-1005', product: 'Analytics Pro', amountUsd: 8_900, region: 'Asia Pacific', category: 'Software License', salesRep: 'Taylor', closedDate: '2026-08-16' },
  { order: 'SO-1006', product: 'Secure Gateway', amountUsd: 6_250, region: 'North America', category: 'Hardware', salesRep: 'Riley', closedDate: '2026-08-20' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function schemaProperties(schema: unknown): Record<string, unknown> {
  return isRecord(schema) && isRecord(schema.properties) ? schema.properties : {};
}

function featureNames(request: GridCommandRequest): GridFeature[] {
  const allowed = new Set<GridFeature>([
    'aggregation', 'filter', 'sort', 'pivot', 'columnVisibility', 'columnSizing', 'rowGroup',
  ]);
  return Object.keys(schemaProperties(request.gridSchema)).filter((key): key is GridFeature => allowed.has(key as GridFeature));
}

function filterColumnIds(request: GridCommandRequest): string[] {
  const filterFeature = schemaProperties(request.gridSchema).filter;
  const filterModel = schemaProperties(filterFeature).filterModel;
  return Object.keys(schemaProperties(filterModel));
}

function deterministicOutput(request: GridCommandRequest): GridCommandSuccess {
  const features = featureNames(request);
  const gridState: JsonObject = Object.fromEntries(features.map((feature) => [feature, null]));
  const ignored = new Set<GridStateKey>(features);
  const command = request.command.toLowerCase();
  let explanation = 'The demo provider did not match a fixture, so it preserved every grid feature.';
  const applyFeature = (feature: GridFeature, value: JsonObject): void => {
    if (!features.includes(feature)) return;
    gridState[feature] = value;
    ignored.delete(feature);
  };

  if (command.includes('over $5,000') || command.includes('over 5000')) {
    const filterModel: JsonObject = Object.fromEntries(filterColumnIds(request).map((colId) => [colId, null]));
    filterModel.amountUsd = { filterType: 'number', type: 'greaterThan', filter: 5000, filterTo: null };
    filterModel.region = { filterType: 'set', values: ['North America'] };
    filterModel.category = { filterType: 'set', values: ['Hardware'] };
    applyFeature('filter', { filterModel, advancedFilterModel: null });
    explanation = 'Filter sales above $5,000 to North America and the Hardware category.';
  } else if (command.includes('highest first') || command.includes('descending')) {
    applyFeature('sort', { sortModel: [{ colId: 'amountUsd', sort: 'desc', type: 'default' }] });
    explanation = 'Sort Sales amount from highest to lowest.';
  } else if (command.includes('hide') && command.includes('sales rep')) {
    applyFeature('columnVisibility', { hiddenColIds: ['salesRep'] });
    explanation = 'Hide the Sales rep column.';
  } else if (command.includes('group by region')) {
    applyFeature('rowGroup', { groupColIds: ['region'] });
    applyFeature('aggregation', { aggregationModel: [{ colId: 'amountUsd', aggFunc: 'sum' }] });
    explanation = 'Group rows by Region and sum Sales amount.';
  }

  return {
    protocol: AI_PROTOCOL,
    requestId: request.requestId,
    revision: request.revision,
    status: 'ok',
    output: {
      gridState,
      propertiesToIgnore: [...ignored],
      explanation,
    },
    provider: {
      service: 'docs-contract-mock',
      model: 'deterministic-v1',
      providerRequestId: null,
      latencyMs: 0,
    },
  };
}

const DEMO_TRANSPORT: GridCommandTransport = {
  async send(request) {
    await Promise.resolve();
    return deterministicOutput(request);
  },
};

@Component({
  selector: 'lgr-ai-toolkit-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  styles: `
    .lgr-ai-lede { max-width: 76ch; }
    .lgr-ai-architecture {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
      margin: 20px 0 28px;
    }
    .lgr-ai-architecture mat-card { padding: 16px; }
    .lgr-ai-architecture h3 { margin: 0 0 6px; }
    .lgr-ai-flow { color: light-dark(#55505a, #cbc4cf); font-size: 0.9rem; }
    .lgr-ai-controls { display: grid; gap: 10px; margin: 18px 0; }
    .lgr-ai-input, .lgr-ai-select {
      box-sizing: border-box;
      width: 100%;
      padding: 9px 12px;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 5px;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .lgr-ai-mode { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 10px; }
    .lgr-ai-chips, .lgr-ai-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .lgr-ai-button {
      padding: 7px 13px;
      border: 1px solid light-dark(#77727a, #918a94);
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .lgr-ai-button.primary {
      border-color: transparent;
      border-radius: 5px;
      background: light-dark(#2f5e9e, #aac7ff);
      color: light-dark(#fff, #102f54);
    }
    .lgr-ai-button:disabled { cursor: default; opacity: 0.55; }
    .lgr-ai-status { min-height: 1.5rem; margin: 10px 0; }
    .lgr-ai-proposal {
      padding: 14px;
      margin: 16px 0;
      border: 1px solid light-dark(#9cb5da, #4c6f9f);
      border-radius: 7px;
      background: light-dark(#f3f7fd, #18283c);
    }
    .lgr-ai-proposal h3 { margin-top: 0; }
    .lgr-ai-diff { margin: 8px 0 14px; padding-left: 22px; }
    .lgr-ai-inspector { margin-top: 28px; }
    .lgr-ai-inspector details { border-top: 1px solid light-dark(#dedade, #494549); padding: 10px 0; }
    .lgr-ai-inspector summary { cursor: pointer; font-weight: 600; }
    .lgr-ai-code {
      max-height: 360px;
      overflow: auto;
      padding: 12px;
      border-radius: 5px;
      background: light-dark(#f4f2f4, #252325);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.78rem;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .lgr-ai-note { color: light-dark(#5a5759, #bbb5bc); }
    @media (max-width: 650px) { .lgr-ai-mode { grid-template-columns: 1fr; } }
  `,
  template: `
    <div class="lgr-page">
      <h1>AI Toolkit: bring your own model</h1>
      <p class="lgr-ai-lede">
        LibreGrid handles the grid-specific work. Your browser calls one authenticated API route;
        your server chooses the model. Provider keys never enter the browser, and changing OpenAI
        for another provider does not change the grid integration.
      </p>

      <div class="lgr-ai-architecture" aria-label="AI Toolkit package architecture">
        <mat-card>
          <h3>1. Schema</h3>
          <code>&#64;libregrid/ai-toolkit</code>
          <p>Reads the live columns and emits a strict seven-feature GridState schema.</p>
        </mat-card>
        <mat-card>
          <h3>2. Browser safety</h3>
          <code>&#64;libregrid/ai-client</code>
          <p>Captures state, validates twice, shows a diff, detects stale grids, and applies.</p>
        </mat-card>
        <mat-card>
          <h3>3. Your server</h3>
          <code>POST /v1/grid-command</code>
          <p>Use our Node gateway or generate any-language server stubs from OpenAPI.</p>
        </mat-card>
      </div>

      <p class="lgr-ai-flow">
        Browser → your authenticated API → chosen model provider → validated response → explicit apply
      </p>

      <ag-grid-angular
        [theme]="theme.gridTheme()"
        [gridOptions]="gridOptions"
        class="ag-theme-quartz"
        style="height: 340px; width: 100%"
        data-testid="ai-toolkit-grid"
      />

      <h2>Contract workbench</h2>
      <p>
        The deterministic mock exercises the exact production protocol without a network call.
        Switch to HTTP to test your own compatible gateway—this page never asks for a provider key.
      </p>
      <div class="lgr-ai-controls">
        <div class="lgr-ai-mode">
          <select class="lgr-ai-select" aria-label="Gateway mode" data-testid="ai-mode" [value]="mode()" (change)="onMode($event)">
            <option value="mock">Deterministic contract mock</option>
            <option value="http">External HTTP gateway</option>
          </select>
          <input
            class="lgr-ai-input"
            aria-label="Gateway endpoint"
            data-testid="ai-endpoint"
            [disabled]="mode() === 'mock'"
            [value]="endpoint()"
            (input)="onEndpoint($event)"
          />
        </div>
        <input
          class="lgr-ai-input"
          data-testid="ai-prompt"
          aria-label="Ask the grid"
          [value]="prompt()"
          (input)="onPrompt($event)"
          placeholder="Describe a filter, sort, grouping, pivot, visibility, sizing, or aggregation"
        />
        <div class="lgr-ai-chips">
          @for (suggestion of SUGGESTIONS; track suggestion) {
            <button class="lgr-ai-button" type="button" [disabled]="busy()" (click)="ask(suggestion)">{{ suggestion }}</button>
          }
        </div>
        <div class="lgr-ai-actions">
          <button class="lgr-ai-button primary" type="button" data-testid="ai-ask" [disabled]="busy()" (click)="ask(prompt())">
            Generate proposal
          </button>
          <button class="lgr-ai-button" type="button" data-testid="ai-show-env" (click)="inspect()">
            Inspect current contract
          </button>
        </div>
      </div>

      <p class="lgr-ai-status" role="status" aria-live="polite" data-testid="ai-status">{{ status() }}</p>

      @if (proposal(); as pending) {
        <section class="lgr-ai-proposal" data-testid="ai-proposal">
          <h3>Review before applying</h3>
          <p>{{ pending.response.output.explanation }}</p>
          <ul class="lgr-ai-diff" data-testid="ai-diff">
            @for (change of pending.changes; track change.feature) {
              <li><strong>{{ change.feature }}</strong>: {{ json(change.before) }} → {{ json(change.after) }}</li>
            } @empty {
              <li>No grid-state changes proposed.</li>
            }
          </ul>
          <div class="lgr-ai-actions">
            <button class="lgr-ai-button primary" type="button" data-testid="ai-apply" (click)="applyProposal()">Apply to grid</button>
            <button class="lgr-ai-button" type="button" data-testid="ai-discard" (click)="discardProposal()">Discard</button>
          </div>
        </section>
      }

      @if (artifacts(); as view) {
        <section class="lgr-ai-inspector" data-testid="ai-inspector">
          <h2>What crosses each boundary</h2>
          <details open>
            <summary>System prompt</summary>
            <pre class="lgr-ai-code" data-testid="ai-system-prompt" tabindex="0">{{ view.systemPrompt }}</pre>
          </details>
          <details>
            <summary>Live grid schema and current state request</summary>
            <pre class="lgr-ai-code" data-testid="ai-request" tabindex="0">{{ view.request }}</pre>
          </details>
          <details>
            <summary>Strict provider output envelope</summary>
            <pre class="lgr-ai-code" data-testid="ai-envelope" tabindex="0">{{ view.envelope }}</pre>
          </details>
          <details>
            <summary>Validated gateway response</summary>
            <pre class="lgr-ai-code" data-testid="ai-response" tabindex="0">{{ view.response }}</pre>
          </details>
          <details>
            <summary>Validation report</summary>
            <pre class="lgr-ai-code" data-testid="ai-validation" tabindex="0">{{ view.validation }}</pre>
          </details>
        </section>
      }

      <h2>Production integration</h2>
      <pre class="lgr-ai-code"><code>{{ integrationCode }}</code></pre>
      <p class="lgr-ai-note">
        Deploy <code>&#64;libregrid/ai-gateway</code>, or implement the same OpenAPI operation in
        your existing Java, C#, Go, Python, Rust, PHP, Ruby, or Node server. Your application owns
        endpoint authentication and secret storage; LibreGrid owns the model schema and validation.
      </p>
    </div>
  `,
})
export class AiToolkitDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly SUGGESTIONS = SUGGESTIONS;
  protected readonly prompt = signal<string>(SUGGESTIONS[0]);
  protected readonly mode = signal<GatewayMode>('mock');
  protected readonly endpoint = signal('/v1/grid-command');
  protected readonly busy = signal(false);
  protected readonly status = signal('Ready. Generate a proposal or inspect the current contract.');
  protected readonly proposal = signal<GridCommandProposal | null>(null);
  protected readonly integrationCode = `const assistant = createGridAssistant({ api, endpoint: '/v1/grid-command' });
const proposal = await assistant.run(command);
showDiff(proposal.changes);
proposal.apply(); // only after confirmation`;
  protected readonly artifacts = signal<{
    systemPrompt: string;
    request: string;
    envelope: string;
    response: string;
    validation: string;
  } | null>(null);

  protected readonly gridOptions: GridOptions<SaleRow> = {
    columnDefs: this.columnDefs(),
    defaultColDef: { resizable: true, sortable: true },
    rowData: ROWS,
    onGridReady: ({ api }) => { this.api = api; },
  };

  protected api: GridApi<SaleRow> | undefined;

  private columnDefs(): ColDef<SaleRow>[] {
    return [
      { field: 'order', headerName: 'Sales order', filter: 'agTextColumnFilter' },
      { field: 'product', headerName: 'Product name', filter: 'agTextColumnFilter' },
      { field: 'amountUsd', headerName: 'Sales amount (USD)', cellDataType: 'number', filter: 'agNumberColumnFilter', enableValue: true },
      { field: 'region', headerName: 'Sales region', filter: 'agSetColumnFilter', filterParams: { values: ['North America', 'Europe', 'Asia Pacific'] }, enableRowGroup: true, enablePivot: true },
      { field: 'category', headerName: 'Product category', filter: 'agSetColumnFilter', filterParams: { values: ['Hardware', 'Software License'] }, enableRowGroup: true, enablePivot: true },
      { field: 'salesRep', headerName: 'Sales rep', filter: 'agTextColumnFilter' },
      { field: 'closedDate', headerName: 'Closed date', cellDataType: 'dateString', filter: 'agDateColumnFilter' },
    ];
  }

  protected onPrompt(event: Event): void {
    this.prompt.set((event.target as HTMLInputElement).value);
  }

  protected onEndpoint(event: Event): void {
    this.endpoint.set((event.target as HTMLInputElement).value);
  }

  protected onMode(event: Event): void {
    this.mode.set((event.target as HTMLSelectElement).value === 'http' ? 'http' : 'mock');
  }

  private assistant() {
    const api = this.api;
    if (!api) throw new Error('Grid is not ready');
    return createGridAssistant({
      api,
      ...(this.mode() === 'mock' ? { transport: DEMO_TRANSPORT } : { endpoint: this.endpoint().trim() || '/v1/grid-command' }),
      schema: {
        columns: {
          amountUsd: { description: 'The order sales total in US dollars' },
          region: { description: 'Sales territory', includeSetValues: true },
          category: { description: 'Hardware or Software License', includeSetValues: true },
        },
      },
      context: { density: 'comfortable', totalRecordCount: ROWS.length },
    });
  }

  protected inspect(): void {
    try {
      const request = this.assistant().prepare(this.prompt().trim() || SUGGESTIONS[0]);
      this.showArtifacts(request, null);
      this.status.set('Contract captured from the live grid. Expand the inspector sections below.');
    } catch (error) {
      this.status.set(`Could not inspect contract: ${String(error)}`);
    }
  }

  protected async ask(rawCommand: string): Promise<void> {
    const command = rawCommand.trim();
    if (!command || this.busy()) return;
    this.prompt.set(command);
    this.busy.set(true);
    this.proposal.set(null);
    this.status.set(this.mode() === 'mock' ? 'Validating through the deterministic contract mock…' : 'Calling your HTTP gateway…');
    try {
      const proposal = await this.assistant().run(command);
      this.proposal.set(proposal);
      this.showArtifacts(proposal.request, proposal.response);
      this.status.set(proposal.changes.length > 0
        ? `Validated ${proposal.changes.length} proposed feature change(s). Review before applying.`
        : 'The validated proposal preserves the current grid state.');
    } catch (error) {
      this.status.set(`Request failed safely: ${String(error)}`);
    } finally {
      this.busy.set(false);
    }
  }

  protected applyProposal(): void {
    const proposal = this.proposal();
    if (!proposal) return;
    try {
      const result = proposal.apply();
      this.status.set(`Applied ${result.changes.length} validated feature change(s).`);
      this.proposal.set(null);
    } catch (error) {
      this.status.set(`Proposal was not applied: ${String(error)}`);
    }
  }

  protected discardProposal(): void {
    this.proposal.set(null);
    this.status.set('Proposal discarded. The grid was not changed.');
  }

  protected json(value: unknown): string {
    return JSON.stringify(value);
  }

  private showArtifacts(request: GridCommandRequest, response: GridCommandSuccess | null): void {
    const prompt = buildProviderPrompt(request);
    this.artifacts.set({
      systemPrompt: prompt.system,
      request: JSON.stringify(request, null, 2),
      envelope: JSON.stringify(buildProviderOutputSchema(request.gridSchema), null, 2),
      response: response ? JSON.stringify(response, null, 2) : 'No provider response yet.',
      validation: JSON.stringify({
        requestValid: true,
        responseValid: response !== null,
        protocol: AI_PROTOCOL,
        revision: request.revision,
        stale: response ? this.proposal()?.isStale() ?? false : false,
      }, null, 2),
    });
  }
}
