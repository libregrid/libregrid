#!/usr/bin/env node
/**
 * Fails the build if any generated version.ts has drifted from the installed
 * ag-grid-community version. See standards.md §5 and package-architecture.md §7.
 *
 * Also checks the @libregrid/core singleton requirement: no two workspace
 * packages may depend on different @libregrid/core versions.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agGridVersion, VERSIONED_PACKAGES } from './generate.mjs';
import { libregridVersion, SYNCED_MANIFESTS, DOCS_VERSION_FILE } from './workspace.mjs';

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
const lockstepVersions = new Map();
const pkgJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const pattern of pkgJson.workspaces ?? []) {
  const base = pattern.replace('/*', '');
  const dir = join(root, base);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'package.json');
    if (!existsSync(p)) continue;
    const m = JSON.parse(readFileSync(p, 'utf8'));
    const range = m.dependencies?.['@libregrid/core'];
    if (range) coreRanges.set(m.name, range);
    if (base === 'packages' && m.name?.startsWith('@libregrid/')) lockstepVersions.set(m.name, m.version);
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

const distinctVersions = new Set(lockstepVersions.values());
if (distinctVersions.size > 1) {
  problems.push(
    `Multiple @libregrid package versions across the workspace — releases are lockstep: ` +
      [...lockstepVersions].map(([k, v]) => `${k}@${v}`).join(', '),
  );
}

// 3. Private manifests mirror the lockstep version (plan: one project version).
//    Each also needs a CHANGELOG.md — changesets/action reads one for every
//    package whose version changed when it builds the Version Packages PR body.
const projectVersion = libregridVersion(root);
for (const rel of SYNCED_MANIFESTS) {
  const manifest = JSON.parse(readFileSync(join(root, rel), 'utf8'));
  if (manifest.version !== projectVersion) {
    problems.push(
      `${rel} has version '${manifest.version}' but the lockstep version is '${projectVersion}' — run \`node tools/version/workspace.mjs sync\``,
    );
  }
  const changelog = join(dirname(join(root, rel)), 'CHANGELOG.md');
  if (!existsSync(changelog)) {
    problems.push(
      `${rel} has no CHANGELOG.md — the release workflow will fail reading it. Run \`node tools/version/workspace.mjs sync\``,
    );
  }
}

// 4. Docs version badge is generated, never stale.
const docsFile = join(root, DOCS_VERSION_FILE);
if (!existsSync(docsFile)) {
  problems.push(`${DOCS_VERSION_FILE} is missing — run \`node tools/version/workspace.mjs generate\``);
} else {
  const found = /LIBREGRID_VERSION = '([^']+)'/.exec(readFileSync(docsFile, 'utf8'))?.[1];
  if (found !== projectVersion) {
    problems.push(
      `${DOCS_VERSION_FILE} has '${found}' but the lockstep version is '${projectVersion}' — run \`node tools/version/workspace.mjs generate\``,
    );
  }
}

const changesetConfig = JSON.parse(readFileSync(join(root, '.changeset', 'config.json'), 'utf8'));
const fixedPackages = new Set(changesetConfig.fixed.flat());
const missingFromFixed = [...lockstepVersions].map(([name]) => name).filter((name) => !fixedPackages.has(name));
if (missingFromFixed.length > 0) {
  problems.push(
    `Lockstep packages missing from .changeset/config.json fixed group: ${missingFromFixed.join(', ')}`,
  );
}

if (problems.length) {
  console.error('\n❌ Version check failed:\n');
  for (const p of problems) console.error('   ' + p);
  console.error('');
  process.exit(1);
}
console.log(`✅ Version check passed — ag-grid-community ${expected}, core singleton OK.`);
