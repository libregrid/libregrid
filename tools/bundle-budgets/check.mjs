#!/usr/bin/env node
/**
 * Bundle budget & tree-shaking verification (phase-00 Task 0.10a).
 *
 * For each package that has a dist/, checks:
 *   (a) Its size relative to the budget in bundle-budgets.json
 *   (b) That no other @libregrid/* package code appears in it (tree-shaking purity)
 *
 * Usage:  node tools/bundle-budgets/check.mjs
 * Exit:   0 = pass, 1 = budget exceeded or cross-contamination detected
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

  const maxBytes = parseSize(budget.maxSize);
  const distDir = join(PACKAGES_DIR, dir, 'dist');
  if (!existsSync(distDir)) {
    console.log(`   ${name}: no dist/ (not built yet)`);
    continue;
  }

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
