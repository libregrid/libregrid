#!/usr/bin/env node
/**
 * Aggregates the `## <version>` section from every fixed package's CHANGELOG
 * into one release-notes file, so each publish leaves a GitHub Release with
 * real notes (docs/design/release-versioning-plan.md).
 *
 *   node tools/version/release-notes.mjs > .release-notes.md
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { libregridVersion } from './workspace.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const config = JSON.parse(readFileSync(join(root, '.changeset', 'config.json'), 'utf8'));
const fixedPackages = config.fixed.flat();

const version = libregridVersion(root);

/** Extracts the `## <version>` body from a CHANGELOG, or null if absent. */
function sectionFor(changelog, target) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${target}`);
  if (start === -1) return null;
  const end = lines.findIndex((line, i) => i > start && /^## /.test(line));
  const body = lines.slice(start + 1, end === -1 ? lines.length : end).join('\n').trim();
  return body || null;
}

// A section that is only "Updated dependencies" adds no signal to the notes.
function isDependencyOnly(body) {
  return body
    .split('\n')
    .every((line) => {
      const trimmed = line.trim();
      return (
        !trimmed ||
        trimmed.startsWith('### Patch Changes') ||
        trimmed.startsWith('### Minor Changes') ||
        trimmed.startsWith('### Major Changes') ||
        trimmed.startsWith('- Updated dependencies') ||
        trimmed.startsWith('- @libregrid/')
      );
    });
}

const parts = [];
for (const name of fixedPackages) {
  const dir = name.replace('@libregrid/', '');
  const body = sectionFor(readFileSync(join(root, 'packages', dir, 'CHANGELOG.md'), 'utf8'), version);
  if (!body) continue;
  const cleaned = body
    .split('\n')
    .filter((line) => !/^- @libregrid\/\S+@\d/.test(line.trim()))
    .join('\n')
    .trim();
  if (cleaned && !isDependencyOnly(cleaned)) parts.push(cleaned);
}

const notes = parts.length
  ? parts.join('\n\n---\n\n')
  : 'Maintenance release. See the per-package CHANGELOG files for details.';

console.log(`## LibreGrid ${version}\n\n${notes}\n`);
