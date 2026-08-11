#!/usr/bin/env node
/**
 * Guardrail G1 — contamination guard.
 * See docs/reference/guardrails.md
 *
 * LibreGrid is a clean-room implementation built against the MIT-licensed
 * interfaces published by ag-grid-community. Reading, installing or vendoring
 * the commercially-licensed `ag-grid-enterprise` destroys that position.
 *
 * This script FAILS THE BUILD if any trace of it appears.
 *
 * Usage:  node tools/check-contamination/bin.mjs [rootDir]
 * Exit:   0 = clean, 1 = contamination found
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const FORBIDDEN = [
  'ag-grid-enterprise',
  'ag-charts-enterprise',
  '@ag-grid-enterprise',
];

/**
 * Markdown is exempt from the term scan.
 *
 * Documentation must be free to name the thing it forbids — guardrails.md,
 * the phase files and the migration guide all legitimately discuss
 * ag-grid-enterprise. Prose cannot `import` anything, so the risk a name-scan
 * actually mitigates (an install, or an import in code) does not exist there.
 *
 * Everything that can execute or declare a dependency IS scanned: source,
 * package manifests, lockfiles, configs.
 */
const PROSE_EXT = /\.(md|txt)$/;

/** Files that must be scanned even though they are prose-adjacent. */
const ALWAYS_SCAN = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

/** This scanner necessarily contains the forbidden strings. */
const SELF = new Set([
  'tools/check-contamination/bin.mjs',
  'tools/check-contamination/bin.spec.ts',
  '.gitignore',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.nx', '.remember', '__fixtures__']);
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|html|css|scss|yml|yaml|txt)$/;

export function scan(root) {
  const hits = [];

  // 1. Installed package check — the most direct form of contamination.
  for (const f of FORBIDDEN) {
    if (existsSync(join(root, 'node_modules', f))) {
      hits.push({ file: `node_modules/${f}`, line: 0, term: f, why: 'package is INSTALLED' });
    }
  }

  // 2. Source / manifest / lockfile scan.
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(full);
        continue;
      }
      const rel = relative(root, full).split(sep).join('/');
      if (SELF.has(rel)) continue;
      if (!TEXT_EXT.test(name)) continue;
      // Prose may name the ban; manifests and lockfiles are always scanned.
      if (PROSE_EXT.test(name) && !ALWAYS_SCAN.has(name)) continue;

      let text;
      try { text = readFileSync(full, 'utf8'); } catch { continue; }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const term of FORBIDDEN) {
          if (lines[i].includes(term)) {
            hits.push({ file: rel, line: i + 1, term, why: 'referenced in source' });
          }
        }
      }
    }
  };
  walk(root);
  return hits;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).pop());
if (isMain) {
  const root = process.argv[2] ?? process.cwd();
  const hits = scan(root);
  if (hits.length === 0) {
    console.log('✅ G1 contamination check passed — no ag-grid-enterprise references.');
    process.exit(0);
  }
  console.error('\n❌ G1 CONTAMINATION DETECTED — build blocked.\n');
  for (const h of hits) {
    console.error(`   ${h.file}:${h.line}  [${h.term}]  ${h.why}`);
  }
  console.error(`\n${hits.length} violation(s). See docs/reference/guardrails.md (G1).`);
  console.error('LibreGrid must never read, install or reference ag-grid-enterprise.\n');
  process.exit(1);
}
