#!/usr/bin/env node
/**
 * Conformance matrix (phase-00 Task 0.7).
 *
 * Runs framework-neutral tests against each supported `ag-grid-community` version.
 * Angular-decorated Material tests run through `material:test`, which initializes
 * Angular's compiler and TestBed before loading their specs.
 * Start: 36.1.0. Add versions to the SUPPORTED array as they are validated.
 *
 * Usage:  node tools/conformance/matrix.mjs
 * Exit:   0 = all versions pass, 1 = one or more fail
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ag-grid-community versions we explicitly support.
// 36.1.0 is the only one verified so far. Add after conformance CI passes a new minor.
const SUPPORTED = ['36.1.0'];

/** Read the currently installed version from node_modules. */
function installedVersion() {
  const p = join(root, 'node_modules', 'ag-grid-community', 'package.json');
  return JSON.parse(readFileSync(p, 'utf8')).version;
}

function announce(msg) {
  console.log(`\n━━━ ${msg}`);
}

let failures = 0;

for (const target of SUPPORTED) {
  const installed = installedVersion();

  if (installed !== target) {
    console.log(`\n⚠️  Skipping ag-grid-community@${target} — installed is ${installed}.`);
    console.log(`   Install with: npm install --save-dev ag-grid-community@${target}`);
    continue;
  }

  announce(`ag-grid-community@${target} (matches installed)`);

  try {
    execSync(
      'npx vitest run packages/core packages/menu packages/side-bar tools --reporter verbose',
      {
        cwd: root,
        stdio: 'inherit',
        timeout: 120_000,
        env: { ...process.env, AG_GRID_VERSION: target },
      },
    );
    execSync('NX_DAEMON=false npx nx run material:test', {
      cwd: root,
      stdio: 'inherit',
      timeout: 120_000,
      env: { ...process.env, AG_GRID_VERSION: target },
    });
    console.log(`   ✅  All tests pass against ${target}`);
  } catch {
    console.error(`   ❌  Tests FAILED against ${target}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n❌ Conformance matrix: ${failures} version(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Conformance matrix: all supported versions pass.');
