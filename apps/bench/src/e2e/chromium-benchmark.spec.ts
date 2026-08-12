import { test, expect, type Browser } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROW_COUNTS = [10_000, 100_000, 1_000_000];
const SCENARIOS = ['init', 'sort', 'filter', 'scroll'] as const;
const protocolMethod = {
  sort: 'runSort',
  filter: 'runFilter',
  scroll: 'runScroll',
} as const;
const RUNS = Number(process.env['BENCH_RUNS'] ?? '5');
const output = resolve(
  process.env['BENCH_OUTPUT'] ?? 'apps/bench/bench/results/current.chromium.json',
);

interface Sample {
  durationMs: number;
  fps?: number;
  p95FrameMs?: number;
  droppedFramePercent?: number;
}

test('collect Chromium benchmark matrix', async ({ browser, baseURL }) => {
  const results: { rowCount: number; metrics: Record<string, Sample[]> }[] = [];
  for (const rowCount of ROW_COUNTS) {
    const metrics: Record<string, Sample[]> = {};
    for (const scenario of SCENARIOS) {
      metrics[scenario] = [];
      await collectSample(browser, baseURL!, rowCount, scenario); // Do not record cold route and JIT costs.
      for (let run = 0; run < RUNS; run++) {
        metrics[scenario].push(await collectSample(browser, baseURL!, rowCount, scenario));
      }
    }
    results.push({ rowCount, metrics });
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify(
      {
        schemaVersion: 2,
        harness: 'chromium-docs-route-v1',
        timestamp: new Date().toISOString(),
        matrix: { rowCounts: ROW_COUNTS, scenarios: SCENARIOS, runs: RUNS },
        results,
      },
      null,
      2,
    ),
  );
  expect(results).toHaveLength(ROW_COUNTS.length);
});

async function collectSample(
  browser: Browser,
  baseURL: string,
  rowCount: number,
  scenario: (typeof SCENARIOS)[number],
): Promise<Sample> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/benchmark?rows=${rowCount}`);
  await page.waitForFunction(() => window.__lgrBench !== undefined);
  const ready = await page.evaluate(() => window.__lgrBench!.ready());
  const sample =
    scenario === 'init'
      ? ready
      : await page.evaluate((method) => window.__lgrBench![method](), protocolMethod[scenario]);
  await context.close();
  return sample;
}
