import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@libregrid/core/testing': fileURLToPath(
        new URL('./packages/core/src/testing/index.ts', import.meta.url),
      ),
      '@libregrid/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@libregrid/menu': fileURLToPath(new URL('./packages/menu/src/index.ts', import.meta.url)),
      '@libregrid/side-bar': fileURLToPath(
        new URL('./packages/side-bar/src/index.ts', import.meta.url),
      ),
      '@libregrid/material': fileURLToPath(
        new URL('./packages/material/src/index.ts', import.meta.url),
      ),
      '@libregrid/row-grouping': fileURLToPath(
        new URL('./packages/row-grouping/src/index.ts', import.meta.url),
      ),
      '@libregrid/pivot': fileURLToPath(new URL('./packages/pivot/src/index.ts', import.meta.url)),
      '@libregrid/viewport-row-model': fileURLToPath(
        new URL('./packages/viewport-row-model/src/index.ts', import.meta.url),
      ),
      '@libregrid/tree-data': fileURLToPath(new URL('./packages/tree-data/src/index.ts', import.meta.url)),
      '@libregrid/master-detail': fileURLToPath(new URL('./packages/master-detail/src/index.ts', import.meta.url)),
      '@libregrid/set-filter': fileURLToPath(
        new URL('./packages/set-filter/src/index.ts', import.meta.url),
      ),
      '@libregrid/multi-filter': fileURLToPath(
        new URL('./packages/multi-filter/src/index.ts', import.meta.url),
      ),
      '@libregrid/filters-tool-panel': fileURLToPath(
        new URL('./packages/filters-tool-panel/src/index.ts', import.meta.url),
      ),
      '@libregrid/cell-selection': fileURLToPath(
        new URL('./packages/cell-selection/src/index.ts', import.meta.url),
      ),
      '@libregrid/clipboard': fileURLToPath(
        new URL('./packages/clipboard/src/index.ts', import.meta.url),
      ),
      '@libregrid/status-bar': fileURLToPath(
        new URL('./packages/status-bar/src/index.ts', import.meta.url),
      ),
      '@libregrid/advanced-filter': fileURLToPath(new URL('./packages/advanced-filter/src/index.ts', import.meta.url)),
      '@libregrid/find': fileURLToPath(new URL('./packages/find/src/index.ts', import.meta.url)),
      '@libregrid/rich-select': fileURLToPath(new URL('./packages/rich-select/src/index.ts', import.meta.url)),
      '@libregrid/integrated-charts': fileURLToPath(new URL('./packages/integrated-charts/src/index.ts', import.meta.url)),
      '@libregrid/sparklines': fileURLToPath(new URL('./packages/sparklines/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.spec.ts', 'tools/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/apps/**'],
    setupFiles: ['packages/material/src/test-bootstrap.ts'],
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
