#!/usr/bin/env node
/**
 * Bundle budget & tree-shaking verification (phase-00 Task 0.10a).
 *
 * For each package that has a dist/, checks:
 *   (a) Its size relative to the budget in bundle-budgets.json
 *   (b) That no other @libregrid/* package code appears in it (tree-shaking purity)
 *   (c) Dist purity: no test artifacts (spec files, test bootstrap) or nested
 *       dist/src directories ship in a published package
 *
 * Usage:  node tools/bundle-budgets/check.mjs
 * Exit:   0 = pass, 1 = budget exceeded, cross-contamination, or impure dist
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const budgetsPath = join(root, 'bundle-budgets.json');
const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8')).packages;
const PACKAGES_DIR = join(root, 'packages');

/** Parse a size string like "16 KB" or "0.5 KB" to bytes. */
function parseSize(str) {
  const [, num, unit] = str.match(/^([\d.]+)\s*(KB|MB|B)$/) || [];
  const n = parseFloat(num);
  if (unit === 'MB') return n * 1024 * 1024;
  if (unit === 'KB') return n * 1024;
  return n;
}

/** Check if a file references @libregrid packages other than itself. */
function checkCrossContamination(name, pkg, content) {
  // Tree-shaking check — exclude declared dependencies (core is always allowed)
  const declaredDeps = Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith('@libregrid/'));
  const otherPkgs = Object.keys(budgets).filter((p) => p !== name && !declaredDeps.includes(p));
  const hits = [];
  for (const pkg2 of otherPkgs) {
    // Match import/require of the other package
    const regex = new RegExp(`['"]${pkg2}["'/]`, 'g');
    if (regex.test(content)) {
      hits.push(pkg2);
    }
  }
  return hits;
}

let failures = 0;

const dirs = readdirSync(PACKAGES_DIR);
for (const dir of dirs) {
  const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const name = pkg.name;
  const budget = budgets[name];
  if (!budget) {
    console.log(`⚠️  ${name}: no budget in bundle-budgets.json`);
    continue;
  }

  // G3 attribution (Phase 13): every published package carries a LICENSE, a
  // NOTICE, and a README with the independence disclaimer (guardrail G4).
  const licensePath = join(PACKAGES_DIR, dir, 'LICENSE');
  const noticePath = join(PACKAGES_DIR, dir, 'NOTICE');
  const readmePath = join(PACKAGES_DIR, dir, 'README.md');
  if (!existsSync(licensePath)) {
    console.error(`   FAIL ${name}: missing LICENSE (G3 attribution)`);
    failures++;
  } else if (!(pkg.files ?? []).includes('LICENSE')) {
    console.error(`   FAIL ${name}: LICENSE exists but is not in package.json "files" (G3 attribution)`);
    failures++;
  }
  if (!existsSync(noticePath)) {
    console.error(`   FAIL ${name}: missing NOTICE (G3 attribution)`);
    failures++;
  }
  if (!existsSync(readmePath)) {
    console.error(`   FAIL ${name}: missing README (G3 attribution)`);
    failures++;
  } else if (!/not affiliated with(, endorsed by, or sponsored by)? AG Grid Ltd/i.test(readFileSync(readmePath, 'utf8').replace(/\s+/g, ' '))) {
    console.error(`   FAIL ${name}: README is missing the independence disclaimer (G4)`);
    failures++;
  }

  // Dependency allowlist (standards.md §2): the only permitted runtime
  // dependencies outside @libregrid/* are fflate and ag-charts-community;
  // the only permitted peers are ag-grid-community, @angular/*, and
  // ag-charts-community.
  const badDeps = Object.keys(pkg.dependencies ?? {}).filter(
    (dependency) =>
      !dependency.startsWith('@libregrid/') &&
      dependency !== 'fflate' &&
      dependency !== 'ag-charts-community',
  );
  if (badDeps.length > 0) {
    console.error(`   FAIL ${name}: non-allowlisted runtime dependencies: ${badDeps.join(', ')}`);
    failures++;
  }
  const badPeers = Object.keys(pkg.peerDependencies ?? {}).filter(
    (dependency) =>
      dependency !== 'ag-grid-community' &&
      !dependency.startsWith('@angular/') &&
      dependency !== 'ag-charts-community',
  );
  if (badPeers.length > 0) {
    console.error(`   FAIL ${name}: non-allowlisted peer dependencies: ${badPeers.join(', ')}`);
    failures++;
  }

  const maxBytes = parseSize(budget.maxSize);
  const distDir = join(PACKAGES_DIR, dir, 'dist');
  if (!existsSync(distDir)) {
    console.log(`   ${name}: no dist/ (not built yet)`);
    continue;
  }

  // Dist purity (Phase 13): test artifacts must never ship in a published
  // package. tsc's exclude does not remove stale outputs, so a one-off build
  // without a clean dist would silently re-introduce them.
  const impurity = (file) =>
    /\.spec\.(js|mjs|d\.ts)$/.test(file) ||
    /(^|\/)test-bootstrap\./.test(file) ||
    file.includes('/dist/src/');
  const walkDirs = (d) =>
    readdirSync(d).forEach((f) => {
      const full = join(d, f);
      if (statSync(full).isDirectory()) return walkDirs(full);
      const rel = relative(PACKAGES_DIR, full);
      if (impurity(rel)) {
        console.error(`   ❌  ${name} ships test artifact or nested output: ${rel}`);
        failures++;
      }
    });
  walkDirs(distDir);

  // Walk dist/ and sum JS file sizes
  let totalBytes = 0;
  const walk = (d) =>
    readdirSync(d).forEach((f) => {
      const full = join(d, f);
      if (statSync(full).isDirectory()) return walk(full);
      if (!full.endsWith('.js') && !full.endsWith('.mjs')) return;
      const content = readFileSync(full, 'utf8');
      totalBytes += new TextEncoder().encode(content).length;

      // Tree-shaking check
      const hits = checkCrossContamination(name, pkg, content);
      if (hits.length > 0) {
        console.error(`   ❌  ${name} -> ${relative(PACKAGES_DIR, full)} contains: ${hits.join(', ')}`);
        failures++;
      }
    });
  walk(distDir);

  const totalKB = totalBytes / 1024;
  if (totalBytes > maxBytes) {
    console.error(`   ❌  ${name}: ${totalKB.toFixed(1)} KB exceeds budget ${budget.maxSize}`);
    failures++;
  } else {
    console.log(`   ✅  ${name}: ${totalKB.toFixed(1)} KB (budget: ${budget.maxSize})`);
  }
}

if (failures > 0) {
  console.error(`\n❌ Bundle budget check: ${failures} failure(s).`);
  process.exit(1);
}
console.log('\n✅ Bundle budgets and tree-shaking purity: all pass.');
