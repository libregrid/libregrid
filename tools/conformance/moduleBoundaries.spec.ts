import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('framework-neutral module boundaries', () => {
  it('rejects a direct Angular import from a framework-neutral package', async () => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintText(
      "import { inject } from '@angular/core';\nexport const value = inject;\n",
      { filePath: 'packages/core/src/__fixtures__/angular-import.fixture.ts' },
    );

    expect(result.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'no-restricted-imports',
          severity: 2,
        }),
      ]),
    );
  });
});
