#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const [firstPath, secondPath] = process.argv.slice(2);
const maximumMedianVariance = 0.05;

if (!firstPath || !secondPath) {
  throw new Error('Usage: verify-variance.mjs <first-result.json> <second-result.json>');
}

const first = readResult(firstPath);
const second = readResult(secondPath);
assertComparable(first, second);

const variances = [];
console.log('LibreGrid Chromium benchmark variance\\n');
for (const firstResult of first.results) {
  const secondResult = second.results.find((result) => result.rowCount === firstResult.rowCount);
  if (!secondResult) throw new Error(`Second result omits ${firstResult.rowCount} rows.`);

  for (const scenario of first.matrix.scenarios) {
    const firstMedian = median(firstResult.metrics[scenario]);
    const secondMedian = median(secondResult.metrics[scenario]);
    const variance = Math.abs(secondMedian / firstMedian - 1);
    variances.push(variance);
    console.log(
      `${firstResult.rowCount.toLocaleString()} ${scenario}: ${(variance * 100).toFixed(2)}%`,
    );
  }
}

const matrixMedianVariance = numericMedian(variances);
console.log(`\\nMatrix median variance: ${(matrixMedianVariance * 100).toFixed(2)}%`);

if (matrixMedianVariance >= maximumMedianVariance) {
  throw new Error('Matrix median variance must remain below 5%.');
}

function readResult(path) {
  const result = JSON.parse(readFileSync(path, 'utf8'));
  if (result.schemaVersion !== 2 || result.harness !== 'chromium-docs-route-v1') {
    throw new Error(`${path} is not a compatible Chromium benchmark result.`);
  }
  return result;
}

function assertComparable(first, second) {
  if (
    JSON.stringify(first.matrix.rowCounts) !== JSON.stringify(second.matrix.rowCounts) ||
    JSON.stringify(first.matrix.scenarios) !== JSON.stringify(second.matrix.scenarios)
  ) {
    throw new Error('Benchmark row counts or scenarios differ between the two results.');
  }
}

function median(samples) {
  const sorted = [...samples].sort((left, right) => left.durationMs - right.durationMs);
  return sorted[Math.floor(sorted.length / 2)].durationMs;
}

function numericMedian(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}
