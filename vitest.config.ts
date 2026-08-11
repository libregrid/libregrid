import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.spec.ts', 'tools/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/apps/**'],
    // Integration tests boot a real grid and declare `@vitest-environment jsdom`
    // in a docblock at the top of the file (vitest 4 removed
    // `environmentMatchGlobs`).
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/testing/**', '**/version.ts', '**/index.ts'],
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 },
    },
  },
});
