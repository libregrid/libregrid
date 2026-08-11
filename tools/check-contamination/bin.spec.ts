import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error - .mjs module without type declarations
import { scan } from './bin.mjs';

/**
 * Guardrail G1 verification.
 *
 * The point of these tests is not that the scanner runs — it is that the
 * scanner has been OBSERVED TO FAIL on real contamination. A guard never
 * proven to fire is not a guard (phase-00 Task 0.5).
 */
describe('G1 contamination guard', () => {
  const mkRoot = () => mkdtempSync(join(tmpdir(), 'lgr-g1-'));

  it('FIRES on the deliberate violation fixture', () => {
    const root = mkRoot();
    try {
      const fixture = readFileSync(
        join(import.meta.dirname, '__fixtures__', 'violation.ts.txt'),
        'utf8',
      );
      mkdirSync(join(root, 'packages', 'evil'), { recursive: true });
      writeFileSync(join(root, 'packages', 'evil', 'index.ts'), fixture);

      const hits = scan(root);

      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].term).toBe('ag-grid-enterprise');
      expect(hits[0].file).toBe('packages/evil/index.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('FIRES when the package is installed in node_modules', () => {
    const root = mkRoot();
    try {
      mkdirSync(join(root, 'node_modules', 'ag-grid-enterprise'), { recursive: true });
      const hits = scan(root);
      expect(hits.some((h) => h.why === 'package is INSTALLED')).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('FIRES on a dependency declared in package.json', () => {
    const root = mkRoot();
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ dependencies: { 'ag-grid-enterprise': '^36.0.0' } }, null, 2),
      );
      const hits = scan(root);
      expect(hits.some((h) => h.file === 'package.json')).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('PASSES on clean source that uses ag-grid-community', () => {
    const root = mkRoot();
    try {
      mkdirSync(join(root, 'packages', 'good'), { recursive: true });
      writeFileSync(
        join(root, 'packages', 'good', 'index.ts'),
        `import { ModuleRegistry, BeanStub } from 'ag-grid-community';\nexport { ModuleRegistry, BeanStub };\n`,
      );
      expect(scan(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('PASSES on the real repository', () => {
    // Docs legitimately discuss the ban; they are allowlisted by path.
    const repoRoot = join(import.meta.dirname, '..', '..');
    expect(scan(repoRoot)).toEqual([]);
  });
});
