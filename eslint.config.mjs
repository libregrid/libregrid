import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.nx/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
    },
  },
  {
    // Test files may reach into internals to set up fixtures.
    files: ['**/*.spec.ts', '**/testing/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Node tooling scripts run outside the browser.
    files: ['tools/**/*.mjs', '*.mjs', '*.config.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
