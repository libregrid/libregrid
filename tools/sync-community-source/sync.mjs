#!/usr/bin/env node
/**
 * Sparse-checkout helper for MIT upstream source (phase-00 Task 0.5 sub-task).
 *
 * Clones ONLY the MIT-licensed paths from ag-grid/ag-grid. Never fetches
 * the commercially-licensed ag-grid-enterprise.
 *
 * Usage:  node tools/sync-community-source/sync.mjs [targetDir]
 *         (defaults to ./community-source/)
 *
 * The checkout is read-only. Do not modify files inside it — this is a
 * reference copy for understanding Community's internals.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = 'https://github.com/ag-grid/ag-grid.git';

/** MIT-licensed paths in the ag-grid monorepo. Keep in sync with guardrails.md. */
const MIT_PATHS = [
  'packages/ag-grid-community/',
  'packages/ag-stack/',
  'packages/ag-grid-angular/',
  'packages/ag-charts-community/',
  'packages/ag-charts-types/',
  'community-modules/locale/',
  'community-modules/styles/',
];

const target = process.argv[2] || join(root, 'community-source');

if (existsSync(join(target, '.git'))) {
  console.log('Updating existing checkout...');
  execSync('git pull --ff-only', { cwd: target, stdio: 'inherit' });
} else {
  mkdirSync(target, { recursive: true });
  console.log('Initializing sparse checkout...');

  execSync(`git init`, { cwd: target, stdio: 'inherit' });
  execSync(`git remote add origin ${REPO}`, { cwd: target, stdio: 'inherit' });

  execSync('git config core.sparseCheckout true', { cwd: target, stdio: 'inherit' });

  // Write sparse-checkout patterns
  execSync(
    `sh -c 'for p in ${MIT_PATHS.join(' ')}; do echo "$p" >> .git/info/sparse-checkout; done'`,
    { cwd: target, stdio: 'inherit' },
  );

  execSync('git pull --depth 1 origin latest', { cwd: target, stdio: 'inherit' });
}

console.log(`\n✅ MIT source checked out at ${target}`);
console.log('   This is a read-only reference. Do not modify files inside it.');
console.log(`   Paths: ${MIT_PATHS.join(', ')}`);
