import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@libregrid/core/testing': fileURLToPath(new URL('./packages/core/src/testing/index.ts', import.meta.url)),
      '@libregrid/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@libregrid/menu': fileURLToPath(new URL('./packages/menu/src/index.ts', import.meta.url)),
      '@libregrid/side-bar': fileURLToPath(new URL('./packages/side-bar/src/index.ts', import.meta.url)),
      '@libregrid/material': fileURLToPath(new URL('./packages/material/src/index.ts', import.meta.url)),
      '@libregrid/row-grouping': fileURLToPath(new URL('./packages/row-grouping/src/index.ts', import.meta.url)),
    },
  },
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
