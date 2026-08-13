import { Component, ChangeDetectionStrategy, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ModuleRegistry, type ColDef, type GridApi, type GridOptions } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { LibreGridThemeService } from '@libregrid/material';

interface BenchmarkRow {
  id: number;
  name: string;
  category: string;
  region: string;
  channel: string;
  value: number;
}

interface BenchmarkSample {
  durationMs: number;
  fps?: number;
  p95FrameMs?: number;
  droppedFramePercent?: number;
}

interface BenchmarkProtocol {
  ready(): Promise<BenchmarkSample>;
  isRowGroupingModuleRegistered(): boolean;
  runSort(): Promise<BenchmarkSample>;
  runFilter(): Promise<BenchmarkSample>;
  runScroll(): Promise<BenchmarkSample>;
  runGroup(): Promise<BenchmarkSample>;
}

declare global {
  interface Window {
    __lgrBench?: BenchmarkProtocol;
  }
}

@Component({
  selector: 'lgr-benchmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      style="display:block;width:1440px;height:900px"
      [theme]="theme.gridTheme()"
      [columnDefs]="columnDefs"
      [rowData]="rows()"
      [gridOptions]="gridOptions"
      (gridReady)="onGridReady($event.api)"
      data-testid="benchmark-grid"
    />
  `,
})
export class BenchmarkRoute {
  protected readonly theme = inject(LibreGridThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly startedAt = performance.now();
  private readonly rowCount = Number(this.route.snapshot.queryParamMap.get('rows') ?? '10000');
  protected readonly rows = signal<BenchmarkRow[]>(makeRows(this.rowCount));
  private api: GridApi | undefined;
  private readyResolve: ((sample: BenchmarkSample) => void) | undefined;
  private readonly readyPromise = new Promise<BenchmarkSample>((resolve) => {
    this.readyResolve = resolve;
  });

  protected readonly columnDefs: ColDef<BenchmarkRow>[] = [
    { field: 'id', sortable: true, filter: true },
    { field: 'name', sortable: true, filter: true },
    { field: 'category', sortable: true, filter: true, enableRowGroup: true },
    { field: 'region', sortable: true, filter: true, enableRowGroup: true },
    { field: 'channel', sortable: true, filter: true, enableRowGroup: true },
    { field: 'value', sortable: true, filter: true, aggFunc: 'sum' },
  ];

  protected readonly gridOptions: GridOptions<BenchmarkRow> = {
    animateRows: false,
    suppressAnimationFrame: false,
    defaultColDef: { flex: 1, sortable: true, filter: true },
  };

  constructor() {
    // This route is lazy-loaded. Register the feature explicitly before its
    // child grid is constructed so its benchmark configuration is valid even
    // when route chunks are evaluated independently by the dev server.
    ModuleRegistry.registerModules([EnterpriseCoreModule, RowGroupingModule]);

    afterNextRender(() => {
      window.__lgrBench = {
        ready: () => this.readyPromise,
        isRowGroupingModuleRegistered: () =>
          this.api?.isModuleRegistered('RowGroupingModule') ?? false,
        runSort: () =>
          this.measure(
            () => this.api?.applyColumnState({ state: [{ colId: 'value', sort: 'asc' }] }),
            () => this.api?.applyColumnState({ defaultState: { sort: null } }),
          ),
        runFilter: () =>
          this.measure(
            () =>
              this.api?.setFilterModel({
                category: { filterType: 'text', type: 'equals', filter: 'A' },
              }),
            () => this.api?.setFilterModel(null),
          ),
        runScroll: () => this.measureScroll(),
        runGroup: () =>
          this.measure(
            () => this.api?.addRowGroupColumns(['category', 'region', 'channel']),
            () => this.api?.removeRowGroupColumns(['category', 'region', 'channel']),
          ),
      };
    });
  }

  onGridReady(api: GridApi): void {
    this.api = api;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.readyResolve?.({ durationMs: performance.now() - this.startedAt });
      }),
    );
  }

  private async measure(operation: () => void, cleanup: () => void): Promise<BenchmarkSample> {
    const start = performance.now();
    operation();
    const sample = { durationMs: performance.now() - start };
    cleanup();
    await nextFrames(2);
    return sample;
  }

  private async measureScroll(): Promise<BenchmarkSample> {
    const viewport = document.querySelector<HTMLElement>('.ag-body-vertical-scroll-viewport');
    if (!viewport) throw new Error('Benchmark grid viewport was not found');
    const frames: number[] = [];
    const start = performance.now();
    let previous = start;
    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    for (let progress = 0; progress <= 1; progress += 0.05) {
      viewport.scrollTop = maximum * progress;
      await new Promise<void>((resolve) =>
        requestAnimationFrame((now) => {
          frames.push(now - previous);
          previous = now;
          resolve();
        }),
      );
    }
    frames.sort((a, b) => a - b);
    const medianFrame = frames[Math.floor(frames.length / 2)] ?? 16.67;
    const p95FrameMs = frames[Math.floor(frames.length * 0.95)] ?? medianFrame;
    return {
      durationMs: performance.now() - start,
      fps: 1000 / medianFrame,
      p95FrameMs,
      droppedFramePercent: (frames.filter((frame) => frame > 16.67).length / frames.length) * 100,
    };
  }
}

function makeRows(count: number): BenchmarkRow[] {
  const rows: BenchmarkRow[] = [];
  let seed = 2_026_081_1;
  for (let id = 0; id < count; id++) {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    rows.push({
      id,
      name: `Row ${id}`,
      category: String.fromCharCode(65 + (id % 5)),
      region: String.fromCharCode(71 + (id % 4)),
      channel: String.fromCharCode(75 + (id % 3)),
      value: seed % 10_000,
    });
  }
  return rows;
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const frame = () => {
      remaining -= 1;
      if (remaining === 0) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
