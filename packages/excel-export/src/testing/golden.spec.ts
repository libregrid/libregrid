import { describe, expect, it } from 'vitest';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildXlsx } from '../ooxml/xlsxBuilder';
import { scenarios } from './scenarios';

/**
 * Regression corpus (phase 5.1): golden unzipped XML for representative
 * exports, diffed on every run. Run with UPDATE_GOLDEN=1 to rewrite the
 * fixtures after an intentional output change.
 */

const here = dirname(fileURLToPath(import.meta.url));
const expectedRoot = join(here, '__fixtures__', 'expected');
const update = process.env.UPDATE_GOLDEN === '1';

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path).map((p) => join(entry.name, p)));
    else out.push(entry.name);
  }
  return out;
}

describe('golden xlsx fixtures', () => {
  for (const [scenario, definition] of Object.entries(scenarios)) {
    it('matches the recorded XML for scenario ' + scenario, () => {
      const { parts } = buildXlsx(definition.worksheets, definition.options);
      const scenarioRoot = join(expectedRoot, scenario);
      for (const [path, xml] of Object.entries(parts)) {
        const file = join(scenarioRoot, path);
        if (update) {
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, xml);
          continue;
        }
        expect(readFileSync(file, 'utf8'), path).toBe(xml);
      }
      if (!update) {
        expect(listFiles(scenarioRoot).sort()).toEqual(Object.keys(parts).sort());
      }
    });
  }
});
