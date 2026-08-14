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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
