import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['DOCS_E2E_PORT'] ?? '4201');
const baseURL = process.env['BASE_URL'] ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './src/e2e',
  timeout: 30_000,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Cross-browser matrix (Phase 13): Chromium, Firefox, and WebKit run in
  // CI. Edge is Chromium-based and is covered by the chromium engine; note
  // it in the cross-browser report rather than duplicating the profile.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx serve docs --port=${port}`,
    url: baseURL,
    // Local validation may already have a docs server running; CI still
    // starts an isolated server for deterministic results.
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
