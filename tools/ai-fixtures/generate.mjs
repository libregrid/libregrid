#!/usr/bin/env node
/**
 * Export model environments for LoRA training.
 *
 * The whole point is that these fixtures come out of the *runtime's own*
 * `buildAiEnvironment`, not a re-implementation. The first LibreGrid corpus was
 * hand-copied from an earlier `buildGridTools()` and silently drifted out of
 * step with the code; generating from the real builder makes that impossible.
 *
 * Usage:
 *   node tools/ai-fixtures/generate.mjs [--count 250] [--out <file>]
 *
 * The package source is bundled on the fly with esbuild: the compiled output
 * uses extensionless specifiers (`moduleResolution: bundler`), which Node's
 * ESM resolver cannot follow, and bundling from source also removes the
 * "remember to build first" foot-gun.
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { makeGridConfigs } from './gridConfigs.mjs';

const bundlePath = join(tmpdir(), `libregrid-ai-advanced-${process.pid}.mjs`);
await build({
  entryPoints: [resolve('packages/ai-toolkit/src/advanced.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  external: ['ag-grid-community', '@libregrid/*'],
  logLevel: 'silent',
});
const { buildAiEnvironment, operatorsFor } = await import(`file://${bundlePath}`);
rmSync(bundlePath, { force: true });

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const count = Number(arg('count', '250'));
const out = resolve(arg('out', 'tools/ai-fixtures/environments.json'));

/** Shape a generated config the way `snapshotGrid` shapes a live grid. */
function toSnapshot(config) {
  const columns = config.columns.map((column) => ({
    colId: column.colId,
    headerName: column.headerName,
    dataType: column.dataType,
    sortable: column.sortable,
    hideable: column.hideable,
    filter: column.filterKind ? { kind: column.filterKind, operators: operatorsFor(column.filterKind) } : null,
  }));
  return {
    columns,
    currentFilterModel: {},
    hiddenColIds: [],
    revision: config.gridId,
  };
}

const fixtures = makeGridConfigs(count).map((config) => {
  const snapshot = toSnapshot(config);
  const environment = buildAiEnvironment(snapshot);
  return {
    gridId: config.gridId,
    context: environment.context,
    tools: environment.tools,
    // The reference map is what a corpus generator needs to write ground-truth
    // answers: it turns "filter the Salary column" into "column: c3".
    columnRefs: Object.fromEntries(environment.columnRefs),
    columns: snapshot.columns,
  };
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(fixtures, null, 2)}\n`);

const widths = fixtures.map((f) => Object.keys(f.columnRefs).length);
console.log(`Wrote ${fixtures.length} environments to ${out}`);
console.log(`  columns per grid: min ${Math.min(...widths)}, max ${Math.max(...widths)}`);
