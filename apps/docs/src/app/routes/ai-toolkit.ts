import { ChangeDetectionStrategy, Component, inject, signal, viewChild, type ElementRef, type Signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule, type MatCheckboxChange } from '@angular/material/checkbox';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import {
  createGridAssistant,
  type GridCommandProposal,
  type GridCommandTransport,
  type GridStateChange,
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
  type JsonValue,
} from '@libregrid/ai-protocol';
import {
  DocsBackendBoundaryComponent,
  type DocsBoundaryContract,
  type DocsBoundaryResponsibility,
} from '../docs/docs-backend-boundary';
import { DocsCodeExampleComponent, type DocsCodeExample } from '../docs/docs-code-example';
import { DocsDemoGuideComponent, type DocsDemoStep } from '../docs/docs-demo-guide';
import { DocsFeaturePageShellComponent } from '../docs/docs-feature-page-shell';
import { DocsProductionChecklistComponent, type DocsChecklistItem } from '../docs/docs-production-checklist';

interface SaleRow {
  order: string;
  product: string;
  amountUsd: number;
  region: string;
  category: string;
  salesRep: string;
  closedDate: string;
}

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

const INTEGRATION_EXAMPLES: readonly DocsCodeExample[] = [
  {
    id: 'browser',
    label: 'Browser assistant',
    language: 'TypeScript',
    filename: 'grid-assistant.ts',
    description: 'Register the schema module once, then give the component that owns the grid a proposal-first assistant.',
    code: `npm install @libregrid/ai-toolkit @libregrid/ai-client

// main.ts — register once before any grid mounts
import { provideLibreGrid } from '@libregrid/angular';
import { AiToolkitModule } from '@libregrid/ai-toolkit';

bootstrapApplication(AppComponent, {
  providers: [provideLibreGrid(AiToolkitModule)],
});

// grid-assistant.ts — beside the component that owns the grid
import { createGridAssistant } from '@libregrid/ai-client';

const assistant = createGridAssistant({
  api, // GridApi from the (gridReady) event
  endpoint: '/api/grid-command', // your authenticated route
  schema: {
    columns: {
      amountUsd: { description: 'Order total in US dollars' },
      region: { description: 'Sales territory', includeSetValues: true },
    },
  },
  context: { density: 'comfortable', totalRecordCount: rows.length },
});

const proposal = await assistant.run(command); // capture → POST → revalidate
showDiff(proposal.changes); // dry-run: nothing has moved yet
if (userConfirmed) proposal.apply(); // one protected setState call`,
  },
  {
    id: 'gateway',
    label: 'Gateway server',
    language: 'TypeScript',
    filename: 'gateway.main.ts',
    description: 'Keep the provider key and model choice in server configuration. For zero-code deployment, run npx libregrid-ai-gateway or the included container instead.',
    code: `npm install @libregrid/ai-gateway

import {
  createGridCommandHandler,
  createOpenAiResponsesProvider,
  listenNodeGateway,
} from '@libregrid/ai-gateway';

const handler = createGridCommandHandler({
  provider: createOpenAiResponsesProvider({
    apiKey: () => secrets.OPENAI_API_KEY, // read per request; keep it in secret storage
    model: process.env.AI_MODEL ?? 'gpt-5.6', // server config is the model allowlist
  }),
  authorize: (request) => verifySession(request), // or reverse-proxy through your auth edge
});

await listenNodeGateway({ handler, port: 8787 }); // POST /v1/grid-command · GET /health`,
  },
  {
    id: 'any-language',
    label: 'Any language',
    language: 'bash',
    filename: 'terminal',
    description: 'The contract ships as JSON Schemas plus an OpenAPI 3.1 document, so any stack can own the route. Prove the result with the conformance executable.',
    code: `# Contract files ship inside the protocol package
node_modules/@libregrid/ai-protocol/openapi.json
node_modules/@libregrid/ai-protocol/schemas/

# Generate a server stub for your stack (java, csharp, go, python, rust, …)
npx @openapitools/openapi-generator-cli generate \\
  -i node_modules/@libregrid/ai-protocol/openapi.json \\
  -g go -o ./internal/gridcommand

# Prove the implementation before rollout
npx libregrid-ai-conformance https://your-api.example/v1/grid-command`,
  },
];

