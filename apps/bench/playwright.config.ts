import { defineConfig } from '@playwright/test';

const port = Number(process.env['BENCH_PORT'] ?? '4202');
const baseURL = process.env['BENCH_BASE_URL'] ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './src/e2e',
  // A complete 3-size × 5-scenario × 9-sample matrix legitimately exceeds
  // the ordinary E2E timeout on a development machine.
  timeout: 15 * 60_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: `NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx serve docs --port=${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
