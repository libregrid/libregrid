#!/usr/bin/env node
/**
 * Fails the build if any generated version.ts has drifted from the installed
 * ag-grid-community version. See standards.md §5 and package-architecture.md §7.
 *
 * Also checks the @libregrid/core singleton requirement: no two workspace
 * packages may depend on different @libregrid/core versions.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agGridVersion, VERSIONED_PACKAGES } from './generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const problems = [];

// 1. Generated version.ts matches the installed ag-grid-community.
const expected = agGridVersion(root);
for (const pkg of VERSIONED_PACKAGES) {
  const file = join(root, 'packages', pkg, 'src', 'version.ts');
  if (!existsSync(file)) {
    problems.push(`packages/${pkg}/src/version.ts is missing — run \`npm run gen:version\``);
    continue;
  }
  const found = /VERSION = '([^']+)'/.exec(readFileSync(file, 'utf8'))?.[1];
  if (found !== expected) {
    problems.push(
      `packages/${pkg}/src/version.ts has '${found}' but ag-grid-community is '${expected}'`,
    );
  }
}

// 2. @libregrid/core singleton — one resolved version across the workspace.
const coreRanges = new Map();
const pkgJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const pattern of pkgJson.workspaces ?? []) {
  const base = pattern.replace('/*', '');
  const dir = join(root, base);
  if (!existsSync(dir)) continue;
  const { readdirSync } = await import('node:fs');
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'package.json');
    if (!existsSync(p)) continue;
    const m = JSON.parse(readFileSync(p, 'utf8'));
    const range = m.dependencies?.['@libregrid/core'];
    if (range) coreRanges.set(m.name, range);
  }
}
const distinct = new Set(coreRanges.values());
if (distinct.size > 1) {
  problems.push(
    `Multiple @libregrid/core ranges across the workspace — a duplicate core breaks the ` +
      `module registry (package-architecture.md §7): ` +
      [...coreRanges].map(([k, v]) => `${k}→${v}`).join(', '),
  );
}

if (problems.length) {
  console.error('\n❌ Version check failed:\n');
  for (const p of problems) console.error('   ' + p);
  console.error('');
  process.exit(1);
}
console.log(`✅ Version check passed — ag-grid-community ${expected}, core singleton OK.`);