const DEMO_STEPS: readonly DocsDemoStep[] = [
  { icon: 'auto_awesome', title: 'Apply a query', instruction: 'Pick a demo query or type a request such as “Group by region and total the sales amount”, then press Apply Query.', expected: 'Validated changes are applied straight to the grid.' },
  { icon: 'rule', title: 'Review before applying', instruction: 'Turn on “Show request and validate”, run a query, read each suggested change, then choose Apply or Discard.', expected: 'Only Apply touches the grid; Discard leaves the state exactly as it was.' },
  { icon: 'manage_search', title: 'Inspect the request', instruction: 'With “Show request and validate” on, expand each section under the suggested changes.', expected: 'You see the exact system prompt, the request, the output schema, the response, and the validation report.' },
  { icon: 'restart_alt', title: 'Reset the grid', instruction: 'After applying changes, press Reset Grid to return to the original state.', expected: 'Columns, filters, and rows return to their starting values; nothing from the session persists.' },
];

const CLIENT_RESPONSIBILITIES: readonly DocsBoundaryResponsibility[] = [
  { title: 'Capture the complete live state', description: 'Send the full current GridState every time; the client recaptures it immediately before apply.' },
  { title: 'Never hold provider secrets', description: 'The browser talks only to your authenticated endpoint with the user’s normal session.' },
  { title: 'Require explicit confirmation', description: 'Show the diff and call proposal.apply() only after the user chooses.' },
];

const BACKEND_RESPONSIBILITIES: readonly DocsBoundaryResponsibility[] = [
  { title: 'Authenticate every request', description: 'Use your reverse proxy and session, or the handler’s authorize hook, before the provider is called.' },
  { title: 'Own model and cost policy', description: 'Requests cannot select a model, so your configured provider is both allowlist and budget control.' },
  { title: 'Log metadata only', description: 'Persist request IDs, results, and latency; never commands, schemas, state payloads, authorization values, or keys.' },
];

const CONTRACTS: readonly DocsBoundaryContract[] = [
  { kind: 'Request', name: 'POST /v1/grid-command', description: 'libregrid.ai/v1 GridCommandRequest: command, strict seven-feature schema, complete current state, revision.' },
  { kind: 'Response', name: 'GridCommandSuccess', description: 'Validated gridState, propertiesToIgnore baseline, explanation, and provider metadata.' },
  { kind: 'Failure', name: 'GridCommandFailure', description: 'Normalized error envelope with stable codes; safe to surface to the client.' },
];

