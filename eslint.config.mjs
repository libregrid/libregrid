import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nx from '@nx/eslint-plugin';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.nx/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nx.configs['flat/base'],
  {
    rules: {
      /**
       * Guardrail G1 — contamination ban.
       * The standalone scanner (tools/check-contamination) is the backstop;
       * this fails at edit time, in the editor, before a commit exists.
       */
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'ag-grid-enterprise',
              message:
                'G1 VIOLATION: ag-grid-enterprise is commercially licensed and must never be ' +
                'imported. LibreGrid is a clean-room implementation built against the MIT ' +
                'interfaces published by ag-grid-community. See docs/reference/guardrails.md.',
            },
            {
              name: 'ag-charts-enterprise',
              message: 'G1 VIOLATION: commercially licensed. Use ag-charts-community.',
            },
          ],
          patterns: [
            {
              group: ['ag-grid-enterprise/*', '@ag-grid-enterprise/*'],
              message: 'G1 VIOLATION: see docs/reference/guardrails.md.',
            },
            {
              group: ['ag-grid-community/dist/*', 'ag-grid-community/src/*'],
              message:
                'Deep imports are not exported subpaths and will break. Import from ' +
                "'ag-grid-community' — everything is re-exported from the root entry. " +
                'See docs/reference/api-seams.md §1.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      /**
       * Nx module boundary enforcement (standards.md §6 rule 3).
       * Packages tagged `type:framework-neutral` must not depend on `type:angular`.
       */
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'type:framework-neutral',
              onlyDependOnLibsWithTags: ['type:framework-neutral'],
            },
            {
              sourceTag: 'type:angular',
              onlyDependOnLibsWithTags: ['type:framework-neutral', 'type:angular'],
            },
          ],
        },
      ],
    },
  },
  {
    // Test files may reach into internals to set up fixtures.
    files: ['**/*.spec.ts', '**/testing/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    /**
     * Nx enforces the tagged LibreGrid-project graph.  This complementary
     * rule rejects direct Angular imports, which are external to that graph,
     * from every framework-neutral source tree.  Keep the Angular integration
     * packages (@libregrid/material, @libregrid/angular) out of this scope.
     */
    files: ['packages/**/*.ts', 'tools/**/*.ts', 'apps/bench/**/*.ts'],
    ignores: ['packages/material/**', 'packages/angular/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*'],
              message:
                'Framework-neutral code must not import Angular. Move this integration to ' +
                '@libregrid/material or another package tagged type:angular.',
            },
          ],
        },
      ],
    },
  },
  {
    // Node tooling scripts run outside the browser.
    files: ['tools/**/*.mjs', 'apps/bench/**/*.mjs', '*.mjs', '*.config.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        globalThis: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        ResizeObserver: 'readonly',
        TextEncoder: 'readonly',
      },
    },
  },
);
