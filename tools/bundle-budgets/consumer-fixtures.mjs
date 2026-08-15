#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const { build } = await import(pathToFileURL(require.resolve('esbuild', {
  paths: [join(root, 'node_modules', '@angular', 'build')],
})).href);
const outputDirectory = join(root, 'tools', 'bundle-budgets', '.fixtures');
// Every published package gets a consumer fixture (Phase 13): importing the
// package entry must pull in exactly that package, core, and its declared
// @libregrid dependencies — nothing else. excel-export is deferred (Phase 5).
const packages = [
  'core',
  'menu',
  'side-bar',
  'material',
  'row-grouping',
  'columns-tool-panel',
  'cell-selection',
  'clipboard',
  'status-bar',
  'set-filter',
  'multi-filter',
  'filters-tool-panel',
  'server-side-row-model',
  'pivot',
  'viewport-row-model',
  'tree-data',
  'master-detail',
  'advanced-filter',
  'find',
  'rich-select',
  'integrated-charts',
  'sparklines',
];
const packageName = (name) => `@libregrid/${name}`;

if (!packages.every((name) => existsSync(join(root, 'packages', name, 'dist', 'index.js')))) {
  throw new Error('Build packages before running consumer fixtures.');
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

for (const name of packages) {
  const result = await build({
    stdin: {
      contents: `export * from '${packageName(name)}';`,
      resolveDir: root,
      sourcefile: `${name}.ts`,
    },
    bundle: true,
    format: 'esm',
    minify: true,
    metafile: true,
    write: false,
    external: ['ag-grid-community', 'ag-charts-community', '@angular/*'],
    plugins: [
      {
        name: 'workspace-packages',
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^@libregrid\// }, (args) => ({
            path: join(root, 'packages', args.path.slice('@libregrid/'.length), 'dist', 'index.js'),
          }));
        },
      },
    ],
  });
  const imports = Object.keys(result.metafile.inputs)
    .filter((input) => input.includes('/packages/'))
    .map((input) => input.match(/\/packages\/([^/]+)\//)?.[1])
    .filter(Boolean);
  // Tree-shaking check — exclude declared dependencies (core is always allowed),
  // mirroring check.mjs's checkCrossContamination.
  const pkg = JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8'));
  const declaredDeps = Object.keys(pkg.dependencies ?? {})
    .filter((dependency) => dependency.startsWith('@libregrid/'))
    .map((dependency) => dependency.slice('@libregrid/'.length));
  const unexpected = [...new Set(imports)].filter(
    (dependency) =>
      dependency !== name && dependency !== 'core' && !declaredDeps.includes(dependency),
  );
  if (unexpected.length) {
    throw new Error(
      `${packageName(name)} consumer bundle includes unexpected packages: ${unexpected.join(', ')}`,
    );
  }
  const bytes = result.outputFiles[0]?.contents.byteLength ?? 0;
  console.log(`   PASS ${packageName(name)} consumer fixture: ${(bytes / 1024).toFixed(1)} KB`);
}