const CHECKLIST: readonly DocsChecklistItem[] = [
  { priority: 'required', title: 'Keep provider keys on the server', description: 'Provide credentials through the apiKey callback or environment; the browser bundle must never contain them.' },
  { priority: 'required', title: 'Authenticate the endpoint', description: 'Put POST /v1/grid-command behind your session, token check, or the authorize hook.' },
  { priority: 'required', title: 'Disclose outbound metadata', description: 'Requests carry column IDs and descriptions, values you opted in, the complete current grid state, and counts. Row records are never sent.' },
  { priority: 'recommended', title: 'Pin the model allowlist', description: 'The configured model is server-side configuration; review changes like any other deployment.' },
  { priority: 'recommended', title: 'Size the provider timeout to measured latency', description: 'Retain the 512 KiB body limit; the hosted demo uses a 50-second provider timeout beneath the 60-second platform limit, and the browser imposes no timeout of its own.' },
  { priority: 'recommended', title: 'Log metadata only', description: 'Record request ID, status, latency, and normalized error codes — not commands, state, authorization, or keys.' },
  { priority: 'recommended', title: 'Prove custom servers', description: 'Run libregrid-ai-conformance against your endpoint before rollout, including failure paths.' },
  { priority: 'optional', title: 'Hold chat history in your application', description: 'The protocol is stateless; every request carries a fresh authoritative snapshot.' },
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

const FEATURE_LABELS: Partial<Record<GridStateKey, string>> = {
  aggregation: 'Aggregation',
  columnSizing: 'Column sizing',
  columnVisibility: 'Column visibility',
  filter: 'Filters',
  pivot: 'Pivot',
  rowGroup: 'Row grouping',
  sort: 'Sort',
};

function featureLabel(feature: GridStateKey): string {
  return FEATURE_LABELS[feature] ?? feature;
}

/** Render a feature's grid-state value as a short human-readable phrase. */
function describeFeatureValue(feature: GridStateKey, value: JsonValue | undefined): string {
  if (value === undefined || value === null) return 'unchanged';
  const record = isRecord(value) ? value : {};
  switch (feature) {
    case 'filter': {
      const model = isRecord(record.filterModel) ? record.filterModel : {};
      const conditions = Object.entries(model)
        .filter(([, cond]) => cond !== null)
        .map(([col, cond]) => {
          const c = isRecord(cond) ? cond : {};
          if (c.filterType === 'set') return `${col} in [${(Array.isArray(c.values) ? c.values : []).join(', ')}]`;
          if (c.type === 'greaterThan') return `${col} > ${String(c.filter)}`;
          if (c.type === 'lessThan') return `${col} < ${String(c.filter)}`;
          return `${col}: ${JSON.stringify(cond)}`;
        });
      return conditions.length > 0 ? conditions.join('; ') : 'no filters';
    }
    case 'sort': {
      const model = Array.isArray(record.sortModel) ? record.sortModel : [];
      const parts = model.map((entry) => {
        const item = isRecord(entry) ? entry : {};
        return `${String(item.colId)} ${item.sort === 'desc' ? 'descending' : 'ascending'}`;
      });
      return parts.length > 0 ? parts.join(', ') : 'no sort';
    }
    case 'columnVisibility': {
      const hidden = Array.isArray(record.hiddenColIds) ? record.hiddenColIds : [];
      return hidden.length > 0 ? `hidden: ${hidden.join(', ')}` : 'all columns visible';
    }
    case 'rowGroup': {
      const groups = Array.isArray(record.groupColIds) ? record.groupColIds : [];
      return groups.length > 0 ? `group by ${groups.join(', ')}` : 'no grouping';
    }
    case 'aggregation': {
      const model = Array.isArray(record.aggregationModel) ? record.aggregationModel : [];
      const parts = model.map((entry) => {
        const item = isRecord(entry) ? entry : {};
        return `${String(item.aggFunc)} of ${String(item.colId)}`;
      });
      return parts.length > 0 ? parts.join(', ') : 'no aggregation';
    }
    default:
      return JSON.stringify(value);
  }
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
    // Keep the request in flight long enough for the busy spinner to be
    // visible; this transport is only reachable through the hidden ?mock=1
    // e2e hook, so the delay never affects real users.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return deterministicOutput(request);
  },
};

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): string;
      execute(widgetId: string): void;
      reset(widgetId: string): void;
    };
  }
}

// The site key is public and intentionally committed. Every real request
// invokes Turnstile; only the hidden ?mock=1 e2e hook bypasses it.
const TURNSTILE_SITE_KEY = '0x4AAAAAAEcZNv1LedOXTzSk';
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScript: Promise<void> | undefined;

function loadTurnstile(): Promise<void> {
  turnstileScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile did not load'));
    document.head.append(script);
  });
  return turnstileScript;
}

