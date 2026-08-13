#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const benchDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'bench');
const baselineFile = join(benchDirectory, 'baseline.chromium.json');
const currentFile = process.argv[2] ?? join(benchDirectory, 'results', 'current.chromium.json');
const acceptableRegression = 0.05;

if (!existsSync(baselineFile)) {
  console.error(
    `No Chromium baseline found at ${baselineFile}. Run \`nx run bench:bench\`, verify the results, then promote it to the baseline.`,
  );
  process.exit(1);
}

if (!existsSync(currentFile)) {
  console.log('No current Chromium results. Collecting them now...');
  execFileSync('npx', ['nx', 'run', 'bench:bench'], { stdio: 'inherit' });
}

const baseline = readResults(baselineFile);
const current = readResults(currentFile);
assertComparable(baseline, current);

let failed = false;
console.log('LibreGrid Chromium benchmark comparison\n');
console.log(`Baseline: ${baseline.timestamp}`);
console.log(`Current:  ${current.timestamp}\n`);

for (const baselineResult of baseline.results) {
  const currentResult = current.results.find(
    (result) => result.rowCount === baselineResult.rowCount,
  );
  if (!currentResult) throw new Error(`Current results omit ${baselineResult.rowCount} rows.`);
  console.log(`━━━ ${baselineResult.rowCount.toLocaleString()} rows`);
  for (const scenario of baseline.matrix.scenarios) {
    const base = median(baselineResult.metrics[scenario]);
    const actual = median(currentResult.metrics[scenario]);
    const ratio = actual.durationMs / base.durationMs;
    const change = ((ratio - 1) * 100).toFixed(1);
    const passed = ratio <= 1 + acceptableRegression;
    console.log(
      `  ${passed ? 'PASS' : 'FAIL'} ${scenario}: ${actual.durationMs.toFixed(1)}ms vs ${base.durationMs.toFixed(1)}ms (${change > 0 ? '+' : ''}${change}%)`,
    );
    failed ||= !passed;
  }
}

if (failed) {
  console.error('\nBenchmark regression exceeded 5%.');
  process.exit(1);
}

function readResults(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schemaVersion !== 2 || data.harness !== 'chromium-docs-route-v1') {
    throw new Error(`${file} is not a compatible Chromium benchmark result.`);
  }
  return data;
}

function assertComparable(baseline, current) {
  if (
    JSON.stringify(baseline.matrix.rowCounts) !== JSON.stringify(current.matrix.rowCounts) ||
    JSON.stringify(baseline.matrix.scenarios) !== JSON.stringify(current.matrix.scenarios)
  ) {
    throw new Error(
      'Benchmark row counts or scenarios differ from its baseline. Re-baseline after explicitly reviewing the change.',
    );
  }
}

function median(samples) {
  const sorted = [...samples].sort((a, b) => a.durationMs - b.durationMs);
  return sorted[Math.floor(sorted.length / 2)];
}