/** Flagship guide: try the validated BYOM flow, then integrate browser, gateway, and policy. */
@Component({
  selector: 'lgr-ai-toolkit-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AgGridAngular,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    DocsBackendBoundaryComponent,
    DocsCodeExampleComponent,
    DocsDemoGuideComponent,
    DocsFeaturePageShellComponent,
    DocsProductionChecklistComponent,
  ],
  styles: `
    .lgr-ai-lede { max-width: 76ch; }
    .lgr-ai-architecture {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
      margin: 0 0 20px;
    }
    .lgr-ai-architecture mat-card { padding: 16px; }
    .lgr-ai-architecture h3 { margin: 0 0 6px; }
    .lgr-ai-flow { color: light-dark(#55505a, #cbc4cf); font-size: 0.9rem; }
    .lgr-ai-workbench {
      display: grid;
      gap: 12px;
      margin: 18px 0;
      padding: 14px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      background: var(--mat-sys-surface-container-low);
    }
    .lgr-ai-controls { display: grid; gap: 10px; margin: 0; }
    .lgr-ai-input {
      box-sizing: border-box;
      width: 100%;
      padding: 9px 12px;
      border: 1px solid light-dark(#c9c6ca, #5a5759);
      border-radius: 5px;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .lgr-ai-turnstile-host {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    .lgr-ai-label { margin: 0 0 6px; font-size: 0.9rem; font-weight: 600; }
    .lgr-ai-chips, .lgr-ai-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .lgr-ai-query-actions { align-items: center; margin: 0; }
    .lgr-ai-query-actions mat-checkbox { margin-inline-start: 4px; }
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
    .lgr-ai-status { display: flex; align-items: center; gap: 8px; min-height: 1.5rem; margin: 10px 0; }
    .lgr-ai-error {
      margin: 0 0 10px;
      padding: 10px 12px;
      border: 1px solid light-dark(#c96a5f, #b5564c);
      border-radius: 5px;
      background: light-dark(#fdf1ef, #3a2320);
      color: inherit;
    }
    .lgr-ai-spinner {
      flex: none;
      width: 14px;
      height: 14px;
      border: 2px solid light-dark(#c9c6ca, #5a5759);
      border-top-color: light-dark(#2f5e9e, #aac7ff);
      border-radius: 50%;
      animation: lgr-ai-spin 0.8s linear infinite;
    }
    @keyframes lgr-ai-spin { to { transform: rotate(360deg); } }
    .lgr-ai-proposal {
      padding: 14px;
      margin: 16px 0;
      border: 1px solid light-dark(#9cb5da, #4c6f9f);
      border-radius: 7px;
      background: light-dark(#f3f7fd, #18283c);
    }
    .lgr-ai-proposal h3 { margin-top: 0; }
    .lgr-ai-diff { margin: 8px 0 14px; padding-left: 22px; }
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
  `,
  template: `
    <lgr-docs-feature-page-shell
      eyebrow="Bring your own model"
      title="Turn plain language into validated grid changes"
      summary="Register AiToolkitModule, point the browser client at one authenticated route on your server, and let users turn plain language into validated grid changes. LibreGrid owns the schema, the request/response format, double validation, diff, and apply path; you own the provider, key, cost, and policy. Provider keys never enter the browser."
      [packages]="['@libregrid/ai-toolkit', '@libregrid/ai-client', '@libregrid/ai-protocol', '@libregrid/ai-gateway']"
      [audiences]="['Product teams', 'Application developers', 'Platform teams']"
      [values]="values"
    >
      <div featureDemo>
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

        <h2>Try it out</h2>
        <p>
          Every query is sent to <code>POST /v1/grid-command</code> on this origin and validated
          against the same protocol your server uses. This page never asks for a provider key.
        </p>
        <p class="lgr-ai-flow">
          Each request: validated against the live grid → sent to your server → revalidated →
          applied to the grid, or shown as a diff when review is on.
        </p>
        <div class="lgr-ai-workbench">
          <div class="lgr-ai-controls">
            <div #turnstileHost class="lgr-ai-turnstile-host" data-testid="ai-turnstile"></div>
            <input
              class="lgr-ai-input"
              data-testid="ai-prompt"
              aria-label="Ask the grid"
              [value]="prompt()"
              (input)="onPrompt($event)"
              placeholder="Describe a filter, sort, grouping, pivot, visibility, sizing, or aggregation"
            />
          </div>

          <ag-grid-angular
            [theme]="theme.gridTheme()"
            [gridOptions]="gridOptions"
            class="ag-theme-quartz"
            style="height: 340px; width: 100%"
            aria-label="Demo sales grid with six orders"
            data-testid="ai-toolkit-grid"
          />

          <div class="lgr-ai-actions lgr-ai-query-actions">
            <button mat-flat-button color="primary" type="button" data-testid="ai-apply-query" [disabled]="busy() || !prompt().trim()" (click)="applyQuery(prompt())">
              Apply Query
            </button>
            <button mat-stroked-button type="button" data-testid="ai-reset" [disabled]="busy()" (click)="resetGrid()">
              Reset Grid
            </button>
            <mat-checkbox data-testid="ai-show-review" [checked]="showReview()" (change)="onShowReview($event)">
              Show request and validate
            </mat-checkbox>
          </div>
        </div>

        <p class="lgr-ai-status" role="status" aria-live="polite" data-testid="ai-status">
          @if (busy()) {
            <span class="lgr-ai-spinner" data-testid="ai-spinner" aria-hidden="true"></span>
          }
          {{ status() }}
        </p>

        @if (error(); as message) {
          <p class="lgr-ai-error" role="alert" data-testid="ai-error">{{ message }}</p>
        }

        @if (showReview() && proposal(); as pending) {
          <section class="lgr-ai-proposal" #proposalHost data-testid="ai-proposal">
            <h3>Suggested changes — review before applying</h3>
            <p>{{ pending.response.output.explanation }}</p>
            <ul class="lgr-ai-diff" data-testid="ai-diff">
              @for (change of pending.changes; track change.feature) {
                <li><strong>{{ featureLabel(change.feature) }}</strong>: {{ describeChange(change) }}</li>
              } @empty {
                <li>No grid-state changes proposed.</li>
              }
            </ul>
            <div class="lgr-ai-actions">
              <button mat-flat-button color="primary" type="button" data-testid="ai-apply" (click)="applyProposal()">Apply to grid</button>
              <button mat-stroked-button type="button" data-testid="ai-discard" (click)="discardProposal()">Discard</button>
            </div>
            @if (artifacts(); as view) {
              <section class="lgr-ai-inspector" #inspectorHost data-testid="ai-inspector">
                <h3>What's sent to the server and back</h3>
                <details open>
                  <summary>System prompt</summary>
                  <pre class="lgr-ai-code" data-testid="ai-system-prompt" tabindex="0">{{ view.systemPrompt }}</pre>
                </details>
                <details>
                  <summary>Request sent to your server</summary>
                  <pre class="lgr-ai-code" data-testid="ai-request" tabindex="0">{{ view.request }}</pre>
                </details>
                <details>
                  <summary>Output schema the model must follow</summary>
                  <pre class="lgr-ai-code" data-testid="ai-envelope" tabindex="0">{{ view.envelope }}</pre>
                </details>
                <details>
                  <summary>Response from your server</summary>
                  <pre class="lgr-ai-code" data-testid="ai-response" tabindex="0">{{ view.response }}</pre>
                </details>
                <details>
                  <summary>Validation report</summary>
                  <pre class="lgr-ai-code" data-testid="ai-validation" tabindex="0">{{ view.validation }}</pre>
                </details>
              </section>
            }
          </section>
        }

        <p class="lgr-ai-label" id="lgr-ai-demo-queries">Demo queries</p>
        <div class="lgr-ai-chips" role="group" aria-labelledby="lgr-ai-demo-queries">
          @for (suggestion of SUGGESTIONS; track suggestion) {
            <button class="lgr-ai-button" type="button" [disabled]="busy()" (click)="applyQuery(suggestion)">{{ suggestion }}</button>
          }
        </div>
      </div>

      <lgr-docs-demo-guide featureGuide intro="Every step runs against the real protocol on this page's live grid." [steps]="demoSteps" />

      <div featureImplementation>
        <lgr-docs-code-example heading="Add the AI Toolkit to your application" [examples]="integrationExamples" />
      </div>

      <div featureIntegration>
        <lgr-docs-backend-boundary
          summary="LibreGrid defines the versioned contract and validates both directions of it. Your application owns authentication, provider and model policy, secrets, logging, retention, and residency."
          [clientResponsibilities]="clientResponsibilities"
          [backendResponsibilities]="backendResponsibilities"
          [contracts]="contracts"
        />
      </div>

      <div featureProduction>
        <lgr-docs-production-checklist heading="Ship the gateway safely" intro="Confirm these items before users send real commands." [items]="checklist" />
      </div>
    </lgr-docs-feature-page-shell>
  `,
})
export class AiToolkitDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly SUGGESTIONS = SUGGESTIONS;
  protected readonly prompt = signal<string>(SUGGESTIONS[0]);
  protected readonly busy = signal(false);
  protected readonly status = signal('Ready. Type a request or pick a demo query, then press Apply Query.');
  protected readonly error = signal<string | null>(null);
  protected readonly showReview = signal(false);
  protected readonly proposal = signal<GridCommandProposal | null>(null);
  protected readonly integrationExamples = INTEGRATION_EXAMPLES;
  protected readonly demoSteps = DEMO_STEPS;
  protected readonly clientResponsibilities = CLIENT_RESPONSIBILITIES;
  protected readonly backendResponsibilities = BACKEND_RESPONSIBILITIES;
  protected readonly contracts = CONTRACTS;
  protected readonly checklist = CHECKLIST;
  protected readonly values = [
    { icon: 'auto_awesome', title: 'Plain-language control', description: 'Users ask for filters, sorts, grouping, pivot, sizing, visibility, and aggregation across seven supported features.' },
    { icon: 'key', title: 'Keys stay server-side', description: 'The browser calls only your endpoint; provider credentials and model choice never leave your infrastructure.' },
    { icon: 'fact_check', title: 'Validate before you apply', description: 'Every response is revalidated against the live grid; turn on “Show request and validate” to review changes as a diff before applying.' },
    { icon: 'sync_alt', title: 'One request format, any provider', description: 'The versioned libregrid.ai/v1 request/response format works with the Node gateway, another provider port, or an OpenAPI-generated server.' },
  ];
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

  private readonly turnstileHost = viewChild<ElementRef<HTMLElement>>('turnstileHost');
  private readonly proposalHost = viewChild<ElementRef<HTMLElement>>('proposalHost');
  private turnstileWidget: string | undefined;
  private turnstilePending: { resolve: (token: string) => void; reject: (error: Error) => void } | undefined;

  private async turnstileToken(): Promise<string> {
    await loadTurnstile();
    const api = window.turnstile;
    const host = this.turnstileHost()?.nativeElement;
    if (!api || !host) throw new Error('Turnstile is not available');

    // Turnstile tokens are single-use: a call arriving while another is still
    // outstanding must not wait behind it forever, so it displaces the older
    // request instead.
    if (this.turnstilePending) {
      const displaced = this.turnstilePending;
      this.turnstilePending = undefined;
      displaced.reject(new Error('Turnstile verification was superseded by a new request'));
    }

    return new Promise<string>((resolve, reject) => {
      this.turnstilePending = { resolve, reject };

      if (this.turnstileWidget === undefined) {
        // Render exactly once. The callbacks read the mutable pending-deferred
        // above so every later call — which reuses this same widget — resolves
        // or rejects whichever promise is outstanding at the time.
        this.turnstileWidget = api.render(host, {
          sitekey: TURNSTILE_SITE_KEY,
          action: 'grid_command',
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (token: string) => {
            const pending = this.turnstilePending;
            this.turnstilePending = undefined;
            pending?.resolve(token);
          },
          'error-callback': () => {
            const pending = this.turnstilePending;
            this.turnstilePending = undefined;
            pending?.reject(new Error('Turnstile verification failed'));
          },
        });
        api.execute(this.turnstileWidget);
      } else {
        api.reset(this.turnstileWidget);
        api.execute(this.turnstileWidget);
      }
    });
  }

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

  private assistant() {
    const api = this.api;
    if (!api) throw new Error('Grid is not ready');
    // The page always talks to the same-origin HTTP gateway. The deterministic
    // transport is kept only as a hidden e2e hook (?mock=1) so tests never
    // need a live gateway or a Turnstile token; real users always get the
    // HTTP path with a fresh Turnstile token per request.
    const useMock = new URLSearchParams(window.location.search).get('mock') === '1';
    return createGridAssistant({
      api,
      ...(useMock
        ? { transport: DEMO_TRANSPORT }
        : {
            endpoint: '/v1/grid-command',
            headers: async () => ({ 'x-turnstile-token': await this.turnstileToken() }),
          }),
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

  protected onShowReview(event: MatCheckboxChange): void {
    this.showReview.set(event.checked);
    if (!event.checked) {
      // Leaving review mode hides the review and traffic boxes.
      this.proposal.set(null);
    }
  }

  protected async applyQuery(rawCommand: string): Promise<void> {
    const command = rawCommand.trim();
    if (!command || this.busy()) return;
    this.prompt.set(command);
    this.busy.set(true);
    this.proposal.set(null);
    this.error.set(null);
    this.status.set('Running your query…');
    try {
      if (this.showReview()) {
        // Review mode: run the query and stop at the diff for Apply or Discard.
        const proposal = await this.assistant().run(command);
        this.proposal.set(proposal);
        this.showArtifacts(proposal.request, proposal.response);
        this.status.set(proposal.changes.length > 0
          ? `${proposal.changes.length} suggested change(s) ready to review.`
          : 'No changes suggested — the grid stays as it is.');
        this.scrollIntoView(this.proposalHost);
      } else {
        // Direct mode: run the query and apply the validated changes immediately.
        const result = await this.assistant().execute(command);
        this.status.set(result.changes.length > 0
          ? `Applied ${result.changes.length} change(s) to the grid.`
          : 'No changes suggested — the grid stays as it is.');
      }
    } catch (error) {
      this.error.set(`Request failed safely: ${String(error)}`);
      this.status.set('The request did not complete — see the message above.');
    } finally {
      this.busy.set(false);
    }
  }

  protected applyProposal(): void {
    const proposal = this.proposal();
    if (!proposal) return;
    try {
      const result = proposal.apply();
      this.error.set(null);
      this.status.set(`Applied ${result.changes.length} change(s) to the grid.`);
      this.proposal.set(null);
    } catch (error) {
      this.error.set(`Changes were not applied: ${String(error)}`);
    }
  }

  protected discardProposal(): void {
    this.proposal.set(null);
    this.error.set(null);
    this.status.set('Changes discarded. The grid was not changed.');
  }

  protected resetGrid(): void {
    const api = this.api;
    if (!api) return;
    // Column state covers sort, row groups, pivot, visibility, sizing, and
    // aggregation; filters and the advanced filter are separate.
    api.resetColumnState();
    api.setFilterModel(null);
    api.setAdvancedFilterModel(null);
    this.proposal.set(null);
    this.artifacts.set(null);
    this.error.set(null);
    this.status.set('Grid reset to its original columns, filters, and rows.');
  }

  protected featureLabel(feature: GridStateKey): string {
    return featureLabel(feature);
  }

  protected describeChange(change: GridStateChange): string {
    return `${describeFeatureValue(change.feature, change.before)} → ${describeFeatureValue(change.feature, change.after)}`;
  }

  private scrollIntoView(host: Signal<ElementRef<HTMLElement> | undefined>): void {
    // The section renders on the next change-detection cycle; scroll after it
    // exists. 'nearest' keeps the page still when the section is already visible.
    setTimeout(() => {
      host()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
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
